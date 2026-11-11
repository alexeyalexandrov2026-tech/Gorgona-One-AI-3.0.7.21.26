import XCTest
@testable import MiamiElioKit

final class SearchAPITests: XCTestCase {
    func testBuildsTheSearchRequest() throws {
        let client = SearchClient(transport: MockTransport())
        let request = try client.makeRequest(query: "  urus & co  ", limit: 500)

        let components = try XCTUnwrap(URLComponents(url: try XCTUnwrap(request.url), resolvingAgainstBaseURL: false))
        XCTAssertEqual(components.host, "gorgona-one.com")
        XCTAssertEqual(components.path, "/api/search")
        XCTAssertEqual(components.queryItems?.first { $0.name == "q" }?.value, "urus & co")
        XCTAssertEqual(components.queryItems?.first { $0.name == "limit" }?.value, "20")
        XCTAssertEqual(request.httpMethod, "GET")
        // The ampersand must travel as data, not as a second parameter.
        XCTAssertFalse(try XCTUnwrap(request.url?.absoluteString).contains("& co"))
    }

    func testShortQueriesNeverReachTheNetwork() async throws {
        let transport = MockTransport()
        let client = SearchClient(transport: transport)

        let none = try await client.search(" a ")
        XCTAssertEqual(none, [])
        XCTAssertEqual(transport.requests.count, 0)
        XCTAssertThrowsError(try client.makeRequest(query: "a"))
    }

    func testTrimsOverlongQueries() {
        let long = String(repeating: "y", count: 200)
        XCTAssertEqual(SearchClient.normalize(query: long).count, SearchClient.maximumQueryLength)
    }

    func testReadsResults() async throws {
        let transport = MockTransport(json: """
        {
          "query": "urus",
          "results": [
            {
              "world": "car-rentals", "slug": "lamborghini-urus-se", "title": "Lamborghini Urus SE",
              "subtitle": "MIAMI ELIO Fleet", "category": "SUVs", "location": "Sunny Isles Beach",
              "description": "Hybrid super SUV.", "price": "On request",
              "image": "/images/rentals/lamborghini-urus-se/cover.jpg", "featured": true,
              "href": "/rentals/lamborghini-urus-se"
            },
            {
              "world": "dining-nightlife", "slug": "papi-steak", "title": "Papi Steak",
              "subtitle": null, "category": "Steakhouse", "location": "Miami Beach",
              "description": null, "price": null, "image": "https://cdn.example.com/papi.jpg", "featured": false,
              "href": "/restaurants-nightlife/papi-steak"
            },
            {"title": "No link"},
            {"world": "x", "title": "Elsewhere", "href": "https://example.com/elsewhere"}
          ]
        }
        """)
        let client = SearchClient(transport: transport)

        let results = try await client.search("urus")

        XCTAssertEqual(results.count, 2)
        let car = results[0]
        XCTAssertEqual(car.title, "Lamborghini Urus SE")
        XCTAssertEqual(car.href, "/rentals/lamborghini-urus-se")
        XCTAssertEqual(car.price, "On request")
        XCTAssertEqual(car.detailLine, "MIAMI ELIO Fleet · Sunny Isles Beach")
        XCTAssertEqual(client.imageURL(for: car)?.absoluteString, "https://gorgona-one.com/images/rentals/lamborghini-urus-se/cover.jpg")

        let venue = results[1]
        XCTAssertNil(venue.price)
        XCTAssertEqual(venue.detailLine, "Steakhouse · Miami Beach")
        XCTAssertEqual(client.imageURL(for: venue)?.absoluteString, "https://cdn.example.com/papi.jpg")
    }

    func testAcceptsNumericPrices() async throws {
        let transport = MockTransport(json: #"{"query":"x","results":[{"title":"Day charter","href":"/yachts/day","price":4500}]}"#)
        let results = try await SearchClient(transport: transport).search("day charter")
        XCTAssertEqual(results.first?.price, "4500")
        XCTAssertNil(SearchClient(transport: transport).imageURL(for: try XCTUnwrap(results.first)))
    }

    func testAnEmptyResultListIsNotAnError() async throws {
        let results = try await SearchClient(transport: MockTransport(json: #"{"query":"zzz","results":[]}"#)).search("zzz")
        XCTAssertEqual(results, [])
    }

    func testReportsServerAndFormatFailures() async {
        do {
            _ = try await SearchClient(transport: MockTransport(status: 500)).search("yacht")
            XCTFail("Expected a status error")
        } catch {
            XCTAssertEqual(error as? APIError, .status(500))
        }

        do {
            _ = try await SearchClient(transport: MockTransport(json: #"{"error":"nope"}"#)).search("yacht")
            XCTFail("Expected a decoding error")
        } catch {
            XCTAssertEqual(error as? APIError, .decoding)
        }
    }
}
