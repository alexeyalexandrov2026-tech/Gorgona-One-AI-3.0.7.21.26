import Foundation

/// Where the app's content lives. One value, so pointing a build at a staging
/// site is a single change.
public struct AppConfig: Sendable, Equatable {
    /// Origin every site-relative link is resolved against.
    public let baseURL: URL
    /// Hosts whose pages belong inside the app's own web view.
    public let internalHosts: Set<String>
    /// Appended to the web view's user agent so the site can recognise the app.
    public let userAgentToken: String

    public init(baseURL: URL, additionalHosts: Set<String> = [], userAgentToken: String = "MiamiElioApp/1.0") {
        self.baseURL = baseURL
        var hosts = Set(additionalHosts.map { $0.lowercased() })
        if let host = baseURL.host?.lowercased() {
            hosts.insert(host)
        }
        self.internalHosts = hosts
        self.userAgentToken = userAgentToken
    }

    public static let production = AppConfig(
        baseURL: URL(string: "https://gorgona-one.com")!,
        additionalHosts: ["www.gorgona-one.com"]
    )

    /// The host cookies are stored under.
    public var cookieHost: String {
        baseURL.host?.lowercased() ?? ""
    }

    /// Turns a link from the site's JSON into a full URL.
    ///
    /// The API sends site-relative references ("/yachts/azimut-55",
    /// "/images/rentals/x/cover.jpg") and, for partner media, absolute https
    /// URLs. Anything else - an empty string, a protocol-relative "//host",
    /// a non-web scheme - is rejected rather than guessed at.
    public func resolve(_ reference: String) -> URL? {
        let trimmed = reference.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return nil }

        if trimmed.hasPrefix("/") {
            guard !trimmed.hasPrefix("//") else { return nil }
            return URL(string: trimmed, relativeTo: baseURL)?.absoluteURL
        }

        guard let absolute = URL(string: trimmed),
              let scheme = absolute.scheme?.lowercased(),
              scheme == "https" || scheme == "http",
              absolute.host != nil
        else { return nil }
        return absolute
    }
}
