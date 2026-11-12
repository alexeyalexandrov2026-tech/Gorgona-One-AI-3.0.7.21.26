import XCTest
@testable import MiamiElioKit

final class ConciergeAPITests: XCTestCase {
    private func body(of request: URLRequest) throws -> [String: Any] {
        let data = try XCTUnwrap(request.httpBody)
        return try XCTUnwrap(JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    func testBuildsTheRequestTheServerExpects() throws {
        let client = ConciergeClient(transport: MockTransport())
        let request = try client.makeRequest(
            messages: [ChatMessage(role: .user, content: "Find a yacht for 8 guests")],
            sessionId: "abc-123",
            locale: "ru-RU"
        )

        XCTAssertEqual(request.url?.absoluteString, "https://gorgona-one.com/api/chat")
        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")

        let json = try body(of: request)
        XCTAssertEqual(json["locale"] as? String, "ru")
        XCTAssertEqual(json["sessionId"] as? String, "abc-123")
        let messages = try XCTUnwrap(json["messages"] as? [[String: String]])
        XCTAssertEqual(messages, [["role": "user", "content": "Find a yacht for 8 guests"]])
    }

    func testOmitsTheSessionOnTheFirstTurnAndFallsBackToEnglish() throws {
        let client = ConciergeClient(transport: MockTransport())
        let request = try client.makeRequest(
            messages: [ChatMessage(role: .user, content: "Hello")],
            sessionId: nil,
            locale: "sv-SE"
        )
        let json = try body(of: request)
        XCTAssertNil(json["sessionId"])
        XCTAssertEqual(json["locale"] as? String, "en")
    }

    func testSendsOnlyTheRecentTurnsAndTrimsLongOnes() throws {
        let client = ConciergeClient(transport: MockTransport())
        var history: [ChatMessage] = []
        for index in 1...20 {
            history.append(ChatMessage(role: index.isMultiple(of: 2) ? .assistant : .user, content: "turn \(index)"))
        }
        history.append(ChatMessage(role: .user, content: String(repeating: "x", count: 5000)))

        let json = try body(of: try client.makeRequest(messages: history, sessionId: nil, locale: "en"))
        let messages = try XCTUnwrap(json["messages"] as? [[String: String]])
        XCTAssertEqual(messages.count, ConciergeClient.historyLimit)
        XCTAssertEqual(messages.first?["content"], "turn 10")
        XCTAssertEqual(messages.last?["content"]?.count, ConciergeClient.maxMessageLength)
    }

    func testKeepsALongConversationUnderTheServersBodyLimit() throws {
        let client = ConciergeClient(transport: MockTransport())
        // Twelve turns of 3,000 Cyrillic letters are about 72 KB of UTF-8.
        var history: [ChatMessage] = []
        for index in 1...11 {
            history.append(ChatMessage(role: index.isMultiple(of: 2) ? .assistant : .user, content: String(repeating: "я", count: 3000)))
        }
        history.append(ChatMessage(role: .user, content: "последний вопрос"))

        let request = try client.makeRequest(messages: history, sessionId: "abc", locale: "ru")
        XCTAssertLessThanOrEqual(try XCTUnwrap(request.httpBody).count, ConciergeClient.maxBodyBytes)
        let messages = try XCTUnwrap(try body(of: request)["messages"] as? [[String: String]])
        XCTAssertLessThan(messages.count, ConciergeClient.historyLimit)
        XCTAssertGreaterThan(messages.count, 1)
        XCTAssertEqual(messages.last, ["role": "user", "content": "последний вопрос"])
    }

    func testMeasuresATurnTheWayTheServerDoes() throws {
        let client = ConciergeClient(transport: MockTransport())
        let emoji = String(repeating: "😀", count: 3000)
        let json = try body(of: try client.makeRequest(messages: [ChatMessage(role: .user, content: emoji)], sessionId: nil, locale: "en"))
        let content = try XCTUnwrap((json["messages"] as? [[String: String]])?.first?["content"])
        XCTAssertEqual(content.utf16.count, ConciergeClient.maxMessageLength)
        XCTAssertEqual(content.count, ConciergeClient.maxMessageLength / 2)
    }

    func testLeavesOutBlankTurnsAndNeedsTheGuestToSpeakLast() throws {
        let client = ConciergeClient(transport: MockTransport())
        let json = try body(of: try client.makeRequest(
            messages: [
                ChatMessage(role: .user, content: "  Hello  "),
                ChatMessage(role: .assistant, content: " \n "),
                ChatMessage(role: .user, content: "A yacht")
            ],
            sessionId: nil,
            locale: "en"
        ))
        let messages = try XCTUnwrap(json["messages"] as? [[String: String]])
        XCTAssertEqual(messages, [["role": "user", "content": "Hello"], ["role": "user", "content": "A yacht"]])

        XCTAssertThrowsError(try client.makeRequest(
            messages: [ChatMessage(role: .user, content: "Hello"), ChatMessage(role: .assistant, content: "Welcome")],
            sessionId: nil,
            locale: "en"
        )) { error in
            XCTAssertEqual(error as? APIError, .invalidRequest)
        }
    }

    func testRefusesAnEmptyConversation() {
        let client = ConciergeClient(transport: MockTransport())
        XCTAssertThrowsError(try client.makeRequest(messages: [], sessionId: nil, locale: "en")) { error in
            XCTAssertEqual(error as? APIError, .invalidRequest)
        }
    }

    func testReadsAReplyAndDropsDestinationsTheAppDoesNotCarry() async throws {
        let transport = MockTransport(json: """
        {
          "reply": "  Three crewed yachts fit eight guests.  ",
          "suggestions": [
            {"href": "/yachts", "label": "Yachts"},
            {"href": "/sportsbook", "label": "Sportsbooks"},
            {"href": "/events", "label": "Events"}
          ],
          "cards": [
            {"href": "/yachts", "label": "Yachts", "title": "Yacht Charters", "summary": "Crewed charters from Miami marinas.", "cta": "Explore Yachts"},
            {"href": "/sportsbook", "label": "Sportsbooks", "title": "Sportsbooks", "summary": "Offers.", "cta": "Open"}
          ],
          "configured": true,
          "source": "router",
          "sessionId": "session-9"
        }
        """)
        let client = ConciergeClient(transport: transport)

        let reply = try await client.send(
            messages: [ChatMessage(role: .user, content: "Find a yacht for 8 guests")],
            sessionId: nil,
            locale: "en"
        )

        XCTAssertEqual(reply.reply, "Three crewed yachts fit eight guests.")
        XCTAssertEqual(reply.suggestions, [ConciergeLink(href: "/yachts", label: "Yachts"), ConciergeLink(href: "/events", label: "Events")])
        XCTAssertEqual(reply.cards, [ConciergeCard(href: "/yachts", title: "Yacht Charters", summary: "Crewed charters from Miami marinas.", cta: "Explore Yachts")])
        XCTAssertEqual(reply.sessionId, "session-9")
        XCTAssertFalse(reply.degraded)
        XCTAssertEqual(transport.requests.count, 1)
    }

    func testReadsTheServersFallbackReply() async throws {
        let transport = MockTransport(json: #"{"reply":"The concierge is resting.","suggestions":[],"cards":[],"configured":true,"error":true}"#)
        let reply = try await ConciergeClient(transport: transport).send(
            messages: [ChatMessage(role: .user, content: "Hello")], sessionId: nil, locale: "en"
        )
        XCTAssertEqual(reply.reply, "The concierge is resting.")
        XCTAssertTrue(reply.degraded)
        XCTAssertNil(reply.sessionId)
    }

    func testKeepsTheReplyWhenACardIsMalformed() async throws {
        let transport = MockTransport(json: """
        {"reply":"Here you go.","suggestions":[{"href":"/yachts"},42,{"href":"/rentals","label":"Cars"}],"cards":"none"}
        """)
        let reply = try await ConciergeClient(transport: transport).send(
            messages: [ChatMessage(role: .user, content: "Hello")], sessionId: nil, locale: "en"
        )
        XCTAssertEqual(reply.reply, "Here you go.")
        XCTAssertEqual(reply.suggestions, [ConciergeLink(href: "/rentals", label: "Cars")])
        XCTAssertEqual(reply.cards, [])
    }

    func testReportsServerAndFormatFailures() async {
        let message = [ChatMessage(role: .user, content: "Hello")]

        do {
            _ = try await ConciergeClient(transport: MockTransport(status: 503)).send(messages: message, sessionId: nil, locale: "en")
            XCTFail("Expected a status error")
        } catch {
            XCTAssertEqual(error as? APIError, .status(503))
        }

        do {
            _ = try await ConciergeClient(transport: MockTransport(json: #"{"reply":""}"#)).send(messages: message, sessionId: nil, locale: "en")
            XCTFail("Expected a decoding error")
        } catch {
            XCTAssertEqual(error as? APIError, .decoding)
        }

        do {
            _ = try await ConciergeClient(transport: MockTransport(json: "<html>")).send(messages: message, sessionId: nil, locale: "en")
            XCTFail("Expected a decoding error")
        } catch {
            XCTAssertEqual(error as? APIError, .decoding)
        }
    }
}
