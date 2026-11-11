import SwiftUI

struct RootTabView: View {
    @Environment(AppRouter.self) private var router

    var body: some View {
        @Bindable var router = router

        TabView(selection: Binding(get: { router.selectedTab }, set: { router.select($0) })) {
            WebTab(model: router.explore)
                .tabItem { Label(L10n.tabHome, systemImage: "house.fill") }
                .tag(AppTab.explore)

            ConciergeView()
                .tabItem {
                    Label {
                        Text(L10n.tabConcierge)
                    } icon: {
                        // The concierge's own orb rather than a symbol: lit
                        // on its tab, muted while another one is showing.
                        // Drawn by `ios/scripts/render-tab-orb.py`.
                        Image(router.selectedTab == .concierge ? "TabOrbSelected" : "TabOrb")
                    }
                }
                .tag(AppTab.concierge)

            SearchView()
                .tabItem { Label(L10n.tabSearch, systemImage: "magnifyingglass") }
                .tag(AppTab.search)

            WebTab(model: router.account)
                .tabItem { Label(L10n.tabAccount, systemImage: "person.crop.circle.fill") }
                .tag(AppTab.account)
        }
        .sheet(item: $router.browserPage) { page in
            SafariView(url: page.url)
                .ignoresSafeArea()
        }
    }
}
