import XCTest

/// Walks the four tabs the way a first-time guest would and keeps a
/// screenshot of each, so every CI run leaves a visual record of the app.
///
/// The web tabs load the live site, so nothing here asserts on web content -
/// only on the native shell. No message is sent to the concierge: the live
/// endpoint has a daily quota that tests must not spend.
final class MiamiElioUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(en)", "-AppleLocale", "en_US"]
        app.launch()
    }

    func testTheFourTabs() throws {
        let tabs = app.tabBars.firstMatch
        XCTAssertTrue(tabs.waitForExistence(timeout: 60), "The tab bar never appeared")
        XCTAssertEqual(tabs.buttons.count, 4)
        for title in ["Home", "Concierge", "Search", "Profile"] {
            XCTAssertTrue(tabs.buttons[title].exists, "Missing tab: \(title)")
        }

        // Home: the site itself. Give the first page time to arrive.
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
        Thread.sleep(forTimeInterval: 12)
        attach("1-home")

        // Concierge: the empty conversation offers ready-made prompts.
        tabs.buttons["Concierge"].tap()
        let title = app.staticTexts["concierge.title"]
        XCTAssertTrue(title.waitForExistence(timeout: 15))
        XCTAssertEqual(title.label, "Your private concierge")
        XCTAssertEqual(app.buttons.matching(identifier: "concierge.starter").count, 3)
        let input = app.descendants(matching: .any)["concierge.input"]
        XCTAssertTrue(input.exists)
        XCTAssertFalse(app.buttons["concierge.send"].isEnabled, "Send must be off while the draft is empty")
        input.tap()
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        input.typeText("A villa for six in Miami Beach")
        XCTAssertTrue(app.buttons["concierge.send"].isEnabled)
        attach("2-concierge")

        // Search: popular sections first, then live results.
        tabs.buttons["Search"].tap()
        let yachts = app.buttons["world./yachts"]
        XCTAssertTrue(yachts.waitForExistence(timeout: 15))
        XCTAssertEqual(yachts.label, "Yachts")
        XCTAssertEqual(app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'world./'")).count, 8)
        attach("3-search")

        let field = app.searchFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        field.tap()
        field.typeText("yacht")
        Thread.sleep(forTimeInterval: 8)
        attach("4-search-results")

        // Profile: the site's account page.
        tabs.buttons["Profile"].tap()
        Thread.sleep(forTimeInterval: 12)
        attach("5-profile")
    }

    func testOpeningASectionFromSearchReturnsToHome() throws {
        let tabs = app.tabBars.firstMatch
        XCTAssertTrue(tabs.waitForExistence(timeout: 60))

        tabs.buttons["Search"].tap()
        let yachts = app.buttons["world./yachts"]
        XCTAssertTrue(yachts.waitForExistence(timeout: 15))
        yachts.tap()

        let onHome = XCTNSPredicateExpectation(predicate: NSPredicate(format: "isSelected == true"), object: tabs.buttons["Home"])
        XCTAssertEqual(XCTWaiter.wait(for: [onHome], timeout: 10), .completed, "A section should open in the Home tab")
        Thread.sleep(forTimeInterval: 12)
        attach("6-yachts")
    }

    private func attach(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
