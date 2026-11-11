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

    private(set) var entries: [Entry] = []
    private(set) var isSending = false
    var draft = ""

    private let client: ConciergeClient
    private let locale: @MainActor () -> String

    @ObservationIgnored private var sessionId: String?
    @ObservationIgnored private var task: Task<Void, Never>?

    init(client: ConciergeClient, locale: @escaping @MainActor () -> String) {
        self.client = client
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
        case .failure:
            entries.append(Entry(kind: .failed, text: L10n.errorGeneric))
        }
    }
}
