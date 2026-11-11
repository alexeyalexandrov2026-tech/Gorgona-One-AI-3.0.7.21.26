import SwiftUI
import Observation
import MiamiElioKit

/// The hearts on native screens. The website keeps the list ("My Miami"):
/// in the account when the guest is signed in on the site, on this device
/// otherwise. This store hands each change to a page and takes the list the
/// page reports back, so the site and the app always show the same favourites.
@MainActor
@Observable
final class FavoritesStore {
    private struct Change {
        let favorite: FavoriteRef
        let on: Bool
    }

    private(set) var keys: Set<String> = []
    @ObservationIgnored private var pending: [Change] = []
    @ObservationIgnored private var delivering = false
    @ObservationIgnored private let page: WebViewModel

    init(page: WebViewModel) {
        self.page = page
    }

    func isSaved(_ favorite: FavoriteRef) -> Bool {
        keys.contains(favorite.key)
    }

    func toggle(_ favorite: FavoriteRef) {
        let on = !keys.contains(favorite.key)
        if on {
            keys.insert(favorite.key)
        } else {
            keys.remove(favorite.key)
        }
        pending.append(Change(favorite: favorite, on: on))
        deliver(to: page)
    }

    /// A page reported its list, so it is ready: anything still waiting goes to it.
    func received(_ reported: Set<String>, from source: WebViewModel) {
        if pending.isEmpty {
            keys = reported
        }
        deliver(to: source)
    }

    /// One change at a time, in order; a change stays queued until a page has it.
    private func deliver(to target: WebViewModel) {
        guard !delivering, let next = pending.first else { return }
        guard let script = next.favorite.script(on: next.on) else {
            pending.removeFirst()
            deliver(to: target)
            return
        }
        delivering = true
        target.runOnSite(script) { [weak self] delivered in
            guard let self else { return }
            self.delivering = false
            guard delivered else { return }
            if !self.pending.isEmpty {
                self.pending.removeFirst()
            }
            self.deliver(to: target)
        }
    }
}

/// The heart beside a yacht, villa, car or restaurant.
struct FavoriteHeart: View {
    @Environment(FavoritesStore.self) private var favorites
    let favorite: FavoriteRef

    var body: some View {
        let saved = favorites.isSaved(favorite)
        Button {
            favorites.toggle(favorite)
        } label: {
            Image(systemName: saved ? "heart.fill" : "heart")
                .font(.system(size: 18, weight: .medium))
                .foregroundStyle(saved ? Theme.accent : Theme.soft)
                .frame(width: 44, height: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(saved ? L10n.favoriteRemove : L10n.favoriteSave)
        .accessibilityAddTraits(saved ? .isSelected : [])
        .accessibilityIdentifier("favorite.heart")
        .sensoryFeedback(.selection, trigger: saved)
    }
}
