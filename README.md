# Capable

**Work, money and concessions** — an accessible companion for people with disability in Queensland. It runs as a web app/PWA (no build step needed to serve it) and as an iOS app via Capacitor.

**Live web app:** https://rudrakshsinghtomar7-lab.github.io/capable-wos26/ (GitHub Pages, deployed from `main`).

> Estimates only, not financial advice. Capable is not connected to Centrelink, the NDIA or the Queensland Government, and never reports or claims anything for you.

## What it does

- **Two ways in.** *Try the demo* shows Sam Whitton, a made-up person with made-up figures. *Start my own session* begins blank.
- **Job mapping.** Sample roles at fictional employers, matched on capacity: hours available and job needs, never diagnosis. The matching rule is explained on screen. Reviews and employers are labelled made up, and no role is a real vacancy.
- **Disability Support Pension estimate.** A deterministic income-test estimate for one supported situation: single, aged 21 or over and under Age Pension age, no dependent children, gross wages as the only other income, no Working Credit in use, and no assets-test reduction.
  - Every question must be answered. Unanswered questions are never assumed.
  - Partnered, under 21, children, permanently blind, Rent Assistance, other income, the transitional rate, Age Pension age (Work Bonus), Working Credit in use and assets-test reductions are refused with an explanation and an official link, instead of being calculated wrongly.
  - A "not sure" answer to any of these shows no estimate.
  - Wages are entered before tax. Money is integer cents, and rounding is explicit (half a cent rounds up).
  - The working is shown, along with what's included and excluded. The comparison is "compared with earning no wages", never "better off". Annual figures are qualified as "if this fortnight stayed the same".
- **NDIS funding, kept separate.** It's never added to income or spending money.
  - The demo shows Core, Capacity Building and Capital budgets, with stated supports locked.
  - In your own session you can note a balance, which must carry its date, its source, and what it covers (whole plan, current funding period, or not sure). It is never described as checked or available now.
- **Queensland concessions.** Six schemes, each evaluated against its own rules, with three states: *may be able to claim*, *more information needed*, *not eligible, based on your answers*.
  - Missing and "not sure" answers never count as yes.
  - Bill rebates, payments, subsidies and non-cash benefits are labelled.
  - There is no "money you are owed" total.
- **Easy Read, read aloud, Ask Capable (voice).** These, and the standard screens, are all formatted from one shared `facts` object, so they can't disagree. Every voice action has a tap equivalent.
- **Privacy panel.** It explains what's stored, where, whether it persists, what (if anything) leaves the device, and how to delete it. Saving is opt-in, deletion is confirmed, and older or corrupt records are handled transparently.

## Files

| File | Role |
|---|---|
| `rules.js` | **Single source of truth** for every government figure, with source, effective date, checked date, status and how it was checked. See [docs/SOURCES.md](docs/SOURCES.md). |
| `engine.js` | Pure logic: money, DSP estimate, concession eligibility, NDIS totals, storage validation and migration. Runs in the browser and in Node tests. |
| `demo-data.js` | The fictional demo person, sample jobs and reviews. |
| `app.js` | Interface. |
| `index.html` | Shell and styles. |
| `sw.js` | Offline service worker (web only). |
| `scripts/build-web.mjs` | Builds `www/` from an explicit file list for Capacitor. |
| `ios/` | Capacitor iOS project, plus a small native plugin (`CapableSpeechPlugin.swift`) for on-device speech, read-aloud and keep-awake. |
| `test/` | Unit tests (`node:test`), browser tests with axe-core (Puppeteer + system Chrome), and a native self-test. |

## Setup

Requirements: Node 22+ (tested on 24.15). For iOS, Xcode 26+ (tested on 27.2). Chrome is used for the browser tests (set `CHROME_PATH` if it isn't in `/Applications`).

```sh
npm ci
npm test               # 42 unit + 19 browser/accessibility tests
npm run build:web      # writes www/
npm run serve          # http://localhost:8080 (serves www/)
```

The web app also runs straight from the repository root on any static host, as before.

## iOS

```sh
npm run build:web && npx cap sync ios && npx cap open ios
```

Signing, pairing, running on the iPhone, what was verified, and a phone-testing checklist: [docs/IOS.md](docs/IOS.md).

## How the figures were checked

Each figure in `rules.js` has a status, and the app shows it next to the figure:

- **verified:** read on the official page by Capable's own checking tools.
- **review-confirmed:** an independent reviewer read the full official page. This covers the core DSP figures: the maximum rate, the income free area, gross income, the 50c reduction, the $2,701.40 single cut-off and the 30-hour rule with its exceptions (reviews of 14 and 15 Nov 2026). Capable's own tools could not open servicesaustralia.gov.au, and the record says so.
- **excerpt:** confirmed only from search excerpts. Shown as provisional, for example the concession-card and 14-day points under the 30-hour rule.
- **unverified:** never shown as an amount someone may get.

The full record is in [docs/SOURCES.md](docs/SOURCES.md).

## Accessibility

Capable is **targeting WCAG 2.2 AA**. It has not had a formal assessment or testing with disabled users.

Automated checks run axe-core (WCAG 2.0–2.2 A/AA rules) on every view, Easy Read and dialogs, in light and dark mode. There are also reflow checks at 320px and 200% text. Earlier manual checks are recorded in git history.

## Offline

After one visit, everything except official-website links (and voice input in some browsers) works offline. Saved answers are never touched by updates.

How an update reaches someone who already has the app (observed on the 15 Nov 2026 release, v6 → v7):

1. **Code and rules are fetched network-first.** The first time the app opens online after a deploy, it is already running the new `rules.js` and `app.js`, even while the old service worker is still in control.
2. **If `CACHE` in `sw.js` changed,** the new worker installs and takes over. The app then reloads itself once, a few seconds after opening. The user doesn't need to reload or close and reopen it.
3. **Offline after that,** the updated content opens from the cache, and saved answers are unchanged.

Bumping `CACHE` is not what delivers corrected rules: network-first does that. Bumping it replaces the worker and clears the old cached copies.

## Updating figures

Follow the steps in [docs/SOURCES.md](docs/SOURCES.md#to-re-verify), run `npm test`, and bump `CACHE` in `sw.js` so the old cached copies are replaced. For the iOS app, run `npm run ios:sync` and reinstall: the iOS app bundles its files and does not use the service worker.

## Device testing still outstanding

On the iPhone, **Share** and **Easy Read** have not been run yet (see [docs/IOS.md](docs/IOS.md)). The build that includes the 15 Nov 2026 rule updates has not been installed on the phone yet.
