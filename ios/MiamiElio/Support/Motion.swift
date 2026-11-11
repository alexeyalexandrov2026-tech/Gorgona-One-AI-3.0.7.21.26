import SwiftUI

/// Content that arrives a beat after its screen does: it fades in while
/// settling upward, each piece a little later than the one above it, the
/// way the website brings in its sections. With Reduce Motion on, it only
/// fades.
private struct Arrival: ViewModifier {
    let order: Int

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var arrived = false

    func body(content: Content) -> some View {
        content
            .opacity(arrived ? 1 : 0)
            .offset(y: arrived || reduceMotion ? 0 : 16)
            .onAppear {
                guard !arrived else { return }
                withAnimation(.easeOut(duration: 0.5).delay(Double(order) * 0.07)) {
                    arrived = true
                }
            }
    }
}

extension View {
    /// `order` is the piece's place in the sequence, counting from 0.
    func arrives(_ order: Int = 0) -> some View {
        modifier(Arrival(order: order))
    }
}
