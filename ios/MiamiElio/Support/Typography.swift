import CoreText
import SwiftUI
import UIKit
import MiamiElioKit

/// The website's typefaces, so the native screens read as the same product
/// as the pages beside them. Headings and text are both set in Jost, as on
/// the site's home page: one geometric family, with headings large, medium
/// weight and tightly tracked. Bodoni Moda and DM Mono appear only in the
/// "MIAMI Elio" wordmark. The files are in `Resources/Fonts`, under the SIL
/// Open Font License that sits next to them.
///
/// Jost does not cover every script the app is translated into, and a line
/// set half in Jost and half in a substitute face looks broken. So it is
/// used only for languages it can set completely; every other language gets
/// the system sans, which covers all of them.
enum AppFont {
    enum Weight {
        case regular
        case medium
        case semibold
    }

    private enum Face {
        static let wordmark = "BodoniModa28pt-Medium"
        static let text = "Jost-Regular"
        static let textMedium = "Jost-Medium"
        static let textSemibold = "Jost-SemiBold"
        static let mono = "DMMono-Medium"

        /// File names are the same, plus ".ttf".
        static let all = [wordmark, text, textMedium, textSemibold, mono]
    }

    /// The language the app's own strings are showing in.
    private static let language = SiteLocale.normalize(Bundle.main.preferredLocalizations.first ?? "") ?? SiteLocale.fallback
    /// Jost sets the Latin-script languages and Russian. Its Cyrillic lacks
    /// the Ukrainian letters.
    private static let setsText = ["en", "es", "pt", "de", "tr", "it", "fr", "pl", "ru"].contains(language)

    // MARK: - Setup

    /// Makes the bundled fonts available. Called first thing at launch,
    /// before any bar or view asks for one. Debug builds stop here if a file
    /// is missing or misnamed, so the mistake fails CI instead of showing up
    /// as quietly wrong type on someone's phone.
    static func registerBundledFonts() {
        for name in Face.all {
            guard let url = Bundle.main.url(forResource: name, withExtension: "ttf") else {
                assertionFailure("Font file \(name).ttf is not in the app bundle.")
                continue
            }
            var failure: Unmanaged<CFError>?
            let registered = CTFontManagerRegisterFontsForURL(url as CFURL, .process, &failure)
            let reason = failure?.takeRetainedValue()
            assert(registered, "Could not register \(name): \(String(describing: reason))")
            assert(UIFont(name: name, size: 12) != nil, "\(name).ttf does not contain a font named \(name).")
        }
    }

    // MARK: - Families

    /// Headings: the text family at medium weight. Pair with `headingTracking`.
    static func display(_ size: CGFloat, relativeTo style: Font.TextStyle = .title) -> Font {
        text(size, .medium, relativeTo: style)
    }

    /// How far to pull a heading's letters together, as the site does
    /// (`letter-spacing: -0.03em`): `Text(...).tracking(AppFont.headingTracking(36))`.
    static func headingTracking(_ size: CGFloat) -> CGFloat {
        -0.03 * size
    }

    /// Everything that is read rather than looked at.
    static func text(_ size: CGFloat, _ weight: Weight = .regular, relativeTo style: Font.TextStyle = .body) -> Font {
        if setsText {
            return .custom(face(for: weight), size: size, relativeTo: style)
        }
        return system(size, weight: systemWeight(for: weight), relativeTo: style)
    }

    /// Latin letters and figures only.
    static func mono(_ size: CGFloat, relativeTo style: Font.TextStyle = .caption) -> Font {
        .custom(Face.mono, size: size, relativeTo: style)
    }

    /// The brand name is always written in Latin letters, so always in Bodoni.
    static func wordmark(_ size: CGFloat) -> Font {
        .custom(Face.wordmark, size: size, relativeTo: .title2)
    }

    /// The text family for UIKit-drawn chrome: tab bar, navigation bar, search field.
    static func uiText(_ size: CGFloat, _ weight: Weight = .regular) -> UIFont {
        if setsText, let font = UIFont(name: face(for: weight), size: size) {
            return font
        }
        return .systemFont(ofSize: size, weight: systemWeight(for: weight))
    }

    // MARK: - Roles

    static let heroSize: CGFloat = 36
    static let titleSize: CGFloat = 27
    static let cardTitleSize: CGFloat = 20

    static var hero: Font { display(heroSize, relativeTo: .largeTitle) }
    static var title: Font { display(titleSize, relativeTo: .title) }
    static var cardTitle: Font { display(cardTitleSize, relativeTo: .title3) }
    /// A suggested request, or a row's name in a list.
    static var rowTitle: Font { text(18, .medium, relativeTo: .headline) }
    static var body: Font { text(17) }
    static var bodyMedium: Font { text(17, .medium) }
    static var detail: Font { text(15, relativeTo: .subheadline) }
    static var detailMedium: Font { text(15, .medium, relativeTo: .subheadline) }
    static var button: Font { text(16, .semibold, relativeTo: .callout) }
    static var eyebrow: Font { text(12, .medium, relativeTo: .caption) }

    // MARK: - Helpers

    private static func face(for weight: Weight) -> String {
        switch weight {
        case .regular: return Face.text
        case .medium: return Face.textMedium
        case .semibold: return Face.textSemibold
        }
    }

    private static func systemWeight(for weight: Weight) -> UIFont.Weight {
        switch weight {
        case .regular: return .regular
        case .medium: return .medium
        case .semibold: return .semibold
        }
    }

    /// A system font at an exact size that still follows the reader's text
    /// size setting, as the custom fonts do.
    private static func system(_ size: CGFloat, weight: UIFont.Weight, relativeTo style: Font.TextStyle) -> Font {
        let scaled = UIFontMetrics(forTextStyle: uiKitStyle(for: style)).scaledFont(for: .systemFont(ofSize: size, weight: weight))
        return Font(scaled as CTFont)
    }

    private static func uiKitStyle(for style: Font.TextStyle) -> UIFont.TextStyle {
        switch style {
        case .largeTitle: return .largeTitle
        case .title: return .title1
        case .title2: return .title2
        case .title3: return .title3
        case .headline: return .headline
        case .subheadline: return .subheadline
        case .callout: return .callout
        case .footnote: return .footnote
        case .caption: return .caption1
        case .caption2: return .caption2
        default: return .body
        }
    }
}

extension View {
    /// The small, widely spaced capitals the site sets above its headings.
    func eyebrow(_ color: Color = Theme.soft) -> some View {
        font(AppFont.eyebrow)
            .textCase(.uppercase)
            .kerning(2.2)
            .foregroundStyle(color)
    }
}
