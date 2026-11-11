import Observation
import SwiftUI
import UIKit
import MiamiElioKit

enum AppTab: Hashable {
    case explore
    case concierge
    case search
    case account
}

/// A third-party page shown in the in-app Safari sheet.
struct BrowserPage: Identifiable {
    let url: URL
    var id: String { url.absoluteString }
}

/// Owns navigation: which tab is showing and where every link ends up.
@MainActor
@Observable
final class AppRouter {
    var selectedTab: AppTab = .explore
    var browserPage: BrowserPage?

    let explore: WebViewModel
    let account: WebViewModel

    private let config: AppConfig
    private let policy: RoutePolicy

    init(config: AppConfig, policy: RoutePolicy, explore: WebViewModel, account: WebViewModel) {
        self.config = config
        self.policy = policy
        self.explore = explore
        self.account = account

        let route: (URL, RouteDecision) -> Void = { [weak self] url, decision in
            self?.follow(url, decision: decision)
        }
        explore.onRoute = route
        account.onRoute = route
    }

    /// Tab bar taps. Tapping the tab you are already on takes it back to its start.
    func select(_ tab: AppTab) {
        if tab == selectedTab {
            switch tab {
            case .explore: explore.returnToStart()
            case .account: account.returnToStart()
            case .concierge, .search: break
            }
        }
        selectedTab = tab
    }

    /// A link from the site's own JSON ("/yachts/azimut-55").
    func open(reference: String) {
        guard let url = config.resolve(reference) else { return }
        open(url)
    }

    func open(_ url: URL) {
        follow(url, decision: policy.decide(url))
    }

    /// `miamielio://open?path=/yachts`, `miamielio://concierge`, `miamielio://search`.
    func handle(deepLink url: URL) {
        guard url.scheme?.lowercased() == "miamielio" else { return }
        switch url.host?.lowercased() {
        case "concierge":
            selectedTab = .concierge
        case "search":
            selectedTab = .search
        case "account":
            selectedTab = .account
        default:
            let path = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?.first { $0.name == "path" }?.value ?? "/"
            // Only site-relative paths: a deep link can never point the app elsewhere.
            if path.hasPrefix("/"), !path.hasPrefix("//") {
                open(reference: path)
            }
        }
    }

    private func follow(_ url: URL, decision: RouteDecision) {
        switch decision {
        case .web:
            browserPage = nil
            explore.load(url)
            selectedTab = .explore
        case .browser:
            browserPage = BrowserPage(url: url)
        case .system, .restricted:
            UIApplication.shared.open(url)
        case .ignored:
            break
        }
    }
}
