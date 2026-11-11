import Foundation

/// One turn of the conversation, in the shape `/api/chat` expects.
public struct ChatMessage: Codable, Equatable, Sendable {
    public enum Role: String, Codable, Sendable {
        case user
        case assistant
    }

    public let role: Role
    public let content: String

    public init(role: Role, content: String) {
        self.role = role
        self.content = content
    }
}

/// A compact chip under a reply: somewhere to go next.
public struct ConciergeLink: Decodable, Equatable, Sendable, Identifiable {
    public let href: String
    public let label: String

    public var id: String { href }

    public init(href: String, label: String) {
        self.href = href
        self.label = label
    }

    private enum CodingKeys: String, CodingKey {
        case href, label
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard let href = container.text(forKey: .href), let label = container.text(forKey: .label) else {
            throw APIError.decoding
        }
        self.href = href
        self.label = label
    }
}

/// A richer navigation card: a section of the site with a line about it.
public struct ConciergeCard: Decodable, Equatable, Sendable, Identifiable {
    public let href: String
    public let title: String
    public let summary: String?
    public let cta: String?

    public var id: String { href }

    public init(href: String, title: String, summary: String? = nil, cta: String? = nil) {
        self.href = href
        self.title = title
        self.summary = summary
        self.cta = cta
    }

    private enum CodingKeys: String, CodingKey {
        case href, title, label, summary, cta
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard let href = container.text(forKey: .href),
              let title = container.text(forKey: .title) ?? container.text(forKey: .label)
        else {
            throw APIError.decoding
        }
        self.href = href
        self.title = title
        self.summary = container.text(forKey: .summary)
        self.cta = container.text(forKey: .cta)
    }
}

public struct ConciergeReply: Decodable, Equatable, Sendable {
    public let reply: String
    public let suggestions: [ConciergeLink]
    public let cards: [ConciergeCard]
    /// Handle for the server's conversation memory; echoed back on the next turn.
    public let sessionId: String?
    /// True when no AI engine answered and the server sent its polite fallback.
    public let degraded: Bool

    public init(reply: String, suggestions: [ConciergeLink] = [], cards: [ConciergeCard] = [], sessionId: String? = nil, degraded: Bool = false) {
        self.reply = reply
        self.suggestions = suggestions
        self.cards = cards
        self.sessionId = sessionId
        self.degraded = degraded
    }

    private enum CodingKeys: String, CodingKey {
        case reply, suggestions, cards, sessionId, error
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard let reply = container.text(forKey: .reply) else {
            throw APIError.decoding
        }
        self.reply = reply
        self.suggestions = container.lossyArray(of: ConciergeLink.self, forKey: .suggestions)
        self.cards = container.lossyArray(of: ConciergeCard.self, forKey: .cards)
        self.sessionId = container.text(forKey: .sessionId)
        self.degraded = (try? container.decode(Bool.self, forKey: .error)) ?? false
    }
}

/// Talks to the site's concierge endpoint (`app/api/chat/route.js`).
public struct ConciergeClient: Sendable {
    /// The server reads at most this many turns; sending more is wasted bytes.
    public static let historyLimit = 12
    /// The server truncates each turn to this length.
    public static let maxMessageLength = 4000

    private let config: AppConfig
    private let policy: RoutePolicy
    private let transport: any HTTPTransport

    public init(config: AppConfig = .production, policy: RoutePolicy? = nil, transport: any HTTPTransport = URLSessionTransport(timeout: 45)) {
        self.config = config
        self.policy = policy ?? RoutePolicy(config: config)
        self.transport = transport
    }

    public func makeRequest(messages: [ChatMessage], sessionId: String?, locale: String) throws -> URLRequest {
        let recent = messages.suffix(Self.historyLimit).map {
            ChatMessage(role: $0.role, content: String($0.content.prefix(Self.maxMessageLength)))
        }
        guard !recent.isEmpty, let url = config.resolve("/api/chat") else {
            throw APIError.invalidRequest
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(config.userAgentToken, forHTTPHeaderField: "User-Agent")
        request.httpBody = try JSONEncoder().encode(
            Payload(messages: recent, sessionId: sessionId, locale: SiteLocale.normalize(locale) ?? SiteLocale.fallback)
        )
        return request
    }

    public func send(messages: [ChatMessage], sessionId: String?, locale: String) async throws -> ConciergeReply {
        let request = try makeRequest(messages: messages, sessionId: sessionId, locale: locale)
        let (data, response) = try await transport.send(request)
        guard response.statusCode == 200 else {
            throw APIError.status(response.statusCode)
        }
        guard let decoded = try? JSONDecoder().decode(ConciergeReply.self, from: data) else {
            throw APIError.decoding
        }
        // Only offer destinations the app can actually show.
        return ConciergeReply(
            reply: decoded.reply,
            suggestions: decoded.suggestions.filter { policy.allowsInApp(reference: $0.href) },
            cards: decoded.cards.filter { policy.allowsInApp(reference: $0.href) },
            sessionId: decoded.sessionId,
            degraded: decoded.degraded
        )
    }

    private struct Payload: Encodable {
        let messages: [ChatMessage]
        let sessionId: String?
        let locale: String
    }
}
