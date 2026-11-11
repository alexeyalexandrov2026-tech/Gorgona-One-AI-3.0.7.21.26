import SafariServices
import SwiftUI

/// A partner's or ticket seller's page, shown over the app so "Done" returns
/// the guest to exactly where they were.
struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let controller = SFSafariViewController(url: url)
        controller.preferredBarTintColor = Theme.paperUI
        controller.preferredControlTintColor = Theme.accentUI
        controller.dismissButtonStyle = .done
        return controller
    }

    func updateUIViewController(_ controller: SFSafariViewController, context: Context) {}
}
