import SwiftUI
import UIKit
import MiamiElioKit

/// Miami's season under the concierge's ready-made prompts: the weeks that
/// sell out first, soonest first - the same list, in the same English, as
/// the website's home page. A tap on a week asks the concierge to plan it;
/// the bell beside it sets a reminder ahead of it.
struct SeasonListView: View {
    @Environment(SeasonStore.self) private var season
    @Environment(\.scenePhase) private var scenePhase
    let ask: (String) -> Void
    /// Its place in the welcome screen's sequence of arrivals.
    let order: Int

    var body: some View {
        let now = Date()
        let events = season.upcoming(now: now)

        VStack(alignment: .leading, spacing: 0) {
            Text(L10n.seasonTitle)
                .eyebrow(Theme.gold)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("season.title")
                .padding(.bottom, 10)

            Text(L10n.seasonLede)
                .font(AppFont.detail)
                .foregroundStyle(Theme.soft)
                .fixedSize(horizontal: false, vertical: true)
                .padding(.bottom, 14)

            if events.isEmpty {
                Text(L10n.seasonEmpty)
                    .font(AppFont.detail)
                    .foregroundStyle(Theme.soft)
                    .accessibilityIdentifier("season.empty")
            } else {
                ForEach(events) { event in
                    Hairline()
                    SeasonRow(event: event, now: now, reminder: season.reminders[event.id], ask: ask) {
                        Task { await season.toggle(event) }
                    }
                }
                Hairline()
            }

            if season.blocked {
                SettingsNotice(text: L10n.seasonBlocked)
                    .padding(.top, 14)
            }
        }
        .arrives(order)
        // What is still scheduled, read back: a reminder that has gone off,
        // or notifications turned off in Settings meanwhile.
        .task { await season.refresh() }
        .onChange(of: scenePhase) {
            if scenePhase == .active {
                Task { await season.refresh() }
            }
        }
    }
}

/// One week: its date, name and place, how soon it is, and the bell.
private struct SeasonRow: View {
    let event: SeasonEvent
    let now: Date
    let reminder: Date?
    let ask: (String) -> Void
    let toggle: () -> Void

    var body: some View {
        let dates = Season.range(event)
        // Too close to remind about: the bell only stays to take a reminder back.
        let canRemind = reminder != nil || Season.reminder(for: event, now: now) != nil

        HStack(alignment: .center, spacing: 12) {
            Button {
                ask(L10n.seasonAsk(name: event.name, dates: dates))
            } label: {
                HStack(alignment: .center, spacing: 14) {
                    DateStub(month: Season.monthStub(event), day: Season.dayStub(event))

                    VStack(alignment: .leading, spacing: 3) {
                        Text(verbatim: event.name)
                            .font(AppFont.rowTitle)
                            .foregroundStyle(Theme.ink)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(verbatim: event.place)
                            .font(AppFont.detail)
                            .foregroundStyle(Theme.soft)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(status(dates: dates))
                            .font(AppFont.detail)
                            .foregroundStyle(reminder == nil ? Theme.soft : Theme.gold)
                            .multilineTextAlignment(.leading)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    Spacer(minLength: 0)
                }
                .padding(.vertical, 14)
                .contentShape(Rectangle())
            }
            .buttonStyle(PressableStyle())
            .accessibilityHint(L10n.seasonPlan)
            .accessibilityIdentifier("season.event")

            if canRemind {
                Button(action: toggle) {
                    Image(systemName: reminder == nil ? "bell" : "bell.fill")
                        .font(.system(size: 17, weight: .medium))
                        .foregroundStyle(reminder == nil ? Theme.soft : Theme.gold)
                        .frame(width: 44, height: 44)
                        .overlay(Circle().stroke(reminder == nil ? Theme.rule : Theme.gold.opacity(0.6), lineWidth: 1))
                        .contentShape(Circle())
                }
                .buttonStyle(PressableStyle())
                .sensoryFeedback(.selection, trigger: reminder != nil)
                .accessibilityLabel(reminder == nil ? L10n.seasonRemind : L10n.seasonReminderOff)
                .accessibilityValue(reminder.map { L10n.seasonReminderOn(Self.day($0)) } ?? "")
                .accessibilityIdentifier("season.remind")
            }
        }
    }

    private func status(dates: String) -> String {
        if let reminder {
            return "\(dates) · \(L10n.seasonReminderOn(Self.day(reminder)))"
        }
        let days = Season.daysUntil(event, now: now)
        let when: String
        switch days {
        case ...0: when = L10n.seasonOnNow
        case 1: when = L10n.seasonTomorrow
        default: when = Self.relative.localizedString(from: DateComponents(day: days))
        }
        return "\(dates) · \(when)"
    }

    /// The language the app's own words are in.
    private static let locale = Locale(identifier: Bundle.main.preferredLocalizations.first ?? "en")

    /// "in 23 days", "через 23 дня".
    private static let relative: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.locale = locale
        formatter.unitsStyle = .full
        formatter.dateTimeStyle = .numeric
        return formatter
    }()

    /// "November 13", "13 ноября": the day of a reminder, on Miami's calendar.
    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.timeZone = Season.timeZone
        formatter.setLocalizedDateFormatFromTemplate("dMMMM")
        return formatter
    }()

    private static func day(_ date: Date) -> String {
        dayFormatter.string(from: date)
    }
}

/// The torn-ticket date the site prints beside each week: month over day.
private struct DateStub: View {
    let month: String
    let day: String

    var body: some View {
        VStack(spacing: 1) {
            Text(verbatim: month)
                .font(AppFont.mono(11))
                .kerning(1.5)
                .foregroundStyle(Theme.accent)
            Text(verbatim: day)
                .font(AppFont.display(24, relativeTo: .title2))
                .monospacedDigit()
                .foregroundStyle(Theme.ink)
        }
        .padding(.vertical, 8)
        .frame(minWidth: 52)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .stroke(Theme.rule, lineWidth: 1)
        )
        .accessibilityHidden(true)
    }
}

/// Something is turned off for the app - notifications, the microphone -
/// and only the guest can turn it back on: say so, with the way to Settings.
struct SettingsNotice: View {
    let text: String
    var offersSettings = true

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 12) {
            Text(text)
                .font(AppFont.detail)
                .foregroundStyle(Theme.soft)
                .fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 8)
            if offersSettings {
                Button(L10n.actionSettings) {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                .font(AppFont.detailMedium)
                .foregroundStyle(Theme.accent)
                .accessibilityIdentifier("notice.settings")
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Theme.rule, lineWidth: 1)
        )
    }
}
