import Foundation

/// The languages the website speaks, and how an iPhone's language maps onto
/// them. Mirrors `lib/languages.js`; a test pins the list so the two cannot
/// drift apart unnoticed.
public enum SiteLocale {
    public static let supported = [
        "en", "ru", "es", "he", "zh", "pt", "uk", "ja",
        "ko", "de", "ar", "tr", "fa", "it", "fr", "pl"
    ]
    public static let rightToLeft: Set<String> = ["he", "ar", "fa"]
    public static let fallback = "en"

    /// Name of both the cookie and the localStorage key the site reads.
    public static let storageKey = "gorgona-locale"

    /// "ru-RU" -> "ru", "zh-Hans-CN" -> "zh", "iw" -> "he"; nil when the site
    /// has no such language.
    public static func normalize(_ identifier: String) -> String? {
        let cleaned = identifier.lowercased().replacingOccurrences(of: "_", with: "-")
        guard let primary = cleaned.split(separator: "-").first.map(String.init) else { return nil }
        // Hebrew is still reported under its retired code on some systems.
        let code = primary == "iw" ? "he" : primary
        return supported.contains(code) ? code : nil
    }

    /// First of the guest's preferred languages the site supports.
    public static func resolve(preferred: [String]) -> String {
        for identifier in preferred {
            if let code = normalize(identifier) {
                return code
            }
        }
        return fallback
    }

    public static func isRightToLeft(_ code: String) -> Bool {
        rightToLeft.contains(code)
    }
}
