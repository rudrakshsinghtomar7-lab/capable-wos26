# Running Capable on your iPhone (development build)

## Toolchain used for the successful clean build (15 November 2026)

A fresh `git clone` of the pre-release reliability branch (its history was later squashed into the first public commit, `bbe913a`) was put through `npm ci`, `npm run build:web` and `npx cap sync ios`, then two Xcode builds. The Debug build for the iPhone 18 Pro simulator succeeded. The Release build for `generic/platform=iOS` (arm64, unsigned) also succeeded. Both used fresh DerivedData and a fresh SPM checkout. `cap sync` left the working tree unchanged.

| Tool | Version |
|---|---|
| macOS | 27.3 (Apple silicon MacBook Air) |
| Node | 24.15.0 |
| npm | 11.12.1 |
| Xcode | 27.2 (build 27B52) |
| iOS SDK | iphoneos 27.2 |
| iOS Simulator SDK / runtime | iphonesimulator 27.2 / iOS 27.2 |
| Swift | 6.4.2 |
| Capacitor (core, cli, ios) | 8.6.2, pinned exactly |
| capacitor-swift-pm (SPM) | 8.6.2, revision `b945758eaf3f034cea377e3138a60611cb40a88b` |
| Deployment target | Project default: iOS 15.0. Current App target (Debug and Release): iOS 27.0; this override controls the app's minimum supported OS. |

**Lockfiles committed:**

- `package-lock.json` (npm)
- `ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved` (SPM)

There is no CocoaPods `Podfile.lock`, because the project uses Swift Package Manager. Capacitor 8 needs Node 22+ and Xcode 26+, and supports iOS 15+.

## One-time setup

```sh
cd ~/code/capable-wos26
npm ci                 # installs exactly what package-lock.json pins
```

## Build the web assets, sync iOS, open Xcode

```sh
npm run build:web      # writes www/ from an explicit file list
npx cap sync ios       # copies www/ into the iOS app and updates native config
npx cap open ios       # opens the project in Xcode
```

(`npm run ios:sync` runs the first two together.)

`www/` holds only these files:

- `index.html`, `rules.js`, `engine.js`, `demo-data.js`, `app.js`, `sw.js`, `manifest.json` and the four icons
- `capacitor.js`, copied from the pinned `@capacitor/core`
- `asset-manifest.json`, with each file's size and SHA-256

Capacitor adds its own `cordova.js` and `cordova_plugins.js` stubs inside the iOS app. `webDir` is `www`, never the repository root. `www/` is git-ignored and is rebuilt from scratch every time.

The app loads its bundled files (`capacitor://localhost`) and needs no development server. For live reload while developing, run `npx cap run ios -l --external` explicitly. Nothing in `capacitor.config.json` points at a server.

## Signing with your Personal Team

1. In Xcode: **Xcode › Settings › Accounts**, then **+** › **Apple Account**, and sign in. This happens in Xcode, never in chat.
2. In the project navigator, select **App** (blue icon) › target **App** › **Signing & Capabilities**.
3. Tick **Automatically manage signing** and choose your **(Personal Team)** under **Team**.
4. If Xcode says the bundle ID `dev.capable.wos26` is unavailable, change **Bundle Identifier** to something unique to you, for example `dev.capable.<yourname>`.

No paid-only capabilities are used. The app needs only microphone, speech recognition and camera permission strings, which a Personal Team supports.

**Personal Team limits** (Apple): the provisioning profile expires after 7 days, so after that you rebuild and run again from Xcode. You can install at most 3 apps per device.

## Pair your iPhone and run

1. Connect the iPhone 17 Pro by USB-C and unlock it. Tap **Trust** on the phone.
2. On the phone, turn on **Settings › Privacy & Security › Developer Mode** and restart when asked. The option appears after Xcode first sees the phone.
3. In Xcode's toolbar, choose your iPhone as the run destination and press **Run** (▶).
4. The first time, iOS blocks the app from an untrusted developer. On the phone, go to **Settings › General › VPN & Device Management**, tap your Apple Account, then tap **Trust**. Run again.

Optional: for wireless runs, tick **Show this iPhone when on Wi-Fi** in Finder while the phone is connected.

## Storage is separate

The web/PWA and the iPhone app keep **separate** storage. Answers saved in Safari don't appear in the app, and are not moved across automatically.

## Native behaviour (what was verified where)

| Feature | Implementation in the app | Simulator (iPhone 18 Pro, iOS 27.2) | Physical iPhone 17 Pro (iOS 27.3), Debug build `f0b9baa` |
|---|---|---|---|
| Bundled assets, no dev server | `webDir: www` | passed | passed (self-test, 15 Nov 2026) |
| No service worker or install prompt | `app.js` skips both in native | passed | passed (self-test) |
| Calculations, Easy Read, storage | same web code | passed (re-run 15 Nov 2026 on the pre-release reliability branch) | calculation + storage passed (self-test); saving, persistence, reset and airplane-mode launch passed (user-reported, 15 Nov 2026); Easy Read on device not run |
| Read aloud | local plugin → `AVSpeechSynthesizer` (system voices, on device) | passed (speech completed) | works, but **sounds robotic**: the phone has only default-quality English voices (47, none Enhanced/Premium). Code now prefers Premium/Enhanced in any English accent, honours the Read & Speak (formerly Spoken Content) voice setting, and shows a one-time hint to download a better voice. After the user downloaded an Enhanced/Premium voice in Read & Speak, read-aloud sounded **much better: passed** (user, 15 Nov 2026). The app's voice list still showed only default voices, so iOS applies the user's voice through `prefersAssistiveTechnologySettings` without exposing it to the app; the tip can now be dismissed permanently. |
| Voice input | local plugin → `SFSpeechRecognizer` with `requiresOnDeviceRecognition = true`; refuses when on-device isn't supported, with **no server fallback** | simulator has no on-device recogniser → correctly refused and the panel says voice is off; tap options shown | on-device recogniser available for en-AU (self-test); speaking a command with permission allowed, denial message and tap fallback: passed (user-reported, 15 Nov 2026) |
| Mic permission | requested only on **Speak**; denial message points to Settings | not requested at launch: passed | not requested at launch: passed (mic + speech both `prompt`); grant/deny dialogs: passed (user-reported, 15 Nov 2026) |
| Interruption / background | stops listening and speech on audio interruption and on entering background | code only | passed (user-reported, 15 Nov 2026) |
| Keep screen on | `isIdleTimerDisabled` via plugin | passed | passed (self-test) |
| Pinch zoom | `ios.zoomEnabled: true` (Capacitor's default is off) | config verified | passed (user-reported, 15 Nov 2026) |
| Dynamic Type | `font: -apple-system-body`; header and tab bar capped at AX sizes | screenshots at default and AX5: passed | passed (user-reported, 15 Nov 2026) |
| Dark mode, safe areas | `contentInset: always`; native background matches `--bg` | screenshots: passed | not run |
| Payslip photo | `<input capture>`; `NSCameraUsageDescription` added | not run (simulator has no camera) | passed (user-reported, 15 Nov 2026) |
| Share | `navigator.share` exists in WKWebView | API present | not run |
| External links, `tel:` | WKWebView / Capacitor default handling | not run | link opens Safari on a real tap: **passed** (user, 15 Nov 2026); `tel:` passed (user-reported, 15 Nov 2026) |
| VoiceOver | — | not run | passed (user-reported, 15 Nov 2026) |

On a connected phone, after installing a Debug build from Xcode, the same self-test runs with `DEVICECTL_CHILD_CAPABLE_SELFTEST_JS="$(cat test/native/selftest.js)" xcrun devicectl device process launch --device <udid> --terminate-existing --console dev.capable.wos26`.

`scripts/ios-selftest.sh [simulator-udid]` rebuilds the app, installs it fresh and runs `test/native/selftest.js` inside the real WKWebView. The script is injected through a launch environment variable by a `#if DEBUG` hook, which is compiled out of Release builds.

## Phone-testing checklist

Result on 15 Nov 2026 (iPhone 17 Pro, iOS 27.3): the user reported that every item below works. Share and Easy Read were not part of that pass.

Write pass or fail beside each.

1. **Launch**: first open shows "Start my own session" and "Try the demo". Pick your own session: no Sam, no figures.
2. **VoiceOver** (Settings › Accessibility › VoiceOver, or triple-click the side button if you've set the shortcut):
   - Swipe through the Summary screen. Every button has a sensible name, and the tab bar reads "Home, Jobs, Money, Claim".
   - Open **Privacy and your data**. Focus lands on its heading, and Close returns focus to where you were.
   - On Money, answer a question. VoiceOver announces the updated estimate.
3. **Large text**: Settings › Accessibility › Display & Text Size › Larger Text, slider to maximum. Reopen Capable. Text is large, nothing overlaps, and the tab bar is still usable. Pinch-zoom works.
4. **Microphone denial**: open Ask Capable and press **Speak**, then **Don't Allow**. The message explains how to turn it on in Settings, and the tap options still work. Then allow it in Settings › Capable and say "jobs". It should go to Jobs.
5. **Voice offline**: turn on Airplane Mode and press **Speak**. It should either work (on-device) or say voice is unavailable. It must never pretend to listen.
6. **Interruption**: start listening, then trigger Siri or a call. Listening stops with a message. Press the home gesture while it's reading aloud: speech stops.
7. **Airplane-mode launch**: with Airplane Mode on, force-quit and reopen Capable. It opens, calculates, and shows Easy Read. Government links won't load, which is expected.
8. **Persistence**: in your own session, turn on **Save my answers on this device**, enter wages, force-quit and reopen. The wages are still there. Turn saving off and confirm: after reopening, the answers are gone.
9. **Reset**: Privacy › **Delete everything Capable has stored** › Cancel (nothing changes), then again › Delete everything. You're back at the welcome choice.
10. **Payslip photo**: Money › take a photo. Camera permission text appears, and the photo shows on screen.
11. **Links**: tap a qld.gov.au link (opens outside the app) and a phone number (offers to call).
