import SwiftUI
import WebKit

/// A tab that shows part of the Miami Elio site.
struct WebTab: View {
    let model: WebViewModel

    var body: some View {
        ZStack(alignment: .top) {
            Theme.paper.ignoresSafeArea()

            WebViewHost(webView: model.webView)
                // The web view moves focused fields above the keyboard itself.
                .ignoresSafeArea(.keyboard, edges: .bottom)
                .opacity(model.failure == nil ? 1 : 0)
                .accessibilityHidden(model.failure != nil)

            if model.isLoading, model.failure == nil {
                ProgressView(value: min(max(model.progress, 0.05), 1))
                    .progressViewStyle(.linear)
                    .tint(Theme.accent)
                    .accessibilityLabel(L10n.stateLoading)
            }

            if let failure = model.failure {
                LoadFailureView(failure: failure) { model.retry() }
            }
        }
        .onAppear { model.activate() }
    }
}

private struct WebViewHost: UIViewRepresentable {
    let webView: WKWebView

    func makeUIView(context: Context) -> WKWebView {
        webView
    }

    func updateUIView(_ view: WKWebView, context: Context) {}
}

private struct LoadFailureView: View {
    let failure: LoadFailure
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: failure.isOffline ? "wifi.slash" : "exclamationmark.triangle")
                .font(.system(size: 40, weight: .light))
                .foregroundStyle(Theme.soft)
                .accessibilityHidden(true)

            Text(failure.isOffline ? L10n.offlineTitle : L10n.errorGeneric)
                .font(.title3.weight(.semibold))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)

            if failure.isOffline {
                Text(L10n.offlineMessage)
                    .font(.subheadline)
                    .foregroundStyle(Theme.soft)
                    .multilineTextAlignment(.center)
            }

            Button(action: retry) {
                Text(L10n.actionRetry)
                    .font(.headline)
                    .foregroundStyle(Theme.onAccent)
                    .padding(.horizontal, 28)
                    .padding(.vertical, 12)
            }
            .buttonStyle(.borderedProminent)
            .buttonBorderShape(.capsule)
            .padding(.top, 6)
            .accessibilityIdentifier("web.retry")
        }
        .padding(32)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.paper)
    }
}
