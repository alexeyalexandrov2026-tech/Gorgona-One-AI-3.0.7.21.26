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
