#!/bin/bash
# Checks an archived build of the app for what App Store Connect reads before
# it takes a build for TestFlight, so a first upload does not fail on it.
#
#   bash ios/scripts/check-release-archive.sh build/MiamiElio.xcarchive 1.0.0 12.1
#
# Run by the iOS workflow on an unsigned Release archive (every change to
# ios/) and by the TestFlight workflow before it uploads.
set -euo pipefail

archive=$1
version=$2
build=$3
app="$archive/Products/Applications/MiamiElio.app"
plist="$app/Info.plist"

fail() {
  echo "::error::$1"
  exit 1
}
get() {
  /usr/libexec/PlistBuddy -c "Print :$1" "$plist" 2>/dev/null || true
}

[ -f "$plist" ] || fail "No app in the archive: $app"
[ "$(get CFBundleShortVersionString)" = "$version" ] || fail "The version is '$(get CFBundleShortVersionString)', expected $version"
[ "$(get CFBundleVersion)" = "$build" ] || fail "The build number is '$(get CFBundleVersion)', expected $build"
[ "$(get CFBundleIdentifier)" = "com.miamielio.app" ] || fail "The bundle ID is '$(get CFBundleIdentifier)', expected com.miamielio.app"
# Without it every TestFlight build waits for an export-compliance answer.
[ "$(get ITSAppUsesNonExemptEncryption)" = "false" ] || fail "ITSAppUsesNonExemptEncryption is not false"
# Without a reason the app is closed by iOS the moment it asks.
for key in NSMicrophoneUsageDescription NSSpeechRecognitionUsageDescription NSCameraUsageDescription; do
  [ -n "$(get "$key")" ] || fail "No $key in Info.plist"
done
[ "$(get CFBundleIcons:CFBundlePrimaryIcon:CFBundleIconName)" = "AppIcon" ] || fail "No app icon in the build"
[ -f "$app/PrivacyInfo.xcprivacy" ] || fail "No privacy manifest (PrivacyInfo.xcprivacy) in the build"
[ -f "$app/season.json" ] || fail "No season.json in the build: the concierge would show no weeks"

echo "Ready for App Store Connect: Miami Elio $version ($build)"
