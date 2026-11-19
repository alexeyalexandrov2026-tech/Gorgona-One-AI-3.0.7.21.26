# Miami Elio for Android

Miami Elio combines a native concierge, search and seasonal reminders with
WebView tabs for the Miami Elio catalogue and My Miami profile.

| Setting | Value |
| --- | --- |
| Application ID | `com.miamielio.app` |
| Version | `1.2.1` / `5` |
| Android | Minimum API 26, target API 36, compile API 37 |
| Toolchain | JDK 17, Android SDK Platform 37, Node.js 22, Gradle wrapper 9.9.1 |
| Debug | `com.miamielio.app.debug`, with protected dashboard staging by default |
| Release | `https://gorgona-one.com` |

## Build and test

Set `JAVA_HOME` to JDK 17. Set `ANDROID_HOME` to the SDK root or use
`sdk.dir` in the local `android/local.properties` file. From the repository root,
run the asset checks and build.

```sh
node android/scripts/build-strings.mjs --check
node android/scripts/build-season.mjs --check
node android/scripts/verify-web-bridge.cjs
cd android
./gradlew --max-workers=2 testDebugUnitTest lintDebug assembleDebug bundleRelease
```

On Windows, use `Set-Location android` and
`.\gradlew.bat --max-workers=2 testDebugUnitTest lintDebug assembleDebug bundleRelease`.
To use a different HTTPS test origin, run
`assembleDebug -Pmiamielio.debugBaseUrl=https://your-test-origin.example`.

### Protected staging session

Install the debug APK. Set `MIAMIELIO_STAGING_SECRETS` to the absolute path of the
private staging JSON containing `DASHBOARD_STAGING_ACCESS_SECRET` outside this
worktree. Use `MIAMIELIO_ADB` if the Android SDK tool is outside PATH. Run
`node android/scripts/staging-session.mjs emulator-5554` from the repository root,
using the actual device serial, then relaunch Miami Elio Test.
The staging session expires after four hours. Run the same command to renew it.
The debug app shares only the staging gate cookie with native API and image
requests to the exact staging origin.

| Build output under `android/app/build/` | Purpose |
| --- | --- |
| `outputs/apk/debug/app-debug.apk` | Install with `adb install -r` for local testing |
| `outputs/bundle/release/app-release.aab` | Release bundle, signed when upload credentials are configured |
| `reports/lint-results-debug.html` | Android Lint |
| `reports/tests/testDebugUnitTest/index.html` | JVM and Robolectric test report |
| `outputs/snapshots/` | Compose snapshots with test fixtures |

Edit native strings in `android/strings.json` and run
`node android/scripts/build-strings.mjs` from the repository root. Edit the
season schedule in `lib/seasonData.js` and run `node android/scripts/build-season.mjs`
to refresh the bundled calendar. Reminders use Miami local time and may arrive
later due to Android's inexact alarm scheduling.

## Release signing

For an existing Play listing, use its registered upload key. For a new listing,
the owner creates and backs up an RSA upload key and configures Play App Signing.
The build reads these settings from the owner-controlled environment or the
ignored local `android/keystore.properties` file.

| Environment variable | Local property |
| --- | --- |
| `MIAMIELIO_KEYSTORE_FILE` | `storeFile` |
| `MIAMIELIO_KEYSTORE_PASSWORD` | `storePassword` |
| `MIAMIELIO_KEY_ALIAS` | `keyAlias` |
| `MIAMIELIO_KEY_PASSWORD` | `keyPassword` |

Run `bundleRelease` after configuring the key. Use `jarsigner -verify` to
verify the bundle and `keytool -printcert -jarfile` to compare its certificate
fingerprint with the upload certificate in Play Console. Keep the key and
passwords in the owner's credential store. [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756)

See [Play Console materials](PLAY_CONSOLE.md) and the
[Android handoff](../docs/ANDROID_APP_HANDOFF.md) for release status.
