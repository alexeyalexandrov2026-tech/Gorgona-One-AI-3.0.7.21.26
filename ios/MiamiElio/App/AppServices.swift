import Foundation
import MiamiElioKit

/// Builds the app's long-lived objects once and wires them together.
@MainActor
final class AppServices {
    let router: AppRouter
    let concierge: ConciergeStore
    let search: SearchStore
    let favorites: FavoritesStore

    init(config: AppConfig = .production) {
        let policy = RoutePolicy(config: config)
        let deviceLocale = SiteLocale.resolve(preferred: Locale.preferredLanguages)

        let explore = WebViewModel(config: config, policy: policy, startPath: "/", deviceLocale: deviceLocale)
        let account = WebViewModel(config: config, policy: policy, startPath: "/profile", deviceLocale: deviceLocale)
        let router = AppRouter(config: config, policy: policy, explore: explore, account: account)

        self.router = router
        self.concierge = ConciergeStore(
            client: ConciergeClient(config: config, policy: policy),
            planClient: PlanClient(config: config),
            // Answer in whatever language the guest last chose on the site.
            locale: { explore.currentSiteLocale() }
        )
        self.search = SearchStore(client: SearchClient(config: config, policy: policy))

        // Both web views share one storage; either may report the list.
        let favorites = FavoritesStore(page: explore)
        explore.onFavorites = { [weak favorites] keys, source in favorites?.received(keys, from: source) }
        account.onFavorites = { [weak favorites] keys, source in favorites?.received(keys, from: source) }
        self.favorites = favorites
    }
}
