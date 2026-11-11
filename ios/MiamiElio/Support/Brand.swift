import SwiftUI

/// "MIAMI Elio", set the way the website header sets it.
struct Wordmark: View {
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 7) {
            Text(verbatim: "MIAMI")
                .font(AppFont.mono(11))
                .kerning(3.3)
                .foregroundStyle(Theme.accent)
            Text(verbatim: "Elio")
                .font(AppFont.wordmark(26))
                .foregroundStyle(Theme.ink)
        }
        // It lives in the navigation bar, which has no room to grow.
        .dynamicTypeSize(...DynamicTypeSize.xLarge)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: "Miami Elio"))
        .accessibilityAddTraits(.isHeader)
    }
}

/// The concierge's gold orb, as on the website.
struct ConciergeMark: View {
    let diameter: CGFloat
    /// A slow pulse of the glow, for the large orb on the welcome screen.
    var breathes = false

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var expanded = false

    var body: some View {
        ZStack {
            Circle()
                .fill(Theme.gold.opacity(0.45))
                .blur(radius: diameter * 0.28)
                .scaleEffect(expanded ? 1.3 : 0.95)
                .opacity(expanded ? 0.9 : 0.55)

            Circle()
                .fill(
                    RadialGradient(
                        colors: [Theme.goldLight, Theme.gold, Theme.goldDeep],
                        center: UnitPoint(x: 0.34, y: 0.28),
                        startRadius: diameter * 0.04,
                        endRadius: diameter * 0.78
                    )
                )
                .overlay(
                    Circle().strokeBorder(Theme.goldLight.opacity(0.35), lineWidth: max(0.5, diameter / 64))
                )
        }
        .frame(width: diameter, height: diameter)
        .onAppear {
            guard breathes, !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 2.8).repeatForever(autoreverses: true)) {
                expanded = true
            }
        }
        .accessibilityHidden(true)
    }
}

/// A hairline, as the site draws between rows.
struct Hairline: View {
    var body: some View {
        Rectangle()
            .fill(Theme.rule)
            .frame(height: 1)
            .accessibilityHidden(true)
    }
}

/// Buttons that are pictures or rows: they dip slightly under the finger
/// instead of flashing.
struct PressableStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.975 : 1)
            .opacity(configuration.isPressed ? 0.85 : 1)
            .animation(.easeOut(duration: 0.15), value: configuration.isPressed)
    }
}
