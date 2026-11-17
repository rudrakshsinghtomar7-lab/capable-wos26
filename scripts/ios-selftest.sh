#!/bin/sh
# Builds the Debug app for a simulator, installs it fresh, and runs
# test/native/selftest.js inside the real WKWebView. Usage:
#   scripts/ios-selftest.sh [simulator-udid]
set -e
cd "$(dirname "$0")/.."
UDID="${1:-$(xcrun simctl list devices available | grep -m1 'iPhone' | sed -E 's/.*\(([0-9A-F-]{36})\).*/\1/')}"
DD="${DERIVED_DATA:-build/DerivedData}"
npm run --silent build:web >/dev/null
npx cap sync ios >/dev/null
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug \
  -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath "$DD" build -quiet
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl uninstall "$UDID" dev.capable.wos26 2>/dev/null || true
xcrun simctl install "$UDID" "$DD/Build/Products/Debug-iphonesimulator/App.app"
SIMCTL_CHILD_CAPABLE_SELFTEST_JS="$(cat test/native/selftest.js)" \
  xcrun simctl launch --console-pty --terminate-running-process "$UDID" dev.capable.wos26 2>&1 &
PID=$!
sleep "${SELFTEST_SECONDS:-25}"
kill $PID 2>/dev/null || true
