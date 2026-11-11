import Foundation
import Observation
import MiamiElioKit

/// Inventory search as the guest types.
@MainActor
@Observable
final class SearchStore {
    enum Phase: Equatable {
        /// Nothing typed yet: the popular sections are shown.
        case idle
        case searching
        case results([SearchResult])
        case empty
        case failed
    }

    var query = ""
    private(set) var phase = Phase.idle

    private let client: SearchClient

    init(client: SearchClient) {
        self.client = client
    }

    /// Runs for the current query. The view starts this again on every
    /// keystroke and cancels the previous run, so only the last one lands.
    func run() async {
        let text = SearchClient.normalize(query: query)
        guard text.count >= SearchClient.minimumQueryLength else {
            phase = .idle
            return
        }

        if case .results = phase {
            // Keep the previous hits on screen while the next ones load.
        } else {
            phase = .searching
        }

        // Wait for a pause in typing before asking the server.
        try? await Task.sleep(for: .milliseconds(350))
        guard !Task.isCancelled else { return }

        do {
            let found = try await client.search(text)
            guard !Task.isCancelled else { return }
            phase = found.isEmpty ? .empty : .results(found)
        } catch {
            guard !Task.isCancelled else { return }
            phase = .failed
        }
    }

    func imageURL(for result: SearchResult) -> URL? {
        client.imageURL(for: result)
    }
}
