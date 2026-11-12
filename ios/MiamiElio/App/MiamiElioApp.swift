import SwiftUI
import UIKit

@main
struct MiamiElioApp: App {
    @State private var services = AppServices()

    init() {
        // Fonts first: the bar appearance below already asks for them.
        AppFont.registerBundledFonts()
        Theme.applyAppearance()
    }

    var body: some Scene {
        WindowGroup {
            AppRootView()
                .environment(services.router)
                .environment(services.concierge)
                .environment(services.search)
                .environment(services.favorites)
                .environment(services.season)
                .font(AppFont.body)
                .tint(Theme.accent)
                .preferredColorScheme(.dark)
                .onOpenURL { services.router.handle(deepLink: $0) }
        }
    }
}
