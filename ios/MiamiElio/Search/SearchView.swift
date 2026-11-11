import SwiftUI
import MiamiElioKit

/// Native search over the Miami Elio inventory. Until something is typed it
/// is a front door to the main sections, in photographs.
struct SearchView: View {
    @Environment(AppRouter.self) private var router
    @Environment(SearchStore.self) private var store

    var body: some View {
        @Bindable var store = store

        NavigationStack {
            ScrollView {
                content
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 24)
            }
            .scrollDismissesKeyboard(.immediately)
            .background(Theme.paper)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Wordmark()
                }
            }
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
                .padding(.top, 56)
                .accessibilityLabel(L10n.stateLoading)
        case .results(let results):
            LazyVStack(spacing: 0) {
                ForEach(Array(results.enumerated()), id: \.element.id) { index, result in
                    VStack(spacing: 0) {
                        HStack(spacing: 4) {
                            Button {
                                router.open(reference: result.href)
                            } label: {
                                SearchResultRow(result: result, imageURL: store.imageURL(for: result))
                            }
                            .buttonStyle(PressableStyle())
                            if let favorite = FavoriteRef(result: result) {
                                FavoriteHeart(favorite: favorite)
                            }
                        }
                        Hairline()
                    }
                    // Only the first screenful is staggered; rows further
                    // down are already there by the time they scroll in.
                    .arrives(min(index, 7))
                }
            }
        case .empty:
            SearchMessage(symbol: "magnifyingglass", text: L10n.searchEmpty)
        case .failed:
            VStack(spacing: 18) {
                SearchMessage(symbol: "exclamationmark.triangle", text: L10n.errorGeneric)
                Button {
                    Task { await store.run() }
                } label: {
                    Text(L10n.actionRetry)
                        .font(AppFont.button)
                        .foregroundStyle(Theme.accent)
                }
            }
        }
    }
}

// MARK: - Sections

private struct World {
    let title: String
    /// Name in the asset catalogue; see `ios/scripts/import-world-photos.py`.
    let photo: String
    /// The site's own route (see `navItems` in Header.jsx).
    let path: String
}

private struct WorldGrid: View {
    let open: (String) -> Void

    private let gap: CGFloat = 12

    var body: some View {
        VStack(alignment: .leading, spacing: gap) {
            Text(L10n.searchPopular)
                .eyebrow()
                .padding(.bottom, 4)
                .arrives(0)

            // One wide picture, three pairs, one wide picture: the rhythm of
            // a magazine spread rather than a grid of equal boxes.
            WorldTile(world: World(title: L10n.worldCars, photo: "WorldCars", path: "/rentals"), format: .wide, open: open)
                .arrives(1)

            HStack(spacing: gap) {
                WorldTile(world: World(title: L10n.worldYachts, photo: "WorldYachts", path: "/yachts"), format: .tall, open: open)
                WorldTile(world: World(title: L10n.worldVillas, photo: "WorldVillas", path: "/vacation-rentals"), format: .tall, open: open)
            }
            .arrives(2)
            HStack(spacing: gap) {
                WorldTile(world: World(title: L10n.worldEvents, photo: "WorldEvents", path: "/events"), format: .tall, open: open)
                WorldTile(world: World(title: L10n.worldDining, photo: "WorldDining", path: "/restaurants-nightlife"), format: .tall, open: open)
            }
            .arrives(3)
            HStack(spacing: gap) {
                WorldTile(world: World(title: L10n.worldExperiences, photo: "WorldExperiences", path: "/experiences"), format: .tall, open: open)
                WorldTile(world: World(title: L10n.worldTravel, photo: "WorldTravel", path: "/travel"), format: .tall, open: open)
            }
            .arrives(4)

            WorldTile(world: World(title: L10n.worldJets, photo: "WorldJets", path: "/private-jets"), format: .banner, open: open)
                .arrives(5)
        }
    }
}

private struct WorldTile: View {
    enum Format {
        /// Full width, the lead picture.
        case wide
        /// Half width.
        case tall
        /// Full width and shallow, to close the page.
        case banner

        /// Width divided by height.
        var proportion: CGFloat {
            switch self {
            case .wide: return 1.5
            case .tall: return 0.9
            case .banner: return 2.1
            }
        }
    }

    let world: World
    let format: Format
    let open: (String) -> Void

    private let outline = RoundedRectangle(cornerRadius: 20, style: .continuous)

    var body: some View {
        Button {
            open(world.path)
        } label: {
            // The clear base fixes the tile's shape; the photograph fills it
            // and is cropped to it, whatever its own proportions.
            Color.clear
                .aspectRatio(format.proportion, contentMode: .fit)
                .overlay {
                    Image(decorative: world.photo)
                        .resizable()
                        .scaledToFill()
                }
                .overlay {
                    // Darken the foot of the picture so the name stays legible.
                    LinearGradient(
                        stops: [
                            .init(color: .clear, location: 0.3),
                            .init(color: .black.opacity(0.78), location: 1)
                        ],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                }
                .overlay(alignment: .bottomLeading) {
                    Text(world.title)
                        .font(format == .tall ? AppFont.cardTitle : AppFont.title)
                        .tracking(AppFont.headingTracking(format == .tall ? AppFont.cardTitleSize : AppFont.titleSize))
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.leading)
                        .lineLimit(3)
                        .minimumScaleFactor(0.7)
                        .shadow(color: .black.opacity(0.45), radius: 8, y: 1)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                }
                .clipShape(outline)
                .overlay(outline.stroke(Color.white.opacity(0.08), lineWidth: 1))
                .contentShape(outline)
        }
        .buttonStyle(PressableStyle())
        .accessibilityLabel(world.title)
        .accessibilityIdentifier("world.\(world.path)")
    }
}

// MARK: - Results

private struct SearchResultRow: View {
    let result: SearchResult
    let imageURL: URL?

    var body: some View {
        HStack(alignment: .center, spacing: 16) {
            Color.clear
                .frame(width: 92, height: 76)
                .overlay { thumbnail }
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            VStack(alignment: .leading, spacing: 5) {
                Text(result.title)
                    .font(AppFont.rowTitle)
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.leading)
                    .lineLimit(2)

                if !result.detailLine.isEmpty {
                    Text(result.detailLine)
                        .font(AppFont.detail)
                        .foregroundStyle(Theme.soft)
                        .multilineTextAlignment(.leading)
                        .lineLimit(2)
                }

                if let price = result.price {
                    Text(price)
                        .font(AppFont.detailMedium)
                        .foregroundStyle(Theme.accent)
                }
            }

            Spacer(minLength: 0)

            Image(systemName: "arrow.forward")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Theme.soft)
                .accessibilityHidden(true)
        }
        .padding(.vertical, 14)
        .frame(maxWidth: .infinity, alignment: .leading)
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
            Theme.card
            Image(systemName: "photo")
                .foregroundStyle(Theme.rule)
                .accessibilityHidden(true)
        }
    }
}

private struct SearchMessage: View {
    let symbol: String
    let text: String

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: symbol)
                .font(.system(size: 32, weight: .light))
                .foregroundStyle(Theme.soft)
                .accessibilityHidden(true)
            Text(text)
                .font(AppFont.body)
                .foregroundStyle(Theme.soft)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 56)
    }
}
