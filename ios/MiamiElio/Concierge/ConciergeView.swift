import SwiftUI
import MiamiElioKit

/// The AI concierge as a native conversation. It speaks to the same
/// `/api/chat` the website uses; anything it points to opens in Home.
struct ConciergeView: View {
    @Environment(AppRouter.self) private var router
    @Environment(ConciergeStore.self) private var store
    @FocusState private var composing: Bool

    private static let bottom = "concierge.bottom"

    var body: some View {
        @Bindable var store = store

        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 16) {
                        if store.entries.isEmpty {
                            ConciergeWelcome { store.send($0) }
                        }
                        ForEach(store.entries) { entry in
                            ConciergeEntryView(
                                entry: entry,
                                open: { router.open(reference: $0) },
                                retry: { store.retry() }
                            )
                        }
                        if store.isSending {
                            TypingIndicator()
                        }
                        Color.clear
                            .frame(height: 1)
                            .id(Self.bottom)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 20)
                }
                .scrollDismissesKeyboard(.interactively)
                .onChange(of: store.entries.count) {
                    withAnimation(.easeOut(duration: 0.25)) {
                        proxy.scrollTo(Self.bottom, anchor: .bottom)
                    }
                }
                .onChange(of: store.isSending) {
                    withAnimation(.easeOut(duration: 0.25)) {
                        proxy.scrollTo(Self.bottom, anchor: .bottom)
                    }
                }
            }
            .background(Theme.paper)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                composer(draft: $store.draft)
            }
            .navigationTitle(L10n.tabConcierge)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        store.reset()
                    } label: {
                        Image(systemName: "square.and.pencil")
                    }
                    .disabled(store.entries.isEmpty)
                    .accessibilityLabel(L10n.conciergeNew)
                    .accessibilityIdentifier("concierge.new")
                }
            }
            // Links inside a reply follow the same rules as every other link.
            .environment(\.openURL, OpenURLAction { url in
                router.open(url)
                return .handled
            })
        }
    }

    private func composer(draft: Binding<String>) -> some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField(L10n.conciergePlaceholder, text: draft, axis: .vertical)
                .lineLimit(1...5)
                .focused($composing)
                .foregroundStyle(Theme.ink)
                .padding(.horizontal, 16)
                .padding(.vertical, 11)
                .background(Theme.card, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .stroke(Theme.rule, lineWidth: 1)
                )
                .accessibilityIdentifier("concierge.input")

            Button {
                store.send()
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(Theme.onAccent)
                    .frame(width: 44, height: 44)
                    .background(store.canSend ? Theme.accent : Theme.rule, in: Circle())
            }
            .disabled(!store.canSend)
            .accessibilityLabel(L10n.conciergeSend)
            .accessibilityIdentifier("concierge.send")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .background(Theme.paper)
        .overlay(alignment: .top) {
            Rectangle()
                .fill(Theme.rule)
                .frame(height: 1)
        }
    }
}

// MARK: - Empty conversation

private struct ConciergeWelcome: View {
    let ask: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            ConciergeMark()
                .frame(width: 56, height: 56)

            Text(L10n.conciergeTitle)
                .font(.system(.largeTitle, design: .serif).weight(.medium))
                .foregroundStyle(Theme.ink)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("concierge.title")

            Text(L10n.conciergeSubtitle)
                .font(.body)
                .foregroundStyle(Theme.soft)

            VStack(alignment: .leading, spacing: 10) {
                ForEach(L10n.conciergeStarters, id: \.self) { prompt in
                    Button {
                        ask(prompt)
                    } label: {
                        HStack(spacing: 12) {
                            Text(prompt)
                                .font(.callout)
                                .foregroundStyle(Theme.ink)
                                .multilineTextAlignment(.leading)
                            Spacer(minLength: 8)
                            Image(systemName: "arrow.up.forward")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(Theme.accent)
                                .accessibilityHidden(true)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(Theme.rule, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("concierge.starter")
                }
            }
            .padding(.top, 6)
        }
        .padding(.top, 12)
        .padding(.bottom, 8)
    }
}

/// The gold orb the website uses for its concierge.
private struct ConciergeMark: View {
    var body: some View {
        Circle()
            .fill(
                RadialGradient(
                    colors: [Theme.gold, Theme.gold.opacity(0.55), Theme.card],
                    center: UnitPoint(x: 0.35, y: 0.3),
                    startRadius: 2,
                    endRadius: 44
                )
            )
            .overlay(Circle().stroke(Theme.gold.opacity(0.5), lineWidth: 1))
            .shadow(color: Theme.gold.opacity(0.35), radius: 14)
            .accessibilityHidden(true)
    }
}

// MARK: - Conversation rows

private struct ConciergeEntryView: View {
    let entry: ConciergeStore.Entry
    let open: (String) -> Void
    let retry: () -> Void

    var body: some View {
        switch entry.kind {
        case .guest:
            HStack {
                Spacer(minLength: 48)
                Text(entry.text)
                    .foregroundStyle(Theme.onAccent)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 11)
                    .background(Theme.accent, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .textSelection(.enabled)
            }
        case .concierge:
            VStack(alignment: .leading, spacing: 12) {
                Text(Self.formatted(entry.text))
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .textSelection(.enabled)
                    .padding(.trailing, 32)

                ForEach(entry.cards) { card in
                    ConciergeCardView(card: card) { open(card.href) }
                }

                if !entry.suggestions.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(entry.suggestions) { link in
                                Button(link.label) { open(link.href) }
                                    .font(.subheadline.weight(.medium))
                                    .foregroundStyle(Theme.ink)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 8)
                                    .background(Theme.card, in: Capsule())
                                    .overlay(Capsule().stroke(Theme.rule, lineWidth: 1))
                                    .buttonStyle(.plain)
                            }
                        }
                    }
                }
            }
        case .failed:
            HStack(spacing: 12) {
                Image(systemName: "exclamationmark.circle")
                    .foregroundStyle(Theme.soft)
                    .accessibilityHidden(true)
                Text(entry.text)
                    .font(.subheadline)
                    .foregroundStyle(Theme.soft)
                Spacer(minLength: 8)
                Button(L10n.actionRetry, action: retry)
                    .font(.subheadline.weight(.semibold))
                    .accessibilityIdentifier("concierge.retry")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    /// Replies sometimes carry light Markdown (bold, links); show it as
    /// formatting rather than asterisks, and fall back to the plain text.
    private static func formatted(_ text: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: text, options: options)) ?? AttributedString(text)
    }
}

private struct ConciergeCardView: View {
    let card: ConciergeCard
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                Text(card.title)
                    .font(.system(.title3, design: .serif).weight(.medium))
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.leading)

                if let summary = card.summary {
                    Text(summary)
                        .font(.subheadline)
                        .foregroundStyle(Theme.soft)
                        .multilineTextAlignment(.leading)
                }

                HStack(spacing: 6) {
                    Text(card.cta ?? L10n.conciergeOpen)
                    Image(systemName: "arrow.forward")
                        .accessibilityHidden(true)
                }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.accent)
                .padding(.top, 4)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(16)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(Theme.rule, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

private struct TypingIndicator: View {
    @State private var lit = false

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(Theme.soft)
                    .frame(width: 7, height: 7)
                    .opacity(lit ? 1 : 0.3)
                    .animation(.easeInOut(duration: 0.6).repeatForever().delay(Double(index) * 0.2), value: lit)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
        .onAppear { lit = true }
        .accessibilityLabel(L10n.stateLoading)
    }
}
