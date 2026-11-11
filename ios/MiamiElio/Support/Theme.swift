import SwiftUI
import UIKit

/// The site's dark palette (`app/design-system.css`, `[data-theme="dark"]`),
/// so native screens and web pages read as one product.
enum Theme {
    static let paperUI = UIColor(red: 0x0A / 255, green: 0x12 / 255, blue: 0x18 / 255, alpha: 1)
    static let cardUI = UIColor(red: 0x11 / 255, green: 0x1D / 255, blue: 0x25 / 255, alpha: 1)
    static let inkUI = UIColor(red: 0xED / 255, green: 0xF2 / 255, blue: 0xF3 / 255, alpha: 1)
    static let softUI = UIColor(red: 0x9A / 255, green: 0xAA / 255, blue: 0xB2 / 255, alpha: 1)
    static let ruleUI = UIColor(red: 0x22 / 255, green: 0x32 / 255, blue: 0x3C / 255, alpha: 1)
    static let accentUI = UIColor(red: 0xFF / 255, green: 0x6E / 255, blue: 0x93 / 255, alpha: 1)

    static let paper = Color(uiColor: paperUI)
    static let card = Color(uiColor: cardUI)
    static let ink = Color(uiColor: inkUI)
    static let soft = Color(uiColor: softUI)
    static let rule = Color(uiColor: ruleUI)
    static let accent = Color(uiColor: accentUI)
    /// Text on an accent-coloured surface.
    static let onAccent = Color(uiColor: paperUI)
    /// The gold of the app icon, for the concierge mark.
    static let gold = Color(red: 0xC9 / 255, green: 0xA4 / 255, blue: 0x5C / 255)

    static func applyAppearance() {
        let tabBar = UITabBarAppearance()
        tabBar.configureWithOpaqueBackground()
        tabBar.backgroundColor = paperUI
        tabBar.shadowColor = ruleUI
        UITabBar.appearance().standardAppearance = tabBar
        UITabBar.appearance().scrollEdgeAppearance = tabBar
        UITabBar.appearance().unselectedItemTintColor = softUI

        let navigationBar = UINavigationBarAppearance()
        navigationBar.configureWithOpaqueBackground()
        navigationBar.backgroundColor = paperUI
        navigationBar.shadowColor = ruleUI
        navigationBar.titleTextAttributes = [.foregroundColor: inkUI]
        navigationBar.largeTitleTextAttributes = [.foregroundColor: inkUI]
        UINavigationBar.appearance().standardAppearance = navigationBar
        UINavigationBar.appearance().scrollEdgeAppearance = navigationBar
        UINavigationBar.appearance().compactAppearance = navigationBar
    }
}
