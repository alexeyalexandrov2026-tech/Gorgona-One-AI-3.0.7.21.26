import SwiftUI
import MiamiElioKit

/// The AI concierge as a native conversation. It speaks to the same
/// `/api/chat` the website uses; anything it points to opens in Home.
/// A request can be typed or spoken; the concierge answers in text.
struct ConciergeView: View {
    @Environment(AppRouter.self) private var router
    @Environment(ConciergeStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase
    @FocusState private var composing: Bool
    @State private var dictation = Dictation()

    private static let bottom = "concierge.bottom"

    var body: some View {
        @Bindable var store = store

        NavigationStack {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 26) {
                        if store.entries.isEmpty {
                            ConciergeWelcome(listening: dictation.isListening, level: dictation.level) { send($0) }
                        }
                        ForEach(store.entries) { entry in
                            ConciergeEntryView(
                                entry: entry,
                                isNewest: entry.id == store.entries.last?.id,
                                open: { router.open(reference: $0) },
                                retry: { store.retry() }
                            )
                            .arrives()
                        }
                        // Real catalogue items for a multi-section request, sent as one request.
                        if let plan = store.plan {
                            PlanBoardView(draft: plan) { router.open(reference: $0) }
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
                        dictation.cancel()
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
        // Another tab, or the app put away: the microphone goes off, and
        // what was heard so far stays in the composer.
        .onDisappear { dictation.stop() }
        .onChange(of: scenePhase) {
            if scenePhase == .background {
                dictation.stop()
            }
        }
    }

    /// Sends the draft, or a ready-made prompt. A microphone still on is put
    /// down first, so nothing it hears afterwards refills the composer.
    private func send(_ prompt: String? = nil) {
        dictation.cancel()
        dictation.notice = nil
        store.send(prompt)
    }

    private func composer(draft: Binding<String>) -> some View {
        VStack(spacing: 10) {
            if let notice = dictation.notice {
                SettingsNotice(
                    text: notice == .denied ? L10n.voiceDenied : L10n.voiceUnavailable,
                    offersSettings: notice == .denied
                )
                .accessibilityIdentifier("voice.notice")
                .transition(.opacity)
            }

            HStack(alignment: .bottom, spacing: 10) {
                TextField(
                    L10n.conciergePlaceholder,
                    text: draft,
                    prompt: Text(dictation.isListening ? L10n.voiceListening + "…" : L10n.conciergePlaceholder)
                        .foregroundStyle(Theme.soft),
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
                        .stroke(composing || dictation.isListening ? Theme.accent.opacity(0.6) : Theme.rule, lineWidth: 1)
                )
                .animation(.easeOut(duration: 0.2), value: composing)
                .accessibilityIdentifier("concierge.input")

                microphone

                Button {
                    send()
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
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Theme.paper)
        .overlay(alignment: .top) {
            Hairline()
        }
        .animation(.easeOut(duration: 0.2), value: dictation.notice)
    }

    /// Speak instead of type. While it listens, the button becomes the
    /// concierge's orb, swelling with the guest's voice; a tap stops it.
    private var microphone: some View {
        Button {
            toggleMicrophone()
        } label: {
            ZStack {
                if dictation.isListening {
                    ConciergeMark(diameter: 46, activity: .listening, level: dictation.level)
                    Image(systemName: "stop.fill")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(Color.black.opacity(0.7))
                } else {
                    Image(systemName: "mic")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Theme.soft)
                        .frame(width: 46, height: 46)
                        .overlay(Circle().stroke(Theme.rule, lineWidth: 1))
                }
            }
            .frame(width: 46, height: 46)
            .contentShape(Circle())
        }
        .buttonStyle(PressableStyle())
        .sensoryFeedback(.impact(weight: .light), trigger: dictation.isListening)
        .accessibilityLabel(dictation.isListening ? L10n.voiceStop : L10n.voiceSpeak)
        .accessibilityIdentifier("concierge.mic")
    }

    private func toggleMicrophone() {
        if dictation.isListening {
            dictation.stop()
            return
        }
        composing = false
        // What is heard joins whatever the guest had already typed.
        let store = self.store
        let typed = store.draft.trimmingCharacters(in: .whitespacesAndNewlines)
        let lead = typed.isEmpty ? "" : typed + " "
        dictation.start(language: store.language) { words in
            store.draft = lead + words
        }
    }
}

// MARK: - Empty conversation

private struct ConciergeWelcome: View {
    /// The microphone is on: the large orb listens too.
    var listening = false
    var level: Double = 0
    let ask: (String) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            ConciergeMark(diameter: 68, breathes: true, activity: listening ? .listening : .resting, level: level)
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

            // The weeks that sell out first, each a request and a reminder away.
            SeasonListView(ask: ask, order: 4 + L10n.conciergeStarters.count)
                .padding(.top, 40)
        }
    }
}

// MARK: - Conversation rows

private struct ConciergeEntryView: View {
    let entry: ConciergeStore.Entry
    /// The latest reply: its orb lights up as it arrives.
    let isNewest: Bool
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
                ConciergeMark(diameter: 22, glintsOnArrival: isNewest)
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

/// A reply on its way: the orb turns a light across itself, where three
/// dots used to blink.
private struct TypingIndicator: View {
    var body: some View {
        HStack(spacing: 0) {
            ConciergeMark(diameter: 28, activity: .thinking)
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L10n.stateLoading)
    }
}
