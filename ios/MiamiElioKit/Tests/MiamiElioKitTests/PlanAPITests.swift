import XCTest
@testable import MiamiElioKit

final class PlanAPITests: XCTestCase {
    private let reply = """
    {"reply":"Here is a plan.","cards":[],"suggestions":[],
     "plan":{"version":1,"guests":4,"requestable":true,"sections":[
       {"href":"/yachts","label":"Yachts","candidates":[
         {"kind":"yacht","slug":"big-yacht","title":"Big Yacht","subtitle":"80 ft","image":"https://images.example.com/y.jpg","href":"/yachts/big-yacht"},
         {"kind":"yacht","slug":"elsewhere","title":"Wrong section","href":"/rentals/elsewhere"},
         {"kind":"experience","slug":"tour","title":"Not plannable","href":"/yachts/tour"}]},
       {"href":"/rentals","label":"Cars","candidates":[
         {"kind":"car","slug":"white-suv","title":"White SUV","image":"/images/rentals/white-suv/cover.jpg","href":"/rentals/white-suv"},
         {"kind":"car","slug":"plain","title":"Plain photo","image":"http://insecure.example.com/a.jpg","href":"/rentals/plain"}]},
       {"href":"/events","label":"Events","candidates":[{"kind":"car","slug":"x","title":"X","href":"/events/x"}]}]}}
    """

    func testReadsThePlanAndKeepsOnlyOptionsThatBelong() async throws {
        let client = ConciergeClient(transport: MockTransport(json: reply))
        let answer = try await client.send(messages: [ChatMessage(role: .user, content: "yacht and a car")], sessionId: nil, locale: "en")
        let plan = try XCTUnwrap(answer.plan)
        XCTAssertEqual(plan.guests, 4)
        XCTAssertTrue(plan.requestable)
        XCTAssertEqual(plan.sections.map(\.href), ["/yachts", "/rentals"])
        XCTAssertEqual(plan.sections[0].candidates.map(\.slug), ["big-yacht"])
        XCTAssertEqual(plan.sections[1].candidates.map(\.image), ["https://gorgona-one.com/images/rentals/white-suv/cover.jpg", nil])
        XCTAssertEqual(answer.reply, "Here is a plan.")
    }

    func testABrokenPlanNeverCostsTheReply() async throws {
        for broken in [#"{"version":2,"sections":[]}"#, #"{"version":1,"sections":[{"href":"/yachts","label":"Y","candidates":[{"kind":"yacht","slug":"a","title":"A","href":"/yachts/a"}]}]}"#, #""text""#] {
            let client = ConciergeClient(transport: MockTransport(json: #"{"reply":"Hello","plan":"# + broken + "}"))
            let answer = try await client.send(messages: [ChatMessage(role: .user, content: "Hi")], sessionId: nil, locale: "en")
            XCTAssertEqual(answer.reply, "Hello")
            XCTAssertNil(answer.plan)
        }
    }

    private func request(time: String? = "20:00", end: String = "2027-02-16", items: [PlanRequest.Item]? = nil) -> PlanRequest {
        PlanRequest(
            name: " Demo Guest ", email: "guest@example.com", phone: "+13055550123",
            start: "2027-02-14", end: end, guests: 4, time: time, note: "",
            items: items ?? [PlanRequest.Item(kind: "yacht", slug: "big-yacht"), PlanRequest.Item(kind: "dining", slug: "komodo-miami")]
        )
    }

    func testBuildsTheRequestTheServerExpects() throws {
        let key = UUID()
        let built = try PlanClient(transport: MockTransport()).makeRequest(request(), key: key)
        XCTAssertEqual(built.url?.absoluteString, "https://gorgona-one.com/api/plan")
        XCTAssertEqual(built.httpMethod, "POST")
        XCTAssertEqual(built.value(forHTTPHeaderField: "Idempotency-Key"), key.uuidString.lowercased())
        let json = try XCTUnwrap(JSONSerialization.jsonObject(with: XCTUnwrap(built.httpBody)) as? [String: Any])
        XCTAssertEqual(json["name"] as? String, "Demo Guest")
        XCTAssertEqual(json["guests"] as? Int, 4)
        XCTAssertEqual(json["time"] as? String, "20:00")
        XCTAssertEqual((json["items"] as? [[String: String]])?.map { $0["slug"] ?? "" }, ["big-yacht", "komodo-miami"])

        let noRestaurant = try PlanClient(transport: MockTransport()).makeRequest(
            request(time: nil, items: [PlanRequest.Item(kind: "yacht", slug: "big-yacht"), PlanRequest.Item(kind: "car", slug: "white-suv")]), key: key)
        let plain = try XCTUnwrap(JSONSerialization.jsonObject(with: XCTUnwrap(noRestaurant.httpBody)) as? [String: Any])
        XCTAssertNil(plain["time"])
    }

    func testRefusesAnIncompletePlanBeforeSending() {
        let client = PlanClient(transport: MockTransport())
        XCTAssertThrowsError(try client.makeRequest(request(end: "2027-02-13"), key: UUID()))
        XCTAssertThrowsError(try client.makeRequest(request(time: nil), key: UUID()))
        XCTAssertThrowsError(try client.makeRequest(request(items: []), key: UUID()))
    }

    func testReadsTheReceiptAndReportsRefusals() async throws {
        let ok = #"{"success":true,"planId":"8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2a","bookingIds":["8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2b","8f14e45f-ceea-467e-a7d3-9e6f1b4f3c2c"],"replayed":false}"#
        let receipt = try await PlanClient(transport: MockTransport(json: ok)).send(request(), key: UUID())
        XCTAssertEqual(receipt.bookingIds.count, 2)

        do {
            _ = try await PlanClient(transport: MockTransport(status: 400, json: #"{"error":"Invalid request"}"#)).send(request(), key: UUID())
            XCTFail("A refused plan must throw")
        } catch {
            XCTAssertEqual(error as? APIError, .status(400))
        }
        do {
            _ = try await PlanClient(transport: MockTransport(json: #"{"success":true,"planId":"nope","bookingIds":[]}"#)).send(request(), key: UUID())
            XCTFail("A malformed receipt must throw")
        } catch {
            XCTAssertEqual(error as? APIError, .decoding)
        }
    }

    func testWritesCalendarDaysAndTimes() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "UTC"))
        let date = try XCTUnwrap(calendar.date(from: DateComponents(year: 2027, month: 2, day: 4, hour: 8, minute: 5)))
        XCTAssertEqual(PlanRequest.day(date, calendar: calendar), "2027-02-04")
        XCTAssertEqual(PlanRequest.clock(date, calendar: calendar), "08:05")
    }
}
