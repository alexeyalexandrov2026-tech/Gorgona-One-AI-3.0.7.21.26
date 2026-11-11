import SwiftUI
import MiamiElioKit

/// "Your plan" under the conversation: one card per section the guest asked
/// for, each a real catalogue item. Another option, remove, and one request
/// for everything left - the same plan the website shows (PlanBoard.jsx).
struct PlanBoardView: View {
    @Environment(ConciergeStore.self) private var store
    let draft: ConciergeStore.PlanDraft
    let open: (String) -> Void
    @State private var requesting = false

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            if let receipt = draft.receipt {
                Text(L10n.planSent)
                    .font(AppFont.cardTitle)
                    .foregroundStyle(Theme.ink)
                    .accessibilityAddTraits(.isHeader)
                Text(L10n.planSentText(receipt.bookingIds.count))
                    .font(AppFont.detail)
                    .foregroundStyle(Theme.soft)
                    .fixedSize(horizontal: false, vertical: true)
                Button(L10n.planNew) {
                    store.clearPlan()
                }
                .font(AppFont.detailMedium)
                .foregroundStyle(Theme.accent)
            } else {
                Text(L10n.planTitle)
                    .eyebrow(Theme.gold)
                    .accessibilityAddTraits(.isHeader)
                Text(L10n.planLede)
                    .font(AppFont.detail)
                    .foregroundStyle(Theme.soft)
                    .fixedSize(horizontal: false, vertical: true)

                ForEach(draft.plan.sections) { section in
                    if !draft.removed.contains(section.href) {
                        PlanItemRow(section: section, item: draft.item(in: section), open: open)
                    }
                }

                let removed = draft.plan.sections.filter { draft.removed.contains($0.href) }
                if !removed.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(removed) { section in
                                Button {
                                    store.restoreToPlan(section)
                                } label: {
                                    Text(L10n.planAddBack(section.label))
                                        .font(AppFont.detailMedium)
                                        .foregroundStyle(Theme.ink)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .overlay(Capsule().stroke(Theme.rule, lineWidth: 1))
                                        .contentShape(Capsule())
                                }
                                .buttonStyle(PressableStyle())
                            }
                        }
                        .padding(.vertical, 1)
                    }
                }

                if draft.items.isEmpty {
                    Text(L10n.planEmpty)
                        .font(AppFont.detail)
                        .foregroundStyle(Theme.soft)
                } else if draft.plan.requestable {
                    Button {
                        requesting = true
                    } label: {
                        Text(L10n.planSend)
                            .font(AppFont.button)
                            .foregroundStyle(Color.black)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Theme.gold, in: Capsule())
                            .contentShape(Capsule())
                    }
                    .buttonStyle(PressableStyle())
                    .accessibilityIdentifier("plan.send")
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(Theme.gold.opacity(0.35), lineWidth: 1)
        )
        .accessibilityIdentifier("plan.board")
        .sheet(isPresented: $requesting) {
            PlanRequestSheet(draft: draft)
                .environment(store)
        }
    }
}

/// One item of the plan with its section, photo and the two ways to change it.
private struct PlanItemRow: View {
    @Environment(ConciergeStore.self) private var store
    let section: PlanSection
    let item: PlanItem
    let open: (String) -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            PlanPhoto(address: item.image)

            VStack(alignment: .leading, spacing: 4) {
                Text(section.label)
                    .eyebrow(Theme.soft)
                Button {
                    open(item.href)
                } label: {
                    Text(item.title)
                        .font(AppFont.rowTitle)
                        .foregroundStyle(Theme.ink)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .buttonStyle(.plain)
                if let subtitle = item.subtitle {
                    Text(subtitle)
                        .font(AppFont.detail)
                        .foregroundStyle(Theme.soft)
                        .fixedSize(horizontal: false, vertical: true)
                }
                HStack(spacing: 18) {
                    if section.candidates.count > 1 {
                        Button(L10n.planAnother) {
                            store.showAnotherOption(section)
                        }
                        .foregroundStyle(Theme.accent)
                        .accessibilityLabel(L10n.planAnother + ": " + section.label)
                    }
                    Button(L10n.planRemove) {
                        store.removeFromPlan(section)
                    }
                    .foregroundStyle(Theme.soft)
                    .accessibilityLabel(L10n.planRemove + ": " + section.label)
                }
                .font(AppFont.detailMedium)
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .background(Theme.paper, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Theme.rule, lineWidth: 1)
        )
    }
}

private struct PlanPhoto: View {
    let address: String?

    var body: some View {
        AsyncImage(url: address.flatMap { URL(string: $0) }) { phase in
            if let image = phase.image {
                image.resizable().scaledToFill()
            } else {
                Theme.rule.opacity(0.5)
            }
        }
        .frame(width: 64, height: 64)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .accessibilityHidden(true)
    }
}

/// Dates, party and contact details for the one request.
private struct PlanRequestSheet: View {
    @Environment(ConciergeStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let draft: ConciergeStore.PlanDraft

    @State private var first: Date
    @State private var last: Date
    @State private var guests: Int
    @State private var dinner: Date
    @State private var name = ""
    @State private var phone = ""
    @State private var email = ""
    @State private var note = ""
    @State private var problem: String?

    init(draft: ConciergeStore.PlanDraft) {
        self.draft = draft
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        _first = State(initialValue: calendar.date(byAdding: .day, value: 3, to: today) ?? today)
        _last = State(initialValue: calendar.date(byAdding: .day, value: 5, to: today) ?? today)
        _guests = State(initialValue: draft.plan.guests ?? 2)
        _dinner = State(initialValue: calendar.date(bySettingHour: 20, minute: 0, second: 0, of: today) ?? today)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    DatePicker(L10n.planFirstDay, selection: $first, in: Calendar.current.startOfDay(for: Date())..., displayedComponents: .date)
                    DatePicker(L10n.planLastDay, selection: $last, in: first..., displayedComponents: .date)
                    Stepper(value: $guests, in: 1...99) {
                        HStack {
                            Text(L10n.planGuests)
                            Spacer()
                            Text(String(guests))
                                .foregroundStyle(Theme.soft)
                        }
                    }
                    if draft.hasRestaurant {
                        DatePicker(L10n.planDinnerTime, selection: $dinner, displayedComponents: .hourAndMinute)
                    }
                }

                Section {
                    TextField(L10n.planName, text: $name)
                        .textContentType(.name)
                    TextField(L10n.planPhone, text: $phone)
                        .textContentType(.telephoneNumber)
                        .keyboardType(.phonePad)
                    TextField(L10n.planEmail, text: $email)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    TextField(L10n.planNote, text: $note, axis: .vertical)
                        .lineLimit(2...5)
                }

                if let problem {
                    Section {
                        Text(problem)
                            .foregroundStyle(Theme.accent)
                    }
                }

                Section {
                    Button {
                        submit()
                    } label: {
                        Text(store.isSendingPlan ? L10n.planSending : L10n.planSubmit)
                            .font(AppFont.button)
                            .frame(maxWidth: .infinity)
                    }
                    .disabled(store.isSendingPlan)
                    .accessibilityIdentifier("plan.submit")
                } footer: {
                    Text(L10n.planCharge)
                }
            }
            .scrollContentBackground(.hidden)
            .background(Theme.paper)
            .navigationTitle(L10n.planTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(L10n.actionCancel) {
                        dismiss()
                    }
                    .disabled(store.isSendingPlan)
                }
            }
        }
        .interactiveDismissDisabled(store.isSendingPlan)
    }

    private func submit() {
        let request = PlanRequest(
            name: name,
            email: email,
            phone: phone,
            start: PlanRequest.day(first),
            end: PlanRequest.day(last),
            guests: guests,
            time: draft.hasRestaurant ? PlanRequest.clock(dinner) : nil,
            note: note,
            items: draft.items.map { PlanRequest.Item(kind: $0.kind, slug: $0.slug) }
        )
        problem = nil
        Task { @MainActor in
            let outcome = await store.sendPlan(request)
            problem = outcome
            if outcome == nil, store.plan?.receipt != nil {
                dismiss()
            }
        }
    }
}
