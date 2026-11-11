import Foundation

/// One inventory hit, as shaped by `toSearchResult` in `lib/data/listings.js`.
public struct SearchResult: Decodable, Equatable, Sendable, Identifiable {
    public let href: String
    public let title: String
    public let world: String?
    public let subtitle: String?
    public let category: String?
    public let location: String?
    public let price: String?
    public let image: String?

    public var id: String { href }

    public init(href: String, title: String, world: String? = nil, subtitle: String? = nil, category: String? = nil, location: String? = nil, price: String? = nil, image: String? = nil) {
        self.href = href
        self.title = title
        self.world = world
        self.subtitle = subtitle
        self.category = category
        self.location = location
        self.price = price
        self.image = image
    }

    private enum CodingKeys: String, CodingKey {
        case href, title, world, subtitle, category, location, price, image
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard let href = container.text(forKey: .href), let title = container.text(forKey: .title) else {
            throw APIError.decoding
        }
        self.href = href
        self.title = title
        self.world = container.text(forKey: .world)
        self.subtitle = container.text(forKey: .subtitle)
        self.category = container.text(forKey: .category)
        self.location = container.text(forKey: .location)
        self.price = container.text(forKey: .price)
        self.image = container.text(forKey: .image)
    }

    /// "MIAMI ELIO Fleet · Sunny Isles Beach" - whichever parts exist.
    public var detailLine: String {
        var parts: [String] = []
        for part in [subtitle ?? category, location] {
            if let part, !parts.contains(part) {
                parts.append(part)
            }
        }
        return parts.joined(separator: " · ")
    }
}

/// Talks to the site's inventory search (`app/api/search/route.js`).
public struct SearchClient: Sendable {
    /// The server answers nothing below this and trims above the maximum.
    public static let minimumQueryLength = 2
    public static let maximumQueryLength = 80
    public static let maximumResults = 20

    private let config: AppConfig
    private let policy: RoutePolicy
    private let transport: any HTTPTransport

    public init(config: AppConfig = .production, policy: RoutePolicy? = nil, transport: any HTTPTransport = URLSessionTransport(timeout: 20)) {
        self.config = config
        self.policy = policy ?? RoutePolicy(config: config)
        self.transport = transport
    }

    public static func normalize(query: String) -> String {
        String(query.trimmingCharacters(in: .whitespacesAndNewlines).prefix(maximumQueryLength))
    }

    public func makeRequest(query: String, limit: Int = SearchClient.maximumResults) throws -> URLRequest {
        let normalized = Self.normalize(query: query)
        guard normalized.count >= Self.minimumQueryLength,
              let endpoint = config.resolve("/api/search"),
              var components = URLComponents(url: endpoint, resolvingAgainstBaseURL: false)
        else {
            throw APIError.invalidRequest
        }
        components.queryItems = [
            URLQueryItem(name: "q", value: normalized),
            URLQueryItem(name: "limit", value: String(max(1, min(limit, Self.maximumResults))))
        ]
        guard let url = components.url else {
            throw APIError.invalidRequest
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(config.userAgentToken, forHTTPHeaderField: "User-Agent")
        return request
    }

    /// Queries too short for the server return an empty list without a request.
    public func search(_ query: String, limit: Int = SearchClient.maximumResults) async throws -> [SearchResult] {
        guard Self.normalize(query: query).count >= Self.minimumQueryLength else {
            return []
        }
        let request = try makeRequest(query: query, limit: limit)
        let (data, response) = try await transport.send(request)
        guard response.statusCode == 200 else {
            throw APIError.status(response.statusCode)
        }
        guard let decoded = try? JSONDecoder().decode(Envelope.self, from: data) else {
            throw APIError.decoding
        }
        return decoded.results.filter { policy.allowsInApp(reference: $0.href) }
    }

    /// Full URL of a result's picture, or nil when it has none.
    public func imageURL(for result: SearchResult) -> URL? {
        result.image.flatMap { config.resolve($0) }
    }

    private struct Envelope: Decodable {
        let results: [SearchResult]

        private enum CodingKeys: String, CodingKey {
            case results
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            guard container.contains(.results) else {
                throw APIError.decoding
            }
            results = container.lossyArray(of: SearchResult.self, forKey: .results)
        }
    }
}
