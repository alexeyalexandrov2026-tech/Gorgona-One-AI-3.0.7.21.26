import XCTest
@testable import MiamiElioKit

final class SiteLocaleTests: XCTestCase {
    func testMatchesTheLanguagesTheSiteShips() {
        // Same codes, same order as SUPPORTED_LANGUAGES in lib/languages.js.
        XCTAssertEqual(SiteLocale.supported, [
            "en", "ru", "es", "he", "zh", "pt", "uk", "ja",
            "ko", "de", "ar", "tr", "fa", "it", "fr", "pl"
        ])
        XCTAssertEqual(SiteLocale.rightToLeft, ["he", "ar", "fa"])
        XCTAssertEqual(SiteLocale.storageKey, "gorgona-locale")
    }

    func testNormalizesDeviceIdentifiers() {
        XCTAssertEqual(SiteLocale.normalize("ru-RU"), "ru")
        XCTAssertEqual(SiteLocale.normalize("en_US"), "en")
        XCTAssertEqual(SiteLocale.normalize("zh-Hans-CN"), "zh")
        XCTAssertEqual(SiteLocale.normalize("zh-Hant-TW"), "zh")
        XCTAssertEqual(SiteLocale.normalize("pt-BR"), "pt")
        XCTAssertEqual(SiteLocale.normalize("he-IL"), "he")
        XCTAssertEqual(SiteLocale.normalize("iw"), "he")
        XCTAssertEqual(SiteLocale.normalize("FA"), "fa")
        XCTAssertNil(SiteLocale.normalize("sv-SE"))
        XCTAssertNil(SiteLocale.normalize(""))
    }

    func testPicksTheFirstPreferredLanguageTheSiteHas() {
        XCTAssertEqual(SiteLocale.resolve(preferred: ["sv-SE", "uk-UA", "en-US"]), "uk")
        XCTAssertEqual(SiteLocale.resolve(preferred: ["es-419"]), "es")
        XCTAssertEqual(SiteLocale.resolve(preferred: ["sv-SE", "fi-FI"]), "en")
        XCTAssertEqual(SiteLocale.resolve(preferred: []), "en")
    }

    func testKnowsWritingDirection() {
        XCTAssertTrue(SiteLocale.isRightToLeft("ar"))
        XCTAssertTrue(SiteLocale.isRightToLeft("he"))
        XCTAssertFalse(SiteLocale.isRightToLeft("ru"))
    }
}
