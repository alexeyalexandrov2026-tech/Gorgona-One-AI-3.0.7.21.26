import SwiftUI
import MiamiElioKit

/// Native search over the Miami Elio inventory, with the main sections one
/// tap away while nothing is typed.
struct SearchView: View {
    @Environment(AppRouter.self) private var router
    @Environment(SearchStore.self) private var store

    var body: some View {
        @Bindable var store = store

        NavigationStack {
            ScrollView {
                content
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
            }
            .scrollDismissesKeyboard(.immediately)
            .background(Theme.paper)
            .navigationTitle(L10n.tabSearch)
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $store.query, placement: .navigationBarDrawer(displayMode: .always))
            .autocorrectionDisabled()
            .task(id: store.query) {
                await store.run()
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch store.phase {
        case .idle:
            WorldGrid { router.open(reference: $0) }
        case .searching:
            ProgressView()
                .tint(Theme.soft)
                .frame(maxWidth: .infinity)
                .padding(.top, 48)
                .accessibilityLabel(L10n.stateLoading)
        case .results(let results):
            LazyVStack(spacing: 12) {
                ForEach(results) { result in
                    Button {
                        router.open(reference: result.href)
                    } label: {
                        SearchResultRow(result: result, imageURL: store.imageURL(for: result))
                    }
                    .buttonStyle(.plain)
                }
            }
        case .empty:
            SearchMessage(symbol: "magnifyingglass", text: L10n.searchEmpty)
        case .failed:
            VStack(spacing: 16) {
                SearchMessage(symbol: "exclamationmark.triangle", text: L10n.errorGeneric)
                Button(L10n.actionRetry) {
                    Task { await store.run() }
                }
                .font(.headline)
            }
        }
    }
}

// MARK: - Sections

private struct World: Identifiable {
    let title: String
    let symbol: String
    let path: String
    var id: String { path }
}

private struct WorldGrid: View {
    let open: (String) -> Void

    // Paths are the site's own routes (see `navItems` in Header.jsx).
    private var worlds: [World] {
        [
            World(title: L10n.worldYachts, symbol: "sailboat.fill", path: "/yachts"),
            World(title: L10n.worldCars, symbol: "car.fill", path: "/rentals"),
            World(title: L10n.worldVillas, symbol: "house.fill", path: "/vacation-rentals"),
            World(title: L10n.worldEvents, symbol: "ticket.fill", path: "/events"),
            World(title: L10n.worldDining, symbol: "fork.knife", path: "/restaurants-nightlife"),
            World(title: L10n.worldExperiences, symbol: "star.fill", path: "/experiences"),
            World(title: L10n.worldTravel, symbol: "airplane", path: "/travel"),
            World(title: L10n.worldShopping, symbol: "bag.fill", path: "/stores")
        ]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text(L10n.searchPopular)
                .font(.footnote.weight(.semibold))
                .textCase(.uppercase)
                .kerning(1.2)
                .foregroundStyle(Theme.soft)

            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                ForEach(worlds) { world in
                    Button {
                        open(world.path)
                    } label: {
                        VStack(alignment: .leading, spacing: 14) {
                            Image(systemName: world.symbol)
                                .font(.title2)
                                .foregroundStyle(Theme.accent)
                                .accessibilityHidden(true)
                            Text(world.title)
                                .font(.headline)
                                .foregroundStyle(Theme.ink)
                                .multilineTextAlignment(.leading)
                                .lineLimit(2)
                        }
                        .frame(maxWidth: .infinity, minHeight: 84, alignment: .topLeading)
                        .padding(16)
                        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 18, style: .continuous)
                                .stroke(Theme.rule, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                    .accessibilityIdentifier("world.\(world.path)")
                }
            }
        }
    }
}

// MARK: - Results

private struct SearchResultRow: View {
    let result: SearchResult
    let imageURL: URL?

    var body: some View {
        HStack(alignment: .top, spacing: 14) {
            thumbnail
                .frame(width: 92, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 4) {
                Text(result.title)
                    .font(.headline)
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.leading)
                    .lineLimit(2)

                if !result.detailLine.isEmpty {
                    Text(result.detailLine)
                        .font(.subheadline)
                        .foregroundStyle(Theme.soft)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                }

                if let price = result.price {
                    Text(price)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Theme.accent)
                }
            }

            Spacer(minLength: 0)

            Image(systemName: "chevron.forward")
                .font(.footnote.weight(.semibold))
                .foregroundStyle(Theme.soft)
                .padding(.top, 4)
                .accessibilityHidden(true)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .stroke(Theme.rule, lineWidth: 1)
        )
        .contentShape(Rectangle())
    }

    @ViewBuilder
    private var thumbnail: some View {
        if let imageURL {
            AsyncImage(url: imageURL) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .scaledToFill()
                default:
                    placeholder
                }
            }
        } else {
            placeholder
        }
    }

    private var placeholder: some View {
        ZStack {
            Theme.rule
            Image(systemName: "photo")
                .foregroundStyle(Theme.soft)
                .accessibilityHidden(true)
        }
    }
}

private struct SearchMessage: View {
    let symbol: String
    let text: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: symbol)
                .font(.system(size: 34, weight: .light))
                .foregroundStyle(Theme.soft)
                .accessibilityHidden(true)
            Text(text)
                .font(.body)
                .foregroundStyle(Theme.soft)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 48)
    }
}
