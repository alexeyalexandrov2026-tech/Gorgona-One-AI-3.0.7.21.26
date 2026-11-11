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
                    LazyVStack(alignment: .leading, spacing: 26) {
                        if store.entries.isEmpty {
                            ConciergeWelcome { store.send($0) }
                        }
                        ForEach(store.entries) { entry in
                            ConciergeEntryView(
                                entry: entry,
                                open: { router.open(reference: $0) },
                                retry: { store.retry() }
                            )
                            .arrives()
                        }
                        if store.isSending {
                            TypingIndicator()
                                .arrives()
                        }
                        Color.clear
                            .frame(height: 1)
                            .id(Self.bottom)
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 8)
                    .padding(.bottom, 20)
                }
                .scrollDismissesKeyboard(.interactively)
                // A tap on the conversation puts the keyboard away, which is
                // also what uncovers the tab bar.
                .simultaneousGesture(TapGesture().onEnded { composing = false })
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
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Wordmark()
                }
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
            // A light tap under the finger when a message goes or a reply lands.
            .sensoryFeedback(.impact(weight: .light), trigger: store.entries.count)
            // Links inside a reply follow the same rules as every other link.
            .environment(\.openURL, OpenURLAction { url in
                router.open(url)
                return .handled
            })
        }
    }

    private func composer(draft: Binding<String>) -> some View {
        HStack(alignment: .bottom, spacing: 10) {
            TextField(
                L10n.conciergePlaceholder,
                text: draft,
                prompt: Text(L10n.conciergePlaceholder).foregroundStyle(Theme.soft),
                axis: .vertical
            )
            .font(AppFont.body)
            .lineLimit(1...5)
            .focused($composing)
            .foregroundStyle(Theme.ink)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .stroke(composing ? Theme.accent.opacity(0.6) : Theme.rule, lineWidth: 1)
            )
            .animation(.easeOut(duration: 0.2), value: composing)
            .accessibilityIdentifier("concierge.input")

            Button {
                store.send()
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(store.canSend ? Theme.onAccent : Theme.soft)
                    .frame(width: 46, height: 46)
                    .background(store.canSend ? Theme.accent : Theme.card, in: Circle())
                    .overlay(Circle().stroke(store.canSend ? Color.clear : Theme.rule, lineWidth: 1))
            }
            .buttonStyle(PressableStyle())
            .disabled(!store.canSend)
            .animation(.easeOut(duration: 0.2), value: store.canSend)
            .accessibilityLabel(L10n.conciergeSend)
            .accessibilityIdentifier("concierge.send")
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Theme.paper)
        .overlay(alignment: .top) {
            Hairline()
        }
    }
}

// MARK: - Empty conversation

private struct ConciergeWelcome: View {
    let ask: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ConciergeMark(diameter: 68, breathes: true)
                .padding(.top, 28)
                .padding(.bottom, 30)
                .arrives(0)

            Text(verbatim: "Miami Elio AI")
                .eyebrow(Theme.accent)
                .padding(.bottom, 12)
                .arrives(1)

            Text(L10n.conciergeTitle)
                .font(AppFont.hero)
                .tracking(AppFont.headingTracking(AppFont.heroSize))
                .foregroundStyle(Theme.ink)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("concierge.title")
                .padding(.bottom, 28)
                .arrives(2)

            // Ready-made requests, listed the way the site lists its sections:
            // one per line between hairlines.
            VStack(spacing: 0) {
                ForEach(Array(L10n.conciergeStarters.enumerated()), id: \.element) { index, prompt in
                    Hairline()
                        .arrives(3 + index)
                    Button {
                        ask(prompt)
                    } label: {
                        HStack(alignment: .center, spacing: 14) {
                            Text(prompt)
                                .font(AppFont.rowTitle)
                                .foregroundStyle(Theme.ink)
                                .multilineTextAlignment(.leading)
                                .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 8)
                            Image(systemName: "arrow.up.forward")
                                .font(.system(size: 15, weight: .medium))
                                .foregroundStyle(Theme.accent)
                                .accessibilityHidden(true)
                        }
                        .padding(.vertical, 17)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(PressableStyle())
                    .accessibilityIdentifier("concierge.starter")
                    .arrives(3 + index)
                }
                Hairline()
                    .arrives(3 + L10n.conciergeStarters.count)
            }
        }
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
                Spacer(minLength: 56)
                Text(entry.text)
                    .font(AppFont.body)
                    .foregroundStyle(Theme.ink)
                    .padding(.horizontal, 17)
                    .padding(.vertical, 12)
                    .background(Theme.accentWash, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .stroke(Theme.accent.opacity(0.4), lineWidth: 1)
                    )
                    .textSelection(.enabled)
            }
        case .concierge:
            // The concierge speaks in plain type beside its orb, like an
            // editor's reply, rather than from a second chat bubble.
            HStack(alignment: .top, spacing: 12) {
                ConciergeMark(diameter: 22)
                    .padding(.top, 2)

                VStack(alignment: .leading, spacing: 16) {
                    Text(Self.formatted(entry.text))
                        .font(AppFont.body)
                        .foregroundStyle(Theme.ink)
                        .lineSpacing(4)
                        .fixedSize(horizontal: false, vertical: true)
                        .textSelection(.enabled)

                    ForEach(entry.cards) { card in
                        ConciergeCardView(card: card) { open(card.href) }
                    }

                    if !entry.suggestions.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(entry.suggestions) { link in
                                    Button {
                                        open(link.href)
                                    } label: {
                                        Text(link.label)
                                            .font(AppFont.detailMedium)
                                            .foregroundStyle(Theme.ink)
                                            .padding(.horizontal, 15)
                                            .padding(.vertical, 9)
                                            .overlay(Capsule().stroke(Theme.rule, lineWidth: 1))
                                            .contentShape(Capsule())
                                    }
                                    .buttonStyle(PressableStyle())
                                }
                            }
                            .padding(.vertical, 1)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        case .failed:
            HStack(spacing: 12) {
                Image(systemName: "exclamationmark.circle")
                    .foregroundStyle(Theme.soft)
                    .accessibilityHidden(true)
                Text(entry.text)
                    .font(AppFont.detail)
                    .foregroundStyle(Theme.soft)
                Spacer(minLength: 8)
                Button(action: retry) {
                    Text(L10n.actionRetry)
                        .font(AppFont.detailMedium)
                        .foregroundStyle(Theme.accent)
                }
                .accessibilityIdentifier("concierge.retry")
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Theme.rule, lineWidth: 1)
            )
        }
    }

    /// Replies sometimes carry light Markdown (bold, links); show it as
    /// formatting rather than asterisks, and fall back to the plain text.
    private static func formatted(_ text: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: text, options: options)) ?? AttributedString(text)
    }
}

/// A section of the site the concierge is pointing to.
private struct ConciergeCardView: View {
    let card: ConciergeCard
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                Text(card.title)
                    .font(AppFont.cardTitle)
                    .tracking(AppFont.headingTracking(AppFont.cardTitleSize))
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)

                if let summary = card.summary {
                    Text(summary)
                        .font(AppFont.detail)
                        .foregroundStyle(Theme.soft)
                        .lineSpacing(2)
                        .multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                }

                HStack(spacing: 8) {
                    Text(card.cta ?? L10n.conciergeOpen)
                    Image(systemName: "arrow.forward")
                        .accessibilityHidden(true)
                }
                .eyebrow(Theme.accent)
                .padding(.top, 6)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(18)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 20, style: .continuous)
                    .stroke(Theme.rule, lineWidth: 1)
            )
            .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        .buttonStyle(PressableStyle())
    }
}

private struct TypingIndicator: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var lit = false

    var body: some View {
        HStack(spacing: 12) {
            ConciergeMark(diameter: 22)
            HStack(spacing: 6) {
                ForEach(0..<3, id: \.self) { index in
                    Circle()
                        .fill(Theme.gold)
                        .frame(width: 6, height: 6)
                        .opacity(lit ? 1 : 0.25)
                        .animation(
                            reduceMotion ? nil : .easeInOut(duration: 0.6).repeatForever().delay(Double(index) * 0.2),
                            value: lit
                        )
                }
            }
        }
        .onAppear { lit = true }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L10n.stateLoading)
    }
}
