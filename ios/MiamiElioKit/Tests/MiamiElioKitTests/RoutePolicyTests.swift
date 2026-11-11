import XCTest
@testable import MiamiElioKit

final class RoutePolicyTests: XCTestCase {
    private let policy = RoutePolicy()

    private func decide(_ string: String) -> RouteDecision {
        guard let url = URL(string: string) else {
            XCTFail("Not a URL: \(string)")
            return .ignored
        }
        return policy.decide(url)
    }

    func testSitePagesStayInTheApp() {
        for page in [
            "https://gorgona-one.com/",
            "https://gorgona-one.com/yachts",
            "https://gorgona-one.com/rentals/lamborghini-urus-se",
            "https://gorgona-one.com/vacation-rentals",
            "https://gorgona-one.com/restaurants-nightlife",
            "https://gorgona-one.com/events?category=concerts",
            "https://gorgona-one.com/stores/fashion",
            "https://gorgona-one.com/profile",
            "https://gorgona-one.com/login",
            "https://www.gorgona-one.com/travel",
            "https://GORGONA-ONE.com/experiences"
        ] {
            XCTAssertEqual(decide(page), .web, page)
        }
    }

    func testSportsbookSectionsAreNotCarried() {
        for page in [
            "https://gorgona-one.com/sportsbook",
            "https://gorgona-one.com/sportsbook/",
            "https://gorgona-one.com/sportsbook/fanduel",
            "https://gorgona-one.com/SportsBook/DraftKings",
            "https://gorgona-one.com/sports-betting-promos",
            "https://gorgona-one.com/betmgm-promos",
            "https://gorgona-one.com/caesars-sportsbook-promos",
            "https://gorgona-one.com/draftkings-promos",
            "https://gorgona-one.com/fanduel-promos",
            "https://gorgona-one.com/stores/betting",
            "https://www.gorgona-one.com/sportsbook?ref=home"
        ] {
            XCTAssertEqual(decide(page), .restricted, page)
        }
    }

    func testRestrictionMatchesWholePathSegments() {
        // Neighbours that merely start with the same letters are ordinary pages.
        XCTAssertEqual(decide("https://gorgona-one.com/sportsbooks-explained"), .web)
        XCTAssertEqual(decide("https://gorgona-one.com/stores/betting-shops"), .web)
        XCTAssertEqual(decide("https://gorgona-one.com/events/sportsbook"), .web)
    }

    func testOtherSitesOpenInTheBrowserSheet() {
        XCTAssertEqual(decide("https://www.ticketnetwork.com/tickets/123"), .browser)
        XCTAssertEqual(decide("http://example.com/"), .browser)
        // Look-alike hosts are not the site.
        XCTAssertEqual(decide("https://gorgona-one.com.example.net/yachts"), .browser)
        XCTAssertEqual(decide("https://notgorgona-one.com/yachts"), .browser)
        XCTAssertEqual(decide("https://shop.gorgona-one.com/"), .browser)
    }

    func testLinksOwnedByOtherAppsGoToTheSystem() {
        XCTAssertEqual(decide("tel:18004262537"), .system)
        XCTAssertEqual(decide("mailto:hello@example.com"), .system)
        XCTAssertEqual(decide("sms:+13055550100"), .system)
        XCTAssertEqual(decide("whatsapp://send?phone=13055550100"), .system)
        XCTAssertEqual(decide("https://wa.me/13055550100"), .system)
        XCTAssertEqual(decide("https://maps.apple.com/?q=Miami"), .system)
    }

    func testPageScratchDocumentsAreAllowedAndUnsafeSchemesIgnored() {
        XCTAssertEqual(decide("about:blank"), .web)
        XCTAssertEqual(decide("blob:https://gorgona-one.com/5f0c"), .web)
        XCTAssertEqual(decide("javascript:void(0)"), .ignored)
        XCTAssertEqual(decide("file:///etc/hosts"), .ignored)
    }

    func testReferencesFromTheAPIAreFiltered() {
        XCTAssertTrue(policy.allowsInApp(reference: "/yachts"))
        XCTAssertTrue(policy.allowsInApp(reference: "/rentals/bmw-x5-white-brown"))
        XCTAssertTrue(policy.allowsInApp(reference: "https://gorgona-one.com/events"))
        XCTAssertFalse(policy.allowsInApp(reference: "/sportsbook"))
        XCTAssertFalse(policy.allowsInApp(reference: "/sportsbook/betmgm"))
        XCTAssertFalse(policy.allowsInApp(reference: "https://example.com/"))
        XCTAssertFalse(policy.allowsInApp(reference: "//example.com/yachts"))
        XCTAssertFalse(policy.allowsInApp(reference: "yachts"))
        XCTAssertFalse(policy.allowsInApp(reference: ""))
        XCTAssertFalse(policy.allowsInApp(reference: "javascript:alert(1)"))
    }
}

final class AppConfigTests: XCTestCase {
    private let config = AppConfig.production

    func testResolvesSiteRelativeReferences() {
        XCTAssertEqual(config.resolve("/yachts/azimut-55")?.absoluteString, "https://gorgona-one.com/yachts/azimut-55")
        XCTAssertEqual(config.resolve("  /images/rentals/x/cover.jpg ")?.absoluteString, "https://gorgona-one.com/images/rentals/x/cover.jpg")
        XCTAssertEqual(config.resolve("/events?category=concerts")?.absoluteString, "https://gorgona-one.com/events?category=concerts")
    }

    func testPassesAbsoluteWebAddressesThrough() {
        XCTAssertEqual(config.resolve("https://cdn.example.com/a.jpg")?.absoluteString, "https://cdn.example.com/a.jpg")
    }

    func testRejectsEverythingElse() {
        XCTAssertNil(config.resolve(""))
        XCTAssertNil(config.resolve("   "))
        XCTAssertNil(config.resolve("//example.com/a.jpg"))
        XCTAssertNil(config.resolve("images/a.jpg"))
        XCTAssertNil(config.resolve("javascript:alert(1)"))
        XCTAssertNil(config.resolve("tel:18004262537"))
    }

    func testKnowsItsOwnHosts() {
        XCTAssertEqual(config.internalHosts, ["gorgona-one.com", "www.gorgona-one.com"])
        XCTAssertEqual(config.cookieHost, "gorgona-one.com")
    }
}
