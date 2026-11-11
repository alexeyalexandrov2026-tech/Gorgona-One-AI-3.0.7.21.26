import Foundation

/// What the app does with a URL someone is about to open.
public enum RouteDecision: Equatable, Sendable {
    /// A Miami Elio page: load it in the app's web view.
    case web
    /// Someone else's page (a partner, a ticket seller): show it in the
    /// in-app Safari sheet so the guest can come straight back.
    case browser
    /// Not a web page at all, or a link another app owns (phone, mail,
    /// WhatsApp, Maps): hand it to iOS.
    case system
    /// A Miami Elio section this app does not carry. Opens in Safari.
    case restricted
    /// Nothing to open (a `javascript:` or `file:` link).
    case ignored
}

/// The single place that decides where a link goes. The web view, the
/// concierge and search all ask here, so they can never disagree.
public struct RoutePolicy: Sendable {
    public let config: AppConfig
    public let restrictedPaths: [String]

    /// Sportsbook sections stay out of the app: App Store guideline 5.3
    /// requires a gambling licence for apps that promote real-money betting.
    /// The website is unaffected.
    public static let defaultRestrictedPaths = [
        "/sportsbook",
        "/sports-betting-promos",
        "/betmgm-promos",
        "/caesars-sportsbook-promos",
        "/draftkings-promos",
        "/fanduel-promos",
        "/stores/betting"
    ]

    /// Web addresses that are really doors into other apps.
    private static let systemHosts: Set<String> = [
        "wa.me", "api.whatsapp.com", "t.me",
        "maps.apple.com", "apps.apple.com", "itunes.apple.com"
    ]

    public init(config: AppConfig = .production, restrictedPaths: [String] = RoutePolicy.defaultRestrictedPaths) {
        self.config = config
        self.restrictedPaths = restrictedPaths.map { Self.normalize(path: $0) }
    }

    public func decide(_ url: URL) -> RouteDecision {
        guard let scheme = url.scheme?.lowercased() else { return .ignored }

        switch scheme {
        case "https", "http":
            guard let host = url.host?.lowercased() else { return .ignored }
            if config.internalHosts.contains(host) {
                return isRestricted(path: url.path) ? .restricted : .web
            }
            return Self.systemHosts.contains(host) ? .system : .browser
        case "about", "blob", "data":
            // Scratch documents the page creates for itself.
            return .web
        case "javascript", "file":
            return .ignored
        default:
            return .system
        }
    }

    /// True for a link the app can show in its own web view - used to drop
    /// concierge cards and search results that would lead out of the app.
    public func allowsInApp(reference: String) -> Bool {
        guard let url = config.resolve(reference) else { return false }
        return decide(url) == .web
    }

    public func isRestricted(path: String) -> Bool {
        let candidate = Self.normalize(path: path)
        return restrictedPaths.contains { candidate == $0 || candidate.hasPrefix($0 + "/") }
    }

    private static func normalize(path: String) -> String {
        var value = path.lowercased()
        while value.count > 1 && value.hasSuffix("/") {
            value.removeLast()
        }
        return value
    }
}
