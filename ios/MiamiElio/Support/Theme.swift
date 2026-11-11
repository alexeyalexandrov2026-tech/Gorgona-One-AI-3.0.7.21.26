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
    /// A deep tint of the accent, for the guest's own messages.
    static let accentWash = Color(red: 0x3A / 255, green: 0x16 / 255, blue: 0x23 / 255)
    /// The gold of the app icon, for the concierge orb.
    static let gold = Color(red: 0xC9 / 255, green: 0xA4 / 255, blue: 0x5C / 255)
    static let goldLight = Color(red: 0xF3 / 255, green: 0xE2 / 255, blue: 0xB8 / 255)
    static let goldDeep = Color(red: 0x7A / 255, green: 0x5C / 255, blue: 0x24 / 255)

    static func applyAppearance() {
        let tabBar = UITabBarAppearance()
        tabBar.configureWithOpaqueBackground()
        tabBar.backgroundColor = paperUI
        tabBar.shadowColor = ruleUI
        let item = UITabBarItemAppearance()
        item.normal.iconColor = softUI
        item.normal.titleTextAttributes = [.font: AppFont.uiText(10.5, .medium), .foregroundColor: softUI]
        item.selected.iconColor = accentUI
        item.selected.titleTextAttributes = [.font: AppFont.uiText(10.5, .medium), .foregroundColor: accentUI]
        tabBar.stackedLayoutAppearance = item
        tabBar.inlineLayoutAppearance = item
        tabBar.compactInlineLayoutAppearance = item
        UITabBar.appearance().standardAppearance = tabBar
        UITabBar.appearance().scrollEdgeAppearance = tabBar
        UITabBar.appearance().unselectedItemTintColor = softUI

        let navigationBar = UINavigationBarAppearance()
        navigationBar.configureWithOpaqueBackground()
        navigationBar.backgroundColor = paperUI
        navigationBar.shadowColor = ruleUI
        navigationBar.titleTextAttributes = [.foregroundColor: inkUI, .font: AppFont.uiText(17, .semibold)]
        navigationBar.largeTitleTextAttributes = [.foregroundColor: inkUI]
        UINavigationBar.appearance().standardAppearance = navigationBar
        UINavigationBar.appearance().scrollEdgeAppearance = navigationBar
        UINavigationBar.appearance().compactAppearance = navigationBar

        UITextField.appearance(whenContainedInInstancesOf: [UISearchBar.self]).defaultTextAttributes = [
            .font: AppFont.uiText(17),
            .foregroundColor: inkUI
        ]
    }
}
