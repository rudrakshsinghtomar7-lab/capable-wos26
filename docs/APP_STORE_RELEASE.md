# Capable: App Store release runbook

Prepared 15 November 2026 for the Mac checkout at `~/code/capable-wos26`. Merged into `main` on 18 November 2026 (`25c5c57`); release from `main`. This document does not establish that a release build has passed, been uploaded, or been submitted.

The user has authorised progressing to App Store release. Prepare everything possible now, resolve the account, owner/contact, phone-test and submission-entity questions below, then continue through submission. A separate public TestFlight beta is not a required project milestone. Apple review and public availability remain separate outcomes.

## 1. Get the release branch without losing Mac changes

Start with a read-only inspection:

```sh
cd ~/code/capable-wos26
git status --short
git branch --show-current
git remote -v
```

Preserve existing edits. If the checkout is dirty, inspect the changes and use a separate worktree or deliberately retain them in their own commit before switching. Do not run `reset --hard`, `clean`, or overwrite files to make this runbook work.

After confirming the intended origin and a clean checkout:

```sh
git fetch origin
git switch main
git pull --ff-only origin main
git rev-parse HEAD
```

The App Store preparation (including removal of the unfinished Discounts/Cashbacks placeholder) was merged into `main` on 18 November 2026 at `25c5c57`. Release from `main` and record the exact commit you archive. Do not promote unfinished features in the listing.

## 2. Resolve membership and seller identity

Check whether an appropriate paid Apple Developer Program membership already exists. A configured Xcode team or successful Personal Team installation is not evidence of App Store distribution access. Sign in through Apple's interfaces; never place credentials in the repository or chat.

Before paying for a new account, assess [App Review guideline 5.1.1(ix)](https://developer.apple.com/app-store/review/guidelines/#data-collection-and-storage) against Capable's actual functions and handling of sensitive information. Apple says relevant regulated-service apps, or apps requiring sensitive user information, should be submitted by the service-providing legal entity. Do not assume incorporation is automatically mandatory for every budgeting app, or assume an individual account will be accepted for Capable. Resolve a genuine ambiguity with Apple Developer Support while other release preparation continues.

[Apple enrolment](https://developer.apple.com/help/account/membership/program-enrollment) requires two-factor authentication. Individuals and sole proprietors show their personal legal name as seller; organisations use their legal entity name and require entity verification, normally including D-U-N-S. The published fee is US$99/year or local currency; the [Australian Developer app](https://apps.apple.com/au/app/apple-developer/id640199958) listed A$144.99 on this check. Confirm the actual checkout price and account type before purchase.

## 3. Make native configuration a deliberate choice

| Setting inspected in the starting tree | Value / action |
|---|---|
| Capacitor app ID and native bundle ID | `dev.capable.wos26`; keep aligned, and verify availability under the chosen paid team. |
| Native version / build | `1.0` / `1`; update together with the App Store Connect release, increasing build number for replacement uploads. |
| JavaScript package version | `1.1.0`; this does not determine the native App Store version. |
| App target deployment minimum | `27.0` in Debug and Release, overriding project-level `15.0`. |
| Device family | `1,2`: iPhone and iPad. |

Preserve these settings until the Mac owner makes and tests the compatibility decision. Recommend iPhone-only v1 if iPad is not being tested; otherwise test the supported iPad layout and supply its screenshots. Inspect the effective Release build settings, not only the project-level value.

Do not blindly lower the deployment target to 15.0. The starting code contains an unguarded `HTMLDialogElement.showModal()` call, so that path needs iOS 15.4 at minimum unless a suitable fallback is implemented. Check every native API, dependency and WKWebView feature before selecting any lower minimum, and test that minimum.

[Apple's upload requirements](https://developer.apple.com/news/upcoming-requirements/) currently specify Xcode 26 or later with the relevant 26-generation SDK; uploaded iOS apps must target iOS 13 or later. The SDK used to build and the oldest supported iOS version are different. On the Mac, verify the selected installation rather than assuming a reported Xcode version is active:

```sh
xcodebuild -version
xcodebuild -showsdks
```

## 4. Finish public support, privacy and declarations

The privacy/support files are draft templates until the owner supplies the correct publishing owner name and a public support email. Fill these deliberately; do not publish placeholders or infer personal contact details. Deploy actual HTTPS pages, verify they open without authentication, and add working links inside the app. Rebuild after those links change. If pages are also bundled for offline access, add them and their dependencies to the explicit allow-list in `scripts/build-web.mjs`; merely adding files to the repository does not ship them.

[Apple requires](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy) a privacy-policy URL and accurate App Privacy answers, including integrated third-party practices. **“Data Not Collected” is a candidate answer, not a verified release declaration.** Inspect the final native archive, resolved SDKs, native speech/photo/share paths and network behaviour before selecting it. Distinguish on-device storage from transmission and user-initiated sharing; retain accurate deletion and opt-in-saving explanations.

Inspect app and dependency privacy manifests for APIs actually used. Follow Apple's [required-reason API documentation](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api); do not invent a UserDefaults reason or copy one merely to silence validation. Complete [export-compliance questions](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance) from the shipped encryption behaviour, not from a blanket assumption that every free or offline app is exempt.

## 5. Build and verify this release on the Mac

Use the pinned lockfile and the release checkout:

```sh
npm ci
node --check app.js
npm run test:unit
npm run test:e2e
npm run build:web
npx cap sync ios
git status --short
npx cap open ios
```

Set `CHROME_PATH` if the browser test runner needs the installed Chrome location. Inspect sync changes before retaining them. Confirm `www/asset-manifest.json` contains only intended assets, native loading uses bundled files, and no development-server URL or secret is packaged.

Evidence boundary: **On 18 November 2026, before the merge, the full web build, all 42 unit tests and all 19 browser tests (including axe accessibility checks) passed on the Mac for this branch.** Native archive and signing remain pending. Re-run the tests on the exact commit you archive. Do not copy historical pass counts into a new result.

Finish the outstanding physical-phone checks on the release candidate: **Share and Easy Read**. Check sharing opens the expected system UI, cancellation returns safely, and no unintended information is included. Verify Easy Read agrees with the ordinary screens and remains usable with VoiceOver and large text. Smoke-check launch, the changed Claim screen and the final privacy/support links in the installed candidate; record the device, OS, commit, build and result. Revisit previously passed phone checks only if related code or native settings change. See [IOS.md](IOS.md) for historical evidence.

## 6. Prepare the real listing and screenshots

Use the prepared store-copy and reviewer-note drafts, reconcile them with the shipped features, and keep fictional jobs/demo figures clearly identified. Avoid claims of government affiliation, confirmed benefit eligibility, formal accessibility certification or automatic claiming/reporting.

Retake screenshots from the final UI. Apple's [current screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/) require an iPhone Dynamic Island medium-display set: accepted portrait sizes include **1179 × 2556** and **1206 × 2622**. Supply at least one, up to ten, opaque PNG/JPEG screenshots per required size. If iPad remains supported, include the required 13-inch set, such as **2064 × 2752**. App preview video is optional.

Complete the real name, category, description, keywords, copyright, support/privacy URLs, current age-rating questionnaire and reviewer contact. Provide a stable reviewer login only if the shipped app requires one. Apple's [metadata reference](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information) describes these fields.

Proposed v1 distribution: **free, Australia**. Confirm the selected territories and price in App Store Connect. A free app without IAP uses the Developer Program agreement; a [Paid Apps Agreement](https://developer.apple.com/help/app-store-connect/manage-agreements/sign-and-update-agreements) and payment-related tax/banking setup apply when selling apps or IAP. Do not add those as unconditional free-app prerequisites.

## 7. Archive, upload, submit and release

With the appropriate active account, current agreements and verified bundle ID, [create the App Store Connect record](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app): Apps → + → New App → iOS, name, language, bundle ID and SKU. Verify the ID matches the project before uploading.

In Xcode select the app scheme, paid distribution team and intended destination. Choose **Product → Archive**, then Organizer → **Validate App**. Resolve validation errors. Choose **Distribute App → TestFlight & App Store → Distribute**; do not choose **TestFlight Internal Only**. Apple documents this [distribution workflow](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases). The preset name does not require running a public beta.

Wait for processing, select the correct build for version 1.0, complete required declarations and attach the final metadata. Once the account/entity, contact-page and phone issues above are resolved, proceed to **Add for Review**, then **Submit for Review**; [these are separate steps](https://developer.apple.com/help/app-store-connect/manage-submissions-to-app-review/submit-an-app/).

Use manual release after approval unless the user selects another [release mode](https://developer.apple.com/help/app-store-connect/manage-your-apps-availability/select-an-app-store-version-release-option/). Address any review feedback, then release the approved version under that choice. Verify the Australian public listing and installation before reporting it live.

Record evidence separately for **built**, **uploaded/processed**, **submitted**, **approved**, and **publicly live**, with commit, native version/build and date. An archive is not an upload; an upload is not submission; approval is not necessarily public availability. Until each event is observed, leave its status pending.
