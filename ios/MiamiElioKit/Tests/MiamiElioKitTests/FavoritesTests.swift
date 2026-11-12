import XCTest
@testable import MiamiElioKit

final class FavoritesTests: XCTestCase {
    func testKeepsOnlyYachtsVillasCarsAndRestaurantsFromSearch() throws {
        let yacht = SearchResult(href: "/yachts/pershing-8x", title: "Pershing 8X", world: "yachts", location: "Miami Beach", image: "/images/y.jpg")
        let club = SearchResult(href: "/restaurants-nightlife/liv-miami", title: "LIV", world: "dining-nightlife", category: "nightlife")
        let tour = SearchResult(href: "/experiences/everglades", title: "Everglades", world: "experiences")
        let odd = SearchResult(href: "/yachts/Bad Slug", title: "Odd", world: "yachts")

        let kept = try XCTUnwrap(FavoriteRef(result: yacht))
        XCTAssertEqual(kept.key, "yacht:pershing-8x")
        XCTAssertEqual(kept.subtitle, "Miami Beach")
        XCTAssertEqual(FavoriteRef(result: club)?.kind, "nightlife")
        XCTAssertNil(FavoriteRef(result: tour))
        XCTAssertNil(FavoriteRef(result: odd))
        XCTAssertNil(FavoriteRef(kind: "car", slug: "x", title: "   "))
    }

    func testTheScriptCarriesTheChangeAsData() throws {
        let favorite = try XCTUnwrap(FavoriteRef(kind: "car", slug: "white-suv", title: "White \"SUV\" </script>"))
        let script = try XCTUnwrap(favorite.script(on: true))
        XCTAssertTrue(script.contains("window.__miamiFavorite"))
        XCTAssertTrue(script.contains(FavoriteRef.pendingKey))
        XCTAssertTrue(script.contains(#""on":true"#))
        // The title is JSON-escaped, never spliced into the code as text.
        XCTAssertFalse(script.contains(#"White "SUV""#))
    }

    func testReadsTheListAPageReports() {
        XCTAssertEqual(FavoriteRef.keys(from: ["yacht:a", "car:b", 7, "no-colon"]), ["yacht:a", "car:b"])
        XCTAssertEqual(FavoriteRef.keys(from: [Any]()), [])
        XCTAssertNil(FavoriteRef.keys(from: "yacht:a"))
        XCTAssertNil(FavoriteRef.keys(from: nil))
    }
}
