import Foundation
import Observation
import MiamiElioKit

/// The concierge conversation: what was said, what is being sent, and the
/// handle the server uses to remember the thread.
@MainActor
@Observable
final class ConciergeStore {
    struct Entry: Identifiable, Equatable {
        enum Kind: Equatable {
            case guest
            case concierge
            /// The request never got an answer; offers a retry.
            case failed
        }

        let id = UUID()
        let kind: Kind
        let text: String
        var suggestions: [ConciergeLink] = []
        var cards: [ConciergeCard] = []
    }

    /// The guest's working copy of the latest plan: which option each section
    /// shows, which sections were taken out, and the receipt once it is sent.
    struct PlanDraft: Equatable {
        let plan: ConciergePlan
        var shown: [String: Int] = [:]
        var removed: Set<String> = []
        var receipt: PlanReceipt?

        func item(in section: PlanSection) -> PlanItem {
            let index = shown[section.href] ?? 0
            return section.candidates[min(max(index, 0), section.candidates.count - 1)]
        }

        var items: [PlanItem] {
            plan.sections.filter { !removed.contains($0.href) }.map { item(in: $0) }
        }

        var hasRestaurant: Bool {
            items.contains(where: { $0.isRestaurant })
        }
    }

    private(set) var entries: [Entry] = []
    private(set) var isSending = false
    private(set) var plan: PlanDraft?
    private(set) var isSendingPlan = false
    var draft = ""

    private let client: ConciergeClient
    private let planClient: PlanClient
    /// The key of the last plan send, reused while its details stay the same.
    @ObservationIgnored private var planAttempt: (request: PlanRequest, key: UUID)?
    private let locale: @MainActor () -> String

    @ObservationIgnored private var sessionId: String?
    @ObservationIgnored private var task: Task<Void, Never>?

    init(client: ConciergeClient, planClient: PlanClient = PlanClient(), locale: @escaping @MainActor () -> String) {
        self.client = client
        self.planClient = planClient
        self.locale = locale
    }

    var canSend: Bool {
        !isSending && !draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    /// Sends the draft, or a ready-made prompt when one is given.
    func send(_ prompt: String? = nil) {
        let text = (prompt ?? draft).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isSending else { return }
        if prompt == nil {
            draft = ""
        }
        entries.removeAll { $0.kind == .failed }
        entries.append(Entry(kind: .guest, text: text))
        request()
    }

    /// Asks again after a failure; the guest's message is still in the thread.
    func retry() {
        guard !isSending, entries.last?.kind == .failed else { return }
        entries.removeLast()
        request()
    }

    func reset() {
        task?.cancel()
        task = nil
        entries = []
        sessionId = nil
        isSending = false
        plan = nil
        planAttempt = nil
    }

    // MARK: - Plan

    func showAnotherOption(_ section: PlanSection) {
        guard var current = plan, current.receipt == nil, section.candidates.count > 1 else { return }
        current.shown[section.href] = ((current.shown[section.href] ?? 0) + 1) % section.candidates.count
        plan = current
    }

    func removeFromPlan(_ section: PlanSection) {
        guard var current = plan, current.receipt == nil else { return }
        current.removed.insert(section.href)
        plan = current
    }

    func restoreToPlan(_ section: PlanSection) {
        guard var current = plan, current.receipt == nil else { return }
        current.removed.remove(section.href)
        plan = current
    }

    func clearPlan() {
        plan = nil
        planAttempt = nil
    }

    /// Sends every item left in the plan as one request. Returns nil when it
    /// went through, otherwise the line to show the guest.
    func sendPlan(_ request: PlanRequest) async -> String? {
        guard !isSendingPlan, let sent = plan, sent.receipt == nil else { return nil }
        guard request.isComplete else {
            return request.end < request.start ? L10n.planBadDates : L10n.planCheck
        }
        let key: UUID
        if let previous = planAttempt, previous.request == request {
            key = previous.key
        } else {
            key = UUID()
        }
        planAttempt = (request, key)
        isSendingPlan = true
        defer { isSendingPlan = false }
        do {
            let receipt = try await planClient.send(request, key: key)
            planAttempt = nil
            // A new plan that arrived meanwhile is left untouched.
            if plan?.plan == sent.plan {
                plan?.receipt = receipt
            }
            return nil
        } catch APIError.status(400) {
            planAttempt = nil
            return L10n.planCheck
        } catch {
            return L10n.planFailed
        }
    }

    private func request() {
        let history = entries.compactMap { entry -> ChatMessage? in
            switch entry.kind {
            case .guest: return ChatMessage(role: .user, content: entry.text)
            case .concierge: return ChatMessage(role: .assistant, content: entry.text)
            case .failed: return nil
            }
        }
        guard !history.isEmpty else { return }

        isSending = true
        let client = self.client
        let session = sessionId
        let language = locale()

        task = Task { [weak self] in
            let outcome: Result<ConciergeReply, Error>
            do {
                outcome = .success(try await client.send(messages: history, sessionId: session, locale: language))
            } catch {
                outcome = .failure(error)
            }
            // A conversation that was cleared mid-request stays cleared.
            guard let self, !Task.isCancelled else { return }
            self.finish(outcome)
        }
    }

    private func finish(_ outcome: Result<ConciergeReply, Error>) {
        isSending = false
        task = nil
        switch outcome {
        case .success(let reply):
            if let handle = reply.sessionId {
                sessionId = handle
            }
            entries.append(Entry(kind: .concierge, text: reply.reply, suggestions: reply.suggestions, cards: reply.cards))
            // A reply without a plan keeps the current one and the guest's edits.
            if let next = reply.plan {
                plan = PlanDraft(plan: next)
                planAttempt = nil
            }
        case .failure:
            entries.append(Entry(kind: .failed, text: L10n.errorGeneric))
        }
    }
}
