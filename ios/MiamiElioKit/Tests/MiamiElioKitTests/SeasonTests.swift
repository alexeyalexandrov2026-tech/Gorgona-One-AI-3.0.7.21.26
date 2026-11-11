import XCTest
@testable import MiamiElioKit

final class SeasonTests: XCTestCase {
    private let basel = SeasonEvent(id: "art-basel", name: "Art Basel Miami Beach", start: "2026-12-04", end: "2026-12-06", place: "Miami Beach Convention Center", tip: "VIP days start Dec 2.")
    private let newYear = SeasonEvent(id: "nye", name: "New Year’s Eve", start: "2026-12-31", end: "2026-12-31", place: "Biscayne Bay", tip: "Fireworks over the bay.")
    private let race = SeasonEvent(id: "f1", name: "Formula 1 Miami Grand Prix", start: "2027-04-30", end: "2027-05-02", place: "Miami International Autodrome", tip: "Race weekend.")

    private func utc(_ text: String) -> Date {
        ISO8601DateFormatter().date(from: text)!
    }

    func testReadsTheFileTheScriptWrites() throws {
        let json = #"{"checked":"2026-10-02","events":[{"id":"nye","name":"New Year’s Eve","start":"2026-12-31","end":"2026-12-31","place":"Biscayne Bay","tip":"Fireworks over the bay."}]}"#
        XCTAssertEqual(try Season.decode(Data(json.utf8)), [newYear])
        XCTAssertThrowsError(try Season.decode(Data("[]".utf8)))
    }

    func testKeepsTheWeeksThatHaveNotEndedSoonestFirst() {
        let all = [race, newYear, basel]
        XCTAssertEqual(Season.upcoming(all, now: utc("2026-11-11T17:00:00Z")).map(\.id), ["art-basel", "nye", "f1"])
        // Its last day still counts, on Miami's calendar: 10 p.m. in Miami
        // is already the next day in London.
        XCTAssertEqual(Season.upcoming(all, now: utc("2026-12-07T03:00:00Z")).map(\.id), ["art-basel", "nye", "f1"])
        XCTAssertEqual(Season.upcoming(all, now: utc("2026-12-07T06:00:00Z")).map(\.id), ["nye", "f1"])
        XCTAssertEqual(Season.upcoming(all, now: utc("2027-05-03T12:00:00Z")), [])
    }

    func testCountsDaysOnMiamisCalendar() {
        XCTAssertEqual(Season.daysUntil(basel, now: utc("2026-11-11T17:00:00Z")), 23)
        XCTAssertEqual(Season.daysUntil(basel, now: utc("2026-12-03T17:00:00Z")), 1)
        XCTAssertEqual(Season.daysUntil(basel, now: utc("2026-12-04T17:00:00Z")), 0)
        XCTAssertEqual(Season.daysUntil(basel, now: utc("2026-12-05T17:00:00Z")), -1)
    }

    func testRemindsThreeWeeksAheadAtTenInMiami() {
        // Ten in the morning in Miami is 15:00 UTC in winter...
        XCTAssertEqual(Season.reminder(for: basel, now: utc("2026-11-11T17:00:00Z")), utc("2026-11-13T15:00:00Z"))
        // ...and 14:00 UTC once the clocks have gone forward.
        XCTAssertEqual(Season.reminder(for: race, now: utc("2026-11-11T17:00:00Z")), utc("2027-04-09T14:00:00Z"))
    }

    func testRemindsTheNextMorningOnceThreeWeeksHavePassed() {
        // 3 p.m. in Miami: tomorrow at ten.
        XCTAssertEqual(Season.reminder(for: basel, now: utc("2026-11-20T20:00:00Z")), utc("2026-11-21T15:00:00Z"))
        // 8 a.m. in Miami: today at ten.
        XCTAssertEqual(Season.reminder(for: basel, now: utc("2026-11-20T13:00:00Z")), utc("2026-11-20T15:00:00Z"))
        // The morning before it starts is still worth a reminder...
        XCTAssertEqual(Season.reminder(for: basel, now: utc("2026-12-03T12:00:00Z")), utc("2026-12-03T15:00:00Z"))
        // ...the morning it starts, or later, is not.
        XCTAssertNil(Season.reminder(for: basel, now: utc("2026-12-03T18:00:00Z")))
        XCTAssertNil(Season.reminder(for: basel, now: utc("2026-12-05T12:00:00Z")))
    }

    func testPrintsDatesTheWayTheSiteDoes() {
        XCTAssertEqual(Season.range(basel), "Dec 4 – 6")
        XCTAssertEqual(Season.range(newYear), "Dec 31")
        XCTAssertEqual(Season.range(race), "Apr 30 – May 2")
        XCTAssertEqual(Season.monthStub(basel), "DEC")
        XCTAssertEqual(Season.dayStub(basel), "4")
        let broken = SeasonEvent(id: "x", name: "X", start: "soon", end: "later", place: "", tip: "")
        XCTAssertEqual(Season.range(broken), "soon")
        XCTAssertNil(Season.reminder(for: broken, now: utc("2026-11-11T17:00:00Z")))
        XCTAssertEqual(Season.upcoming([broken], now: utc("2026-11-11T17:00:00Z")), [])
    }
}
