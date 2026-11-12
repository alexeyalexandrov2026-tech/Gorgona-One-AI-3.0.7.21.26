import SwiftUI

/// The tabs, kept under the splash until the first page has something to show.
struct AppRootView: View {
    @Environment(AppRouter.self) private var router
    @State private var showsSplash = true

    var body: some View {
        ZStack {
            RootTabView()

            if showsSplash {
                SplashView()
                    .transition(.opacity.combined(with: .scale(scale: 1.04)))
                    .zIndex(1)
            }
        }
        .task {
            // Long enough to be seen, and then only as long as the first page
            // needs - with a limit, so a slow connection is never held behind
            // it. The page goes on loading underneath either way.
            try? await Task.sleep(for: .seconds(1.2))
            #if DEBUG
            // The UI test that photographs the splash asks it to stay a
            // while: `-splashHold 20`. Release builds ignore the argument.
            let hold = UserDefaults.standard.double(forKey: "splashHold")
            if hold > 0 {
                try? await Task.sleep(for: .seconds(hold))
            }
            #endif
            let patience = ContinuousClock.now.advanced(by: .seconds(1.6))
            while !router.explore.hasSettled, ContinuousClock.now < patience {
                try? await Task.sleep(for: .milliseconds(80))
            }
            withAnimation(.easeInOut(duration: 0.45)) {
                showsSplash = false
            }
        }
    }
}

/// The moment between the launch colour and the first page: the concierge's
/// orb and the name on the same dark ground, so the app lights up instead of
/// cutting in from a blank screen.
struct SplashView: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var orbLit = false
    @State private var nameLit = false

    var body: some View {
        ZStack {
            Theme.paper

            // A faint warmth on the wall behind the orb.
            RadialGradient(
                colors: [Theme.gold.opacity(0.18), Theme.gold.opacity(0)],
                center: .center,
                startRadius: 0,
                endRadius: 300
            )
            .opacity(orbLit ? 1 : 0)

            VStack(spacing: 36) {
                ConciergeMark(diameter: 96, breathes: true)
                    .scaleEffect(orbLit || reduceMotion ? 1 : 0.8)
                    .opacity(orbLit ? 1 : 0)

                Wordmark(size: 44)
                    .opacity(nameLit ? 1 : 0)
                    .offset(y: nameLit || reduceMotion ? 0 : 12)
            }
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.easeOut(duration: 0.7)) {
                orbLit = true
            }
            withAnimation(.easeOut(duration: 0.6).delay(0.25)) {
                nameLit = true
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: "Miami Elio"))
        .accessibilityIdentifier("splash")
    }
}
