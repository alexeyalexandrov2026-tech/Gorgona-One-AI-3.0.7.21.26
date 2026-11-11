// swift-tools-version: 5.9
import PackageDescription

// Everything the app decides without a screen: which URLs stay in the app,
// how the site's JSON is read, which language the site should speak. Kept
// free of UIKit so `swift test` can run it on any Mac in seconds.
let package = Package(
    name: "MiamiElioKit",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [
        .library(name: "MiamiElioKit", targets: ["MiamiElioKit"])
    ],
    targets: [
        .target(name: "MiamiElioKit"),
        .testTarget(name: "MiamiElioKitTests", dependencies: ["MiamiElioKit"])
    ]
)
