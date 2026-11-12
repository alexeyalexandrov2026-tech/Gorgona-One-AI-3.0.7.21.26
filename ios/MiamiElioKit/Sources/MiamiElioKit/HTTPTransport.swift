import Foundation

public enum APIError: Error, Equatable, Sendable {
    case invalidRequest
    case invalidResponse
    case status(Int)
    case decoding
}

/// The network, reduced to one call so the API clients can be tested against
/// recorded responses.
public protocol HTTPTransport: Sendable {
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse)
}

public struct URLSessionTransport: HTTPTransport {
    private let session: URLSession

    public init(session: URLSession) {
        self.session = session
    }

    /// A private session: no cookies, no cache, a hard timeout. The site's
    /// JSON endpoints are anonymous, so nothing here needs the web view's
    /// signed-in state.
    public init(timeout: TimeInterval = 30) {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.timeoutIntervalForRequest = timeout
        configuration.timeoutIntervalForResource = timeout * 2
        configuration.waitsForConnectivity = false
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        self.session = URLSession(configuration: configuration)
    }

    public func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        return (data, http)
    }
}

// MARK: - Tolerant decoding

/// An array that keeps the entries it understands and drops the rest, so one
/// malformed card cannot cost the guest the whole reply.
struct LossyArray<Element: Decodable>: Decodable {
    let elements: [Element]

    init(from decoder: Decoder) throws {
        var container = try decoder.unkeyedContainer()
        var kept: [Element] = []
        while !container.isAtEnd {
            if let element = try? container.decode(Element.self) {
                kept.append(element)
            } else {
                // A failed decode does not advance the cursor; consume the entry.
                _ = try? container.decode(Skipped.self)
            }
        }
        elements = kept
    }

    private struct Skipped: Decodable {
        init(from decoder: Decoder) throws {}
    }
}

extension KeyedDecodingContainer {
    /// A non-empty string, whether the server sent text or a bare number.
    func text(forKey key: Key) -> String? {
        if let value = try? decode(String.self, forKey: key) {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }
        if let value = try? decode(Int.self, forKey: key) {
            return String(value)
        }
        if let value = try? decode(Double.self, forKey: key) {
            return String(value)
        }
        return nil
    }

    func lossyArray<Element: Decodable>(of type: Element.Type, forKey key: Key) -> [Element] {
        (try? decode(LossyArray<Element>.self, forKey: key))?.elements ?? []
    }
}
