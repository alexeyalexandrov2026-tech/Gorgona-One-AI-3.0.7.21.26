import SwiftUI
import UIKit

@main
struct MiamiElioApp: App {
    @State private var services = AppServices()

    init() {
        Theme.applyAppearance()
    }

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environment(services.router)
                .environment(services.concierge)
                .environment(services.search)
                .tint(Theme.accent)
                .preferredColorScheme(.dark)
                .onOpenURL { services.router.handle(deepLink: $0) }
        }
    }
}
