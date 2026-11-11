import Foundation

/// One of the weeks in Miami that sell out first: Art Basel, New Year's
/// Eve, the Boat Show and the rest. The list is the website's own
/// (`lib/seasonData.js`), copied into the app as `season.json` by
/// `ios/scripts/build-season.mjs`. Event records stay in English in every
/// language, as they do on the site.
public struct SeasonEvent: Codable, Equatable, Identifiable, Sendable {
    public let id: String
    public let name: String
    /// Calendar days in Miami, "2026-12-04".
    public let start: String
    public let end: String
    public let place: String
    public let tip: String

    public init(id: String, name: String, start: String, end: String, place: String, tip: String) {
        self.id = id
        self.name = name
        self.start = start
        self.end = end
        self.place = place
        self.tip = tip
    }
}

/// What to show of the season and when to remind a guest about a week.
/// Days are counted on Miami's calendar wherever the guest's phone is.
public enum Season {
    public static let timeZone = TimeZone(identifier: "America/New_York") ?? .current
    /// A reminder comes three weeks ahead: early enough to book what goes first.
    public static let reminderLead = 21
    /// At ten in the morning, Miami time.
    public static let reminderHour = 10

    private struct File: Decodable {
        let events: [SeasonEvent]
    }

    /// Reads `season.json`.
    public static func decode(_ data: Data) throws -> [SeasonEvent] {
        try JSONDecoder().decode(File.self, from: data).events
    }

    /// The weeks that have not ended yet, soonest first.
    public static func upcoming(_ events: [SeasonEvent], now: Date) -> [SeasonEvent] {
        let today = calendar.startOfDay(for: now)
        return events
            .filter { event in day(event.end).map { $0 >= today } ?? false }
            .sorted { $0.start < $1.start }
    }

    /// Whole days from today until the week starts; 0 or less while it is on.
    public static func daysUntil(_ event: SeasonEvent, now: Date) -> Int {
        guard let start = day(event.start) else { return 0 }
        return calendar.dateComponents([.day], from: calendar.startOfDay(for: now), to: start).day ?? 0
    }

    /// When to remind a guest who asks now, or nil when it is too late to be
    /// worth it. Normally three weeks ahead; once that has passed, the next
    /// morning, as long as that is still before the week begins.
    public static func reminder(for event: SeasonEvent, now: Date) -> Date? {
        guard let start = day(event.start),
              let startMorning = morning(of: start),
              let planned = calendar.date(byAdding: .day, value: -reminderLead, to: startMorning)
        else { return nil }
        if planned > now {
            return planned
        }
        guard let todayMorning = morning(of: calendar.startOfDay(for: now)) else { return nil }
        let next = todayMorning > now ? todayMorning : calendar.date(byAdding: .day, value: 1, to: todayMorning)
        guard let next, next < start else { return nil }
        return next
    }

    /// "Dec 4 – 6", "Dec 31", "Apr 30 – May 2": the dates the way the site
    /// prints them for an event (in English, like the event's name).
    public static func range(_ event: SeasonEvent) -> String {
        guard let start = parts(event.start), let end = parts(event.end) else { return event.start }
        let first = "\(monthName(start.month)) \(start.day)"
        if start == end {
            return first
        }
        if start.month == end.month, start.year == end.year {
            return "\(first) – \(end.day)"
        }
        return "\(first) – \(monthName(end.month)) \(end.day)"
    }

    /// The month on the date stub: "DEC".
    public static func monthStub(_ event: SeasonEvent) -> String {
        parts(event.start).map { monthName($0.month).uppercased() } ?? ""
    }

    /// The day on the date stub: "4".
    public static func dayStub(_ event: SeasonEvent) -> String {
        parts(event.start).map { String($0.day) } ?? ""
    }

    // MARK: - Calendar

    static var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar
    }

    private struct Parts: Equatable {
        let year: Int
        let month: Int
        let day: Int
    }

    private static let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    private static func monthName(_ month: Int) -> String {
        months.indices.contains(month - 1) ? months[month - 1] : ""
    }

    private static func parts(_ iso: String) -> Parts? {
        let numbers = iso.split(separator: "-").compactMap { Int($0) }
        guard numbers.count == 3, (1...12).contains(numbers[1]), (1...31).contains(numbers[2]) else { return nil }
        return Parts(year: numbers[0], month: numbers[1], day: numbers[2])
    }

    /// Midnight in Miami at the start of an ISO day.
    static func day(_ iso: String) -> Date? {
        guard let parts = parts(iso) else { return nil }
        return calendar.date(from: DateComponents(year: parts.year, month: parts.month, day: parts.day))
    }

    private static func morning(of day: Date) -> Date? {
        calendar.date(bySettingHour: reminderHour, minute: 0, second: 0, of: day)
    }
}
