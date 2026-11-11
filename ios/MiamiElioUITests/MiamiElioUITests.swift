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
        let tabs = waitForTheAppToOpen()
        XCTAssertEqual(tabs.buttons.count, 4)
        for title in ["Home", "Concierge", "Search", "My Miami"] {
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
        // The prompts arrive one after another, a moment behind the title.
        waitForCount(3, of: app.buttons.matching(identifier: "concierge.starter"))
        let input = app.descendants(matching: .any)["concierge.input"]
        XCTAssertTrue(input.exists)
        XCTAssertFalse(app.buttons["concierge.send"].isEnabled, "Send must be off while the draft is empty")
        input.tap()
        _ = app.keyboards.firstMatch.waitForExistence(timeout: 5)
        input.typeText("A villa for six in Miami Beach")
        XCTAssertTrue(app.buttons["concierge.send"].isEnabled)
        attach("2-concierge-typing")

        // The keyboard covers the tab bar; a tap on the conversation puts it away.
        title.tap()
        let keyboardGone = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.keyboards.firstMatch)
        XCTAssertEqual(XCTWaiter.wait(for: [keyboardGone], timeout: 10), .completed, "The keyboard stayed up")
        assertStackedWithoutOverlap(app.buttons.matching(identifier: "concierge.starter").allElementsBoundByIndex.map(\.frame))
        attach("2-concierge")

        // Search: popular sections first, then live results.
        tabs.buttons["Search"].tap()
        let yachts = app.buttons["world./yachts"]
        XCTAssertTrue(yachts.waitForExistence(timeout: 15))
        XCTAssertEqual(yachts.label, "Yachts")
        let tileQuery = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH 'world./'"))
        waitForCount(8, of: tileQuery)
        // Measure the pictures where they come to rest, not on their way in.
        Thread.sleep(forTimeInterval: 1.5)
        let tiles = tileQuery.allElementsBoundByIndex
        assertTilesAreLaidOut(tiles.map(\.frame), in: app.windows.firstMatch.frame)
        attach("3-search")
        app.swipeUp()
        attach("3-search-more")
        app.swipeDown()

        let field = app.searchFields.firstMatch
        XCTAssertTrue(field.waitForExistence(timeout: 10))
        field.tap()
        // Return submits the search and puts the keyboard away, uncovering the tab bar.
        field.typeText("yacht\n")
        let searchKeyboardGone = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: app.keyboards.firstMatch)
        XCTAssertEqual(XCTWaiter.wait(for: [searchKeyboardGone], timeout: 10), .completed, "The keyboard stayed up")
        Thread.sleep(forTimeInterval: 8)
        attach("4-search-results")

        // Profile: the site's account page.
        tabs.buttons["My Miami"].tap()
        Thread.sleep(forTimeInterval: 12)
        attach("5-profile")
    }

    func testOpeningASectionFromSearchReturnsToHome() throws {
        let tabs = waitForTheAppToOpen()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))

        tabs.buttons["Search"].tap()
        let yachts = app.buttons["world./yachts"]
        if !yachts.waitForExistence(timeout: 10) {
            // This is the first test to run, on a simulator that has only just
            // booted, and there the tap on the tab has gone astray before.
            // Keep a picture of what was on screen instead, then tap again.
            attach("0-search-tab-missed")
            tabs.buttons["Search"].tap()
        }
        XCTAssertTrue(yachts.waitForExistence(timeout: 15), "The Search tab never showed its sections")
        yachts.tap()

        let onHome = XCTNSPredicateExpectation(predicate: NSPredicate(format: "isSelected == true"), object: tabs.buttons["Home"])
        XCTAssertEqual(XCTWaiter.wait(for: [onHome], timeout: 10), .completed, "A section should open in the Home tab")
        Thread.sleep(forTimeInterval: 12)
        attach("6-yachts")
    }

    func testSplashShowsTheBrandThenLifts() throws {
        // Normally the splash is gone within three seconds, sooner than a
        // test can look at it; ask this launch to hold it.
        app.launchArguments += ["-splashHold", "20"]
        app.launch()

        let splash = app.descendants(matching: .any)["splash"]
        XCTAssertTrue(splash.waitForExistence(timeout: 20), "The app did not open on its splash")
        XCTAssertEqual(splash.label, "Miami Elio")
        attach("0-splash")

        let lifted = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: splash)
        XCTAssertEqual(XCTWaiter.wait(for: [lifted], timeout: 45), .completed, "The splash never lifted")
        XCTAssertTrue(app.tabBars.firstMatch.exists)
    }

    /// The app opens under a brief splash; nothing can be tapped until it lifts.
    private func waitForTheAppToOpen(file: StaticString = #filePath, line: UInt = #line) -> XCUIElement {
        let tabs = app.tabBars.firstMatch
        XCTAssertTrue(tabs.waitForExistence(timeout: 60), "The tab bar never appeared", file: file, line: line)
        let splash = app.descendants(matching: .any)["splash"]
        let lifted = XCTNSPredicateExpectation(predicate: NSPredicate(format: "exists == false"), object: splash)
        XCTAssertEqual(XCTWaiter.wait(for: [lifted], timeout: 20), .completed, "The splash never lifted", file: file, line: line)
        return tabs
    }

    private func waitForCount(_ count: Int, of query: XCUIElementQuery, file: StaticString = #filePath, line: UInt = #line) {
        let reached = XCTNSPredicateExpectation(predicate: NSPredicate(format: "count == %d", count), object: query)
        XCTAssertEqual(XCTWaiter.wait(for: [reached], timeout: 10), .completed, "Expected \(count) elements, found \(query.count)", file: file, line: line)
    }

    /// Picture tiles: each a real size, none on top of another, all inside
    /// the screen's width. Catches a layout that collapses or piles up.
    private func assertTilesAreLaidOut(_ frames: [CGRect], in window: CGRect, file: StaticString = #filePath, line: UInt = #line) {
        for frame in frames {
            XCTAssertGreaterThan(frame.width, 120, "A tile is too narrow: \(frame)", file: file, line: line)
            XCTAssertGreaterThan(frame.height, 120, "A tile is too short: \(frame)", file: file, line: line)
            XCTAssertGreaterThanOrEqual(frame.minX, window.minX, "A tile runs off the left edge: \(frame)", file: file, line: line)
            XCTAssertLessThanOrEqual(frame.maxX, window.maxX, "A tile runs off the right edge: \(frame)", file: file, line: line)
        }
        for (index, first) in frames.enumerated() {
            for second in frames.dropFirst(index + 1) {
                XCTAssertFalse(first.insetBy(dx: 1, dy: 1).intersects(second), "Tiles overlap: \(first) and \(second)", file: file, line: line)
            }
        }
        // The lead picture spans the page; the pairs sit side by side.
        let widest = frames.map(\.width).max() ?? 0
        XCTAssertGreaterThan(widest, window.width * 0.8, file: file, line: line)
        XCTAssertEqual(frames.filter { $0.width < window.width * 0.6 }.count, 6, "Expected three pairs of half-width tiles", file: file, line: line)
    }

    /// Rows listed one under another.
    private func assertStackedWithoutOverlap(_ frames: [CGRect], file: StaticString = #filePath, line: UInt = #line) {
        for (upper, lower) in zip(frames, frames.dropFirst()) {
            XCTAssertGreaterThan(upper.height, 30, file: file, line: line)
            XCTAssertLessThanOrEqual(upper.maxY, lower.minY + 1, "Rows overlap: \(upper) and \(lower)", file: file, line: line)
        }
    }

    private func attach(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
