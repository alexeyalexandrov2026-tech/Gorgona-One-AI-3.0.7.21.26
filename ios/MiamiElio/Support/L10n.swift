import Foundation

/// Every string the native screens show. The values live in
/// `Resources/<language>.lproj/Localizable.strings`, which
/// `ios/scripts/build-strings.mjs` generates from the website's own
/// translations - edit them there, not by hand.
enum L10n {
    static var tabHome: String { text("tab.home") }
    static var tabConcierge: String { text("tab.concierge") }
    static var tabSearch: String { text("tab.search") }
    static var tabAccount: String { text("tab.account") }

    static var conciergeTitle: String { text("concierge.title") }
    static var conciergePlaceholder: String { text("concierge.placeholder") }
    static var conciergeSend: String { text("concierge.send") }
    static var conciergeNew: String { text("concierge.new") }
    static var conciergeOpen: String { text("concierge.open") }
    static var conciergeStarters: [String] {
        ["concierge.starter.1", "concierge.starter.2", "concierge.starter.3"].map(text)
    }

    static var searchEmpty: String { text("search.empty") }
    static var searchPopular: String { text("search.popular") }

    static var worldYachts: String { text("world.yachts") }
    static var worldCars: String { text("world.cars") }
    static var worldVillas: String { text("world.villas") }
    static var worldEvents: String { text("world.events") }
    static var worldTravel: String { text("world.travel") }
    static var worldJets: String { text("world.jets") }
    static var worldDining: String { text("world.dining") }
    static var worldExperiences: String { text("world.experiences") }

    // A plan: real catalogue items for a multi-section request, sent as one request.
    static var planTitle: String { text("plan.title") }
    static var planLede: String { text("plan.lede") }
    static var planAnother: String { text("plan.another") }
    static var planRemove: String { text("plan.remove") }
    static var planEmpty: String { text("plan.empty") }
    static var planSend: String { text("plan.send") }
    static var planFirstDay: String { text("plan.firstDay") }
    static var planLastDay: String { text("plan.lastDay") }
    static var planGuests: String { text("plan.guests") }
    static var planDinnerTime: String { text("plan.dinnerTime") }
    static var planName: String { text("plan.name") }
    static var planPhone: String { text("plan.phone") }
    static var planEmail: String { text("plan.email") }
    static var planNote: String { text("plan.note") }
    static var planBadDates: String { text("plan.badDates") }
    static var planCheck: String { text("plan.check") }
    static var planFailed: String { text("plan.failed") }
    static var planSending: String { text("plan.sending") }
    static var planSubmit: String { text("plan.submit") }
    static var planCharge: String { text("plan.charge") }
    static var planSent: String { text("plan.sent") }
    static var planNew: String { text("plan.new") }
    static func planAddBack(_ section: String) -> String { text("plan.addBack").replacingOccurrences(of: "{section}", with: section) }
    static func planSentText(_ count: Int) -> String { text("plan.sentText").replacingOccurrences(of: "{count}", with: String(count)) }

    static var errorGeneric: String { text("error.generic") }
    static var offlineTitle: String { text("offline.title") }
    static var offlineMessage: String { text("offline.message") }
    static var actionRetry: String { text("action.retry") }
    static var actionCancel: String { text("action.cancel") }
    static var actionOK: String { text("action.ok") }
    static var stateLoading: String { text("state.loading") }

    private static func text(_ key: String) -> String {
        NSLocalizedString(key, comment: "")
    }
}
