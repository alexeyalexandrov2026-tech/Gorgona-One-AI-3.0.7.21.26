import Foundation
import MiamiElioKit

/// Builds the app's long-lived objects once and wires them together.
@MainActor
final class AppServices {
    let router: AppRouter
    let concierge: ConciergeStore
    let search: SearchStore
    let favorites: FavoritesStore
    let season: SeasonStore

    init(config: AppConfig = .production) {
        let policy = RoutePolicy(config: config)
        let deviceLocale = SiteLocale.resolve(preferred: Locale.preferredLanguages)

        let explore = WebViewModel(config: config, policy: policy, startPath: "/", deviceLocale: deviceLocale)
        let account = WebViewModel(config: config, policy: policy, startPath: "/profile", deviceLocale: deviceLocale)
        let router = AppRouter(config: config, policy: policy, explore: explore, account: account)

        self.router = router
        let concierge = ConciergeStore(
            client: ConciergeClient(config: config, policy: policy),
            planClient: PlanClient(config: config),
            // Answer in whatever language the guest last chose on the site.
            locale: { explore.currentSiteLocale() }
        )
        self.concierge = concierge
        self.search = SearchStore(client: SearchClient(config: config, policy: policy))

        // A tapped season reminder opens the concierge with the week's
        // request ready in the composer, for the guest to send or change.
        let season = SeasonStore()
        season.opener.open = { [weak router, weak concierge, weak season] id in
            guard let router, let concierge, let event = season?.event(id: id) else { return }
            router.selectedTab = .concierge
            concierge.prepare(L10n.seasonAsk(name: event.name, dates: Season.range(event)))
        }
        self.season = season

        // Both web views share one storage; either may report the list.
        let favorites = FavoritesStore(page: explore)
        explore.onFavorites = { [weak favorites] keys, source in favorites?.received(keys, from: source) }
        account.onFavorites = { [weak favorites] keys, source in favorites?.received(keys, from: source) }
        self.favorites = favorites
    }
}
