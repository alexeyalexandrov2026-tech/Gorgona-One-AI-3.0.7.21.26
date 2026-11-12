import Foundation

/// A catalogue item the guest can keep in "My Miami". Mirrors
/// `lib/favoriteRules.mjs`. The website owns the list - in the account when
/// signed in, in the web views' shared storage otherwise - so the app only
/// hands changes to a page and listens to the list it reports back.
public struct FavoriteRef: Equatable, Sendable {
    public static let kinds: Set<String> = ["yacht", "stay", "car", "dining", "nightlife"]
    /// Where a page queues changes it could not take yet (`FavoritesProvider.jsx`).
    public static let pendingKey = "gorgona-favorites-pending"

    public let kind: String
    public let slug: String
    public let title: String
    public let subtitle: String?
    public let image: String?

    public var key: String { kind + ":" + slug }

    public init?(kind: String, slug: String, title: String, subtitle: String? = nil, image: String? = nil) {
        let name = title.trimmingCharacters(in: .whitespacesAndNewlines)
        guard Self.kinds.contains(kind), PlanRules.isSlug(slug), !name.isEmpty else { return nil }
        self.kind = kind
        self.slug = slug
        self.title = String(name.prefix(240))
        self.subtitle = subtitle.flatMap { $0.isEmpty ? nil : String($0.prefix(300)) }
        self.image = image.flatMap { $0.isEmpty ? nil : $0 }
    }

    /// A search hit, when it is something that can be kept: a yacht, villa, car or restaurant.
    public init?(result: SearchResult) {
        let worlds = ["yachts": "yacht", "car-rentals": "car", "vacation-rentals": "stay", "dining-nightlife": "dining"]
        guard let world = result.world, let mapped = worlds[world] else { return nil }
        let kind = mapped == "dining" && result.category?.lowercased() == "nightlife" ? "nightlife" : mapped
        let slug = result.href.split(separator: "/").last.map(String.init) ?? ""
        self.init(kind: kind, slug: slug, title: result.title, subtitle: result.location, image: result.image)
    }

    /// An item of a concierge plan.
    public init?(item: PlanItem) {
        self.init(kind: item.kind, slug: item.slug, title: item.title, subtitle: item.subtitle, image: item.image)
    }

    private struct Change: Encodable {
        let kind: String
        let slug: String
        let title: String
        let subtitle: String?
        let image: String?
        let on: Bool
    }

    /// JavaScript that gives the change to the page's favourites store, or
    /// queues it in the shared web storage until a page is ready. Evaluates
    /// to true once the change is with the page.
    public func script(on: Bool) -> String? {
        let change = Change(kind: kind, slug: slug, title: title, subtitle: subtitle, image: image, on: on)
        guard let data = try? JSONEncoder().encode(change), let json = String(data: data, encoding: .utf8) else { return nil }
        return """
        (function (change) {
          try {
            if (window.__miamiFavorite) { window.__miamiFavorite(change); return true; }
            var key = '\(Self.pendingKey)';
            var queue = JSON.parse(window.localStorage.getItem(key) || '[]');
            queue.push(change);
            window.localStorage.setItem(key, JSON.stringify(queue.slice(-50)));
            return true;
          } catch (e) { return false; }
        })(\(json))
        """
    }

    /// The list a page reported ("kind:slug" each), or nil when the message is something else.
    public static func keys(from message: Any?) -> Set<String>? {
        guard let list = message as? [Any] else { return nil }
        let keys = list.compactMap { $0 as? String }.filter { $0.count <= 160 && $0.contains(":") }
        return Set(keys.prefix(200))
    }
}
