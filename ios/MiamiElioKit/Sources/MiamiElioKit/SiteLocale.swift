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

    /// The language a spoken request is heard in, with its region: "ru" ->
    /// "ru-RU". The same table as `SPEECH_LOCALES` in `lib/ai/locale.js`,
    /// so the microphone on the site and in the app understand the same
    /// accent; a test on the site keeps the two equal.
    public static let speechLocales: [String: String] = [
        "en": "en-US", "ru": "ru-RU", "es": "es-ES", "he": "he-IL",
        "zh": "zh-CN", "pt": "pt-BR", "uk": "uk-UA", "ja": "ja-JP",
        "ko": "ko-KR", "de": "de-DE", "ar": "ar-SA", "tr": "tr-TR",
        "fa": "fa-IR", "it": "it-IT", "fr": "fr-FR", "pl": "pl-PL"
    ]

    public static func speechLocale(_ code: String) -> String {
        speechLocales[normalize(code) ?? fallback] ?? "en-US"
    }
}

/// How loud the guest is speaking, for the orb that listens.
public enum VoiceLevel {
    /// The loudness of a stretch of microphone audio - the root mean square
    /// of its samples, which run from -1 to 1 - as 0...1: a quiet room
    /// (-50 dB and below) is 0, a voice close to the phone (-10 dB) is 1.
    public static func normalized(rms: Float) -> Double {
        guard rms.isFinite, rms > 0 else { return 0 }
        let decibels = 20 * log10(Double(rms))
        return min(max((decibels + 50) / 40, 0), 1)
    }
}
