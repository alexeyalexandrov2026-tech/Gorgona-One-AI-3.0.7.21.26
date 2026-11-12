import Foundation
@testable import MiamiElioKit

/// Replays one canned response and remembers what was asked of it.
final class MockTransport: HTTPTransport, @unchecked Sendable {
    private let lock = NSLock()
    private var recorded: [URLRequest] = []
    private let status: Int
    private let body: Data
    private let failure: Error?

    init(status: Int = 200, json: String = "{}", failure: Error? = nil) {
        self.status = status
        self.body = Data(json.utf8)
        self.failure = failure
    }

    var requests: [URLRequest] {
        lock.lock()
        defer { lock.unlock() }
        return recorded
    }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        lock.lock()
        recorded.append(request)
        lock.unlock()
        if let failure {
            throw failure
        }
        let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: "HTTP/1.1", headerFields: nil)!
        return (body, response)
    }
}
