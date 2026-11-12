import Foundation

/// What a concierge plan may contain. Mirrors `lib/planRules.mjs` on the site:
/// experiences and events are booked on partner sites, so they never join.
public enum PlanRules {
    public static let kinds: Set<String> = ["yacht", "stay", "car", "dining", "nightlife"]
    public static let sections: Set<String> = ["/yachts", "/vacation-rentals", "/rentals", "/restaurants-nightlife"]
    public static let maxItems = 6
    public static let maxNights = 30
    public static let maxCandidates = 4

    /// Lowercase letters, digits and hyphens, as the site's catalogue slugs are.
    static func isSlug(_ value: String) -> Bool {
        guard !value.isEmpty, value.count <= 120, let first = value.first, first != "-" else { return false }
        return value.allSatisfy { $0 == "-" || ($0.isASCII && ($0.isLowercase || $0.isNumber)) }
    }
}

/// One real catalogue item the server picked (`lib/ai/plan.mjs`).
public struct PlanItem: Decodable, Equatable, Sendable, Identifiable {
    public let kind: String
    public let slug: String
    public let title: String
    public let subtitle: String?
    /// Absolute https address once the client has resolved it.
    public let image: String?
    public let href: String

    public var id: String { kind + ":" + slug }
    public var isRestaurant: Bool { kind == "dining" || kind == "nightlife" }

    public init(kind: String, slug: String, title: String, subtitle: String? = nil, image: String? = nil, href: String) {
        self.kind = kind
        self.slug = slug
        self.title = title
        self.subtitle = subtitle
        self.image = image
        self.href = href
    }

    private enum CodingKeys: String, CodingKey {
        case kind, slug, title, subtitle, image, href
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard let kind = container.text(forKey: .kind), PlanRules.kinds.contains(kind),
              let slug = container.text(forKey: .slug), PlanRules.isSlug(slug),
              let title = container.text(forKey: .title),
              let href = container.text(forKey: .href)
        else {
            throw APIError.decoding
        }
        self.kind = kind
        self.slug = slug
        self.title = title
        self.subtitle = container.text(forKey: .subtitle)
        self.image = container.text(forKey: .image)
        self.href = href
    }
}

/// One section of the plan (yachts, villas, cars, restaurants) and its options.
public struct PlanSection: Decodable, Equatable, Sendable, Identifiable {
    public let href: String
    public let label: String
    public let candidates: [PlanItem]

    public var id: String { href }

    public init(href: String, label: String, candidates: [PlanItem]) {
        self.href = href
        self.label = label
        self.candidates = candidates
    }

    private enum CodingKeys: String, CodingKey {
        case href, label, candidates
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard let href = container.text(forKey: .href), PlanRules.sections.contains(href),
              let label = container.text(forKey: .label)
        else {
            throw APIError.decoding
        }
        // An option must open inside its own section.
        let candidates = container.lossyArray(of: PlanItem.self, forKey: .candidates)
            .filter { $0.href.hasPrefix(href + "/") }
            .prefix(PlanRules.maxCandidates)
        guard !candidates.isEmpty else { throw APIError.decoding }
        self.href = href
        self.label = label
        self.candidates = Array(candidates)
    }
}

/// Catalogue items for a request that named two or more sections.
public struct ConciergePlan: Decodable, Equatable, Sendable {
    public let guests: Int?
    public let sections: [PlanSection]
    /// False until the site's plan requests are switched on; the cards still show.
    public let requestable: Bool

    public init(guests: Int? = nil, sections: [PlanSection], requestable: Bool) {
        self.guests = guests
        self.sections = sections
        self.requestable = requestable
    }

    private enum CodingKeys: String, CodingKey {
        case version, guests, sections, requestable
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard (try? container.decode(Int.self, forKey: .version)) == 1 else { throw APIError.decoding }
        let sections = Array(container.lossyArray(of: PlanSection.self, forKey: .sections).prefix(4))
        guard sections.count >= 2 else { throw APIError.decoding }
        let guests = try? container.decode(Int.self, forKey: .guests)
        self.guests = guests.flatMap { (1...99).contains($0) ? $0 : nil }
        self.sections = sections
        self.requestable = (try? container.decode(Bool.self, forKey: .requestable)) ?? false
    }

    /// Keeps only options the app can open and gives every photo a full https
    /// address. Nil when fewer than two sections are left.
    public func resolved(config: AppConfig, policy: RoutePolicy) -> ConciergePlan? {
        let kept = sections.compactMap { section -> PlanSection? in
            let items = section.candidates.filter { policy.allowsInApp(reference: $0.href) }.map { item -> PlanItem in
                let photo = item.image.flatMap { config.resolve($0) }.flatMap { $0.scheme?.lowercased() == "https" ? $0.absoluteString : nil }
                return PlanItem(kind: item.kind, slug: item.slug, title: item.title, subtitle: item.subtitle, image: photo, href: item.href)
            }
            return items.isEmpty ? nil : PlanSection(href: section.href, label: section.label, candidates: items)
        }
        return kept.count >= 2 ? ConciergePlan(guests: guests, sections: kept, requestable: requestable) : nil
    }
}

/// The one request for a whole plan, in the shape `/api/plan` expects.
public struct PlanRequest: Encodable, Equatable, Sendable {
    public struct Item: Encodable, Equatable, Sendable {
        public let kind: String
        public let slug: String

        public init(kind: String, slug: String) {
            self.kind = kind
            self.slug = slug
        }
    }

    public let name: String
    public let email: String
    public let phone: String
    /// Calendar days, `yyyy-MM-dd`.
    public let start: String
    public let end: String
    public let guests: Int
    /// `HH:mm`, only when the plan has a restaurant.
    public let time: String?
    public let note: String
    public let items: [Item]

    public init(name: String, email: String, phone: String, start: String, end: String, guests: Int, time: String?, note: String, items: [Item]) {
        self.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        self.email = email.trimmingCharacters(in: .whitespacesAndNewlines)
        self.phone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        self.start = start
        self.end = end
        self.guests = guests
        self.time = time
        self.note = note.trimmingCharacters(in: .whitespacesAndNewlines)
        self.items = items
    }

    /// The same checks the server makes first, so the guest hears about a
    /// mistake before anything is sent.
    public var isComplete: Bool {
        guard !name.isEmpty, name.count <= 120, !phone.isEmpty, phone.count <= 40 else { return false }
        guard email.count <= 254, email.contains("@"), email.contains(".") else { return false }
        guard end >= start, (1...99).contains(guests), note.count <= 1000 else { return false }
        guard !items.isEmpty, items.count <= PlanRules.maxItems else { return false }
        let hasRestaurant = items.contains(where: { $0.kind == "dining" || $0.kind == "nightlife" })
        return hasRestaurant == (time != nil)
    }

    /// `yyyy-MM-dd` for a calendar day as the guest picked it.
    public static func day(_ date: Date, calendar: Calendar = .current) -> String {
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        return String(format: "%04ld-%02ld-%02ld", parts.year ?? 0, parts.month ?? 0, parts.day ?? 0)
    }

    /// `HH:mm` for a time of day as the guest picked it.
    public static func clock(_ date: Date, calendar: Calendar = .current) -> String {
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        return String(format: "%02ld:%02ld", parts.hour ?? 0, parts.minute ?? 0)
    }
}

/// What the server returns once every item of the plan is saved.
public struct PlanReceipt: Decodable, Equatable, Sendable {
    public let planId: String
    public let bookingIds: [String]

    private enum CodingKeys: String, CodingKey {
        case success, planId, bookingIds
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        guard (try? container.decode(Bool.self, forKey: .success)) == true,
              let planId = container.text(forKey: .planId), UUID(uuidString: planId) != nil,
              let bookingIds = try? container.decode([String].self, forKey: .bookingIds),
              !bookingIds.isEmpty, bookingIds.allSatisfy({ UUID(uuidString: $0) != nil })
        else {
            throw APIError.decoding
        }
        self.planId = planId
        self.bookingIds = bookingIds
    }
}

/// Sends a plan to `app/api/plan/route.js`. Anonymous, like every other
/// JSON call the app makes; the same key is reused when a send is retried,
/// so a lost answer never creates a second request.
public struct PlanClient: Sendable {
    private let config: AppConfig
    private let transport: any HTTPTransport

    public init(config: AppConfig = .production, transport: any HTTPTransport = URLSessionTransport(timeout: 30)) {
        self.config = config
        self.transport = transport
    }

    public func makeRequest(_ plan: PlanRequest, key: UUID) throws -> URLRequest {
        guard plan.isComplete, let url = config.resolve("/api/plan") else {
            throw APIError.invalidRequest
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue(config.userAgentToken, forHTTPHeaderField: "User-Agent")
        request.setValue(key.uuidString.lowercased(), forHTTPHeaderField: "Idempotency-Key")
        request.httpBody = try JSONEncoder().encode(plan)
        return request
    }

    public func send(_ plan: PlanRequest, key: UUID) async throws -> PlanReceipt {
        let request = try makeRequest(plan, key: key)
        let (data, response) = try await transport.send(request)
        guard response.statusCode == 200 else {
            throw APIError.status(response.statusCode)
        }
        guard let receipt = try? JSONDecoder().decode(PlanReceipt.self, from: data) else {
            throw APIError.decoding
        }
        return receipt
    }
}
