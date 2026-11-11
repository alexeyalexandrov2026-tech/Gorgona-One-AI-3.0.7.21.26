import Foundation
import Observation
import UserNotifications
import MiamiElioKit

/// Names the reminders share with whoever opens them. Not tied to an
/// actor: the notification centre calls in on a queue of its own.
enum SeasonReminder {
    static let prefix = "season."
    static let eventKey = "seasonEvent"
    static let dateKey = "seasonRemindAt"
}

/// Miami's season on the concierge screen, and the reminders a guest asks
/// for. A reminder is a notification the phone itself delivers at the time
/// it was given: nothing comes from a server, and nothing is scheduled (or
/// asked permission for) until the guest taps the bell.
@MainActor
@Observable
final class SeasonStore {
    let events: [SeasonEvent]
    /// Event id -> when its reminder comes.
    private(set) var reminders: [String: Date] = [:]
    /// The guest has turned notifications off for the app.
    private(set) var blocked = false

    @ObservationIgnored let opener = SeasonReminderOpener()
    @ObservationIgnored private let center = UNUserNotificationCenter.current()

    init(bundle: Bundle = .main) {
        events = bundle.url(forResource: "season", withExtension: "json")
            .flatMap { try? Data(contentsOf: $0) }
            .flatMap { try? Season.decode($0) } ?? []
        // Set before launch finishes, so the tap on a reminder that opened
        // the app is not missed.
        center.delegate = opener
    }

    func upcoming(now: Date = .now) -> [SeasonEvent] {
        Season.upcoming(events, now: now)
    }

    func event(id: String) -> SeasonEvent? {
        events.first { $0.id == id }
    }

    /// Reads back what is still scheduled: a reminder that has gone off,
    /// or notifications turned off in Settings, show up here.
    func refresh() async {
        let pending = await center.pendingNotificationRequests()
        var found: [String: Date] = [:]
        for request in pending where request.identifier.hasPrefix(SeasonReminder.prefix) {
            let id = String(request.identifier.dropFirst(SeasonReminder.prefix.count))
            if let at = request.content.userInfo[SeasonReminder.dateKey] as? Double {
                found[id] = Date(timeIntervalSince1970: at)
            }
        }
        reminders = found
        let settings = await center.notificationSettings()
        blocked = settings.authorizationStatus == .denied
    }

    /// The bell: schedules the week's reminder, or takes it back.
    func toggle(_ event: SeasonEvent) async {
        let identifier = SeasonReminder.prefix + event.id
        if reminders[event.id] != nil {
            center.removePendingNotificationRequests(withIdentifiers: [identifier])
            reminders[event.id] = nil
            return
        }
        guard let when = Season.reminder(for: event, now: .now) else { return }
        // iOS asks the guest the first time only; after that their answer stands.
        let allowed = (try? await center.requestAuthorization(options: [.alert, .sound])) ?? false
        guard allowed else {
            blocked = true
            return
        }
        blocked = false

        let content = UNMutableNotificationContent()
        content.title = "\(event.name) · \(Season.range(event))"
        content.body = L10n.seasonLede
        content.sound = .default
        content.threadIdentifier = "season"
        content.userInfo = [SeasonReminder.eventKey: event.id, SeasonReminder.dateKey: when.timeIntervalSince1970]
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: max(when.timeIntervalSinceNow, 1), repeats: false)
        do {
            try await center.add(UNNotificationRequest(identifier: identifier, content: content, trigger: trigger))
            reminders[event.id] = when
        } catch {
            // Nothing was scheduled, so the bell stays off.
        }
    }
}

/// Opens the concierge when a reminder is tapped, and shows a reminder
/// that arrives while the app is open as a banner, like any other.
final class SeasonReminderOpener: NSObject, UNUserNotificationCenterDelegate {
    /// Gets the id of the week a tapped reminder is about.
    @MainActor var open: ((String) -> Void)?

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .list, .sound])
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let id = response.notification.request.content.userInfo[SeasonReminder.eventKey] as? String
        Task { @MainActor in
            if let id {
                self.open?(id)
            }
            completionHandler()
        }
    }
}
