import SwiftUI

/// "MIAMI Elio", set the way the website header sets it.
struct Wordmark: View {
    /// The size of "Elio"; "MIAMI" and the spacing keep their proportion to
    /// it. The default is the navigation bar's.
    var size: CGFloat = 26

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: size * 7 / 26) {
            Text(verbatim: "MIAMI")
                .font(AppFont.mono(size * 11 / 26))
                .kerning(size * 3.3 / 26)
                .foregroundStyle(Theme.accent)
            Text(verbatim: "Elio")
                .font(AppFont.wordmark(size))
                .foregroundStyle(Theme.ink)
        }
        // A fixed mark, not text to read: the navigation bar has no room for
        // it to grow, and the splash is composed around its size.
        .dynamicTypeSize(...DynamicTypeSize.xLarge)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: "Miami Elio"))
        .accessibilityAddTraits(.isHeader)
    }
}

/// The concierge's gold orb, as on the website. It shows what the concierge
/// is doing: at rest it only glows, while the guest speaks it swells with
/// their voice, while a reply is on its way a light turns across it, and a
/// reply arriving lights it for a moment. With Reduce Motion on nothing
/// moves or changes size; only the brightness changes.
struct ConciergeMark: View {
    enum Activity: Equatable {
        case resting
        /// The guest is speaking; `level` says how loudly.
        case listening
        /// A reply is on its way.
        case thinking
    }

    let diameter: CGFloat
    /// A slow pulse of the glow, for the large orb on the welcome screen.
    var breathes = false
    var activity: Activity = .resting
    /// How loud the guest is, 0...1, while the orb listens.
    var level: Double = 0
    /// Lights up once when it first appears: the orb beside a reply that
    /// has just arrived.
    var glintsOnArrival = false

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var expanded = false
    @State private var glint = 0.0

    var body: some View {
        // The clock only runs while there is something to draw from it.
        TimelineView(.animation(minimumInterval: 1.0 / 30, paused: activity != .thinking)) { timeline in
            orb(at: timeline.date.timeIntervalSinceReferenceDate)
        }
        .frame(width: diameter, height: diameter)
        .animation(.easeOut(duration: 0.12), value: level)
        .animation(.easeInOut(duration: 0.45), value: activity)
        .onAppear {
            if glintsOnArrival {
                lightUp()
            }
            guard breathes, !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 2.8).repeatForever(autoreverses: true)) {
                expanded = true
            }
        }
        .accessibilityHidden(true)
    }

    private func orb(at time: TimeInterval) -> some View {
        let loudness = activity == .listening ? min(max(level, 0), 1) : 0
        let thinking = activity == .thinking
        // One turn of the light every 2.4 seconds; with Reduce Motion, a
        // slow rise and fall of brightness instead.
        let turn = Angle.degrees(time.truncatingRemainder(dividingBy: 2.4) / 2.4 * 360)
        let pulse: Double = (sin(time * 2.6) + 1) / 2
        var brightness: Double = glint * 0.28
        if reduceMotion {
            brightness += loudness * 0.18
            if thinking {
                brightness += pulse * 0.14
            }
        }
        let swell: CGFloat = reduceMotion ? 1 : CGFloat(1 + loudness * 0.07)

        return ZStack {
            Circle()
                .fill(Theme.gold.opacity(0.45))
                .blur(radius: diameter * 0.28)
                .scaleEffect(reduceMotion ? 1.1 : glowScale(loudness))
                .opacity(glowOpacity(loudness))

            Circle()
                .fill(
                    RadialGradient(
                        colors: [Theme.goldLight, Theme.gold, Theme.goldDeep],
                        center: UnitPoint(x: 0.34, y: 0.28),
                        startRadius: diameter * 0.04,
                        endRadius: diameter * 0.78
                    )
                )
                .overlay {
                    if thinking && !reduceMotion {
                        Circle()
                            .fill(
                                AngularGradient(
                                    colors: [.clear, Theme.goldLight.opacity(0.8), .clear, .clear],
                                    center: .center,
                                    angle: turn
                                )
                            )
                            .blendMode(.screen)
                    }
                }
                .overlay(
                    Circle().strokeBorder(Theme.goldLight.opacity(0.35), lineWidth: max(0.5, diameter / 64))
                )
                .scaleEffect(swell)
                .brightness(brightness)
        }
    }

    private func glowScale(_ loudness: Double) -> CGFloat {
        switch activity {
        case .resting: return expanded ? 1.3 : 0.95
        case .listening: return CGFloat(1 + loudness * 0.6)
        case .thinking: return 1.15
        }
    }

    private func glowOpacity(_ loudness: Double) -> Double {
        switch activity {
        case .resting: return expanded ? 0.9 : 0.55
        case .listening: return 0.6 + loudness * 0.4
        case .thinking: return 0.85
        }
    }

    private func lightUp() {
        withAnimation(.easeOut(duration: 0.15)) {
            glint = 1
        } completion: {
            withAnimation(.easeOut(duration: 0.7)) {
                glint = 0
            }
        }
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
