# Capable

### 👉 [**Open the live app →**](https://rudrakshsinghtomar7-lab.github.io/capable-wos26/)

**Work, money and what you're owed.** A financial app for people with disability in Queensland, Australia.

Built for WOS26. Single self-contained `index.html` — no build step, no backend, no dependencies, no web fonts. Open the file, or visit the live site, and it runs.

**Live demo:** https://rudrakshsinghtomar7-lab.github.io/capable-wos26/

## What it does

Three modules, one connecting idea: *get work, understand the money, collect what you're already owed.*

1. **Job mapping** — matches people to work based on their capacity (hours available, accessibility needs), never their diagnosis. Every result shows fortnightly earnings, what those earnings do to the pension, and reviews from workers with disability who did that job.
2. **Financial tracker** — wages, Disability Support Pension and NDIS plan funding in one place, on a **fortnightly** cycle. Most budget apps get this wrong.
3. **Claim** — Queensland government entitlements you qualify for but are not collecting, your NDIS claim history, plus demo partner discounts and cashbacks.

## The demo user

Sam Whitton, Woolloongabba (Brisbane). On the Disability Support Pension, self-managed NDIS plan, working 6 hours a week casual. The app opens **already signed in** — there is no sign-up and no login, which is deliberate and is how it meets WCAG 3.3.8 for free.

A one-screen intro runs on first open and never again; "Replay the intro" is in the More menu.

---

## Features

### Talk to Capable

Tap **Ask Capable** and it says *"Welcome Sam. What do you want to know?"*, listens, and on hearing something like *"I want to know about jobs"* replies *"OK. Here are the jobs that fit you."*, switches to that view, and reads the summary aloud.

Two rules shape the design:

- **Speaking is never required.** Many people this app is for have a speech disability, or are somewhere they cannot talk. Buttons for every option are on screen from the start, not a fallback after failure.
- **Everything spoken is also written**, in a persistent live region, so deaf and hard-of-hearing users get the whole exchange and anyone can check it heard them right.

Intent matching scores each topic by how many of its words it hears rather than matching one keyword, so *"what work can i do"*, *"am i getting paid enough"* and *"is there money im owed"* all land correctly. It is a pure function, unit-tested without a microphone: **17/17 phrasings correct**, including two that should match nothing.

### Read this to me

`speechSynthesis` reads a short plain-language summary of the current screen — not a dump of the DOM, which would be unlistenable.

This is **not for blind users**, who have VoiceOver and do not need our version. It is for people with intellectual disability, dyslexia, acquired brain injury or fatigue, who would never switch a screen reader on but will tap a button.

The browser can only use voices the OS has installed, so instead of taking the default — usually the oldest and most robotic one — it scores every available voice and prefers Siri → enhanced/premium/neural → a named Australian voice → `en-AU`, and penalises the "Compact" voices. It also reads **a sentence at a time** rather than one long utterance, which is most of what makes browser speech sound mechanical.

### Easy Read

A recognised standard in Australian disability services, not just bigger text: short sentences, one idea per line, a supporting symbol beside each idea, roughly a grade 3–5 reading level. It serves people with intellectual disability, who are a large share of DSP recipients and are almost always designed past.

A persistent toggle in the header, remembered between visits. Every view has its own Easy Read version — it is a **separate, simpler document**, not the standard screens restyled.

### Employer accessibility reviews

Every recommended job carries reviews from workers with disability, placed under the pay figures where the decision happens: a rating in stars **and in words**, the best and hardest bits, and a quote. Further quotes are one tap down.

> "No seat behind the counter. I lasted five weeks."

That is the thing a job ad never tells you. Demo data, badged as such on every card so the label travels with a screenshot.

### Never lose what you typed

Hours, needs, wages, current view and claim tab are saved as you go and restored **silently** on load — no welcome-back modal. Fatigue and brain fog mean sessions get abandoned mid-task; making someone re-enter their income is an accessibility failure even though no WCAG criterion names it.

Clearing is **undoable rather than confirm-guarded**. Modals are hostile to VoiceOver and brutal on Switch Control, and the undo never expires — a countdown is a barrier by itself.

### Show the working, and defuse the fear

Every figure can be expanded into the arithmetic that produced it. A **"What if this number is wrong?"** disclosure states plainly that Capable is not connected to Centrelink, cannot create a debt, and that reporting on time — not working fewer hours — is what keeps you safe.

Fear of accidental debt is an accessibility barrier, and it actively stops people taking hours.

### Dual labels for jargon

Plain sentence first, official term underneath and quieter, so the words make sense here **and** match the letter in your hand. Applied to *income free area*, *taper rate*, *stated support* and *self-managed plan*. Most services make you pick one.

### Help that is real

"Help and who to call" sits in the same header position on every view (WCAG 3.2.6). It says what to do when the app and a Centrelink letter disagree — *believe the letter* — and gives Services Australia, the NDIA, and the National Relay Service for people who would rather not phone.

### Fortnightly reporting countdown

The next reporting date, computed on-device from the fortnight cycle. Scheduled push would need a server; this gives the same reassurance and works offline.

### iPhone hardware

- **Photograph your payslip** — `capture="environment"` opens the rear camera. No OCR, but iOS Live Text lets you lift the figure off the photo, which beats transcribing a number from paper with a tremor. The image never leaves the device.
- **Share this** — `navigator.share` with a plain-text summary, falling back to the clipboard.
- **Keep screen on** — Screen Wake Lock, re-acquired when the tab becomes visible, so a slow reader is not locked out mid-page.

---

## Rules and figures modelled

### Disability Support Pension income test (single)

The two figures below are indexed on **different cycles**, so they never share a single "as at" date. Collapsing them into one is a real source of error.

- **Income free area: $226.00 per fortnight** — indexed 1 July each year, so this is as at **1 July 2026**. Earnings below it do not reduce the payment.
- Above it, the payment reduces by **50 cents per dollar**.
- **Maximum single rate: $1,200.90 per fortnight** — indexed 20 March and 20 September, so this is as at **20 March 2026**. This is the starting point the income test reduces from.

Every screen that uses these carries an *"Estimate only, not financial advice"* line, and the in-app accessibility statement says plainly that the rate is an estimate rather than a verified current figure.

### NDIS plan structure

The plan is modelled with the real constraints, not a flat pot of money:

- Three separate support budgets: **Core**, **Capacity Building**, **Capital**.
- Funding is flexible *across categories within the same budget*, unless a support is marked **stated**.
- Funding can **never** be moved between budgets. The UI says so explicitly.
- **Stated** supports can only buy the specific support named in the plan. They are flagged and **excluded from every "free to spend" total**.
- Burn rate is calculated per category against days elapsed in the plan year, with a projected run-out date and a plain-language alert when a category will not last.

### Concession card retention

If the payment stops because of work of 30+ hours a week or higher earnings, the **Pensioner Concession Card is retained for up to 2 years**. Surfaced as reassurance whenever the user looks at higher-hour jobs or an earnings level that zeroes the payment.

### Entitlements

Six real Queensland schemes with published annual values and official `qld.gov.au` links: Electricity Rebate, Reticulated Natural Gas Rebate, Pensioner Rate Subsidy Scheme, Pensioner Water Subsidy Scheme, Medical Cooling and Heating Electricity Concession Scheme, and the Companion Card (shown as non-cash, so it is not padded into the headline figure).

Discounts and cashbacks are **fictional demo partner data**, labelled on screen.

---

## Accessibility

Target: **WCAG 2.2 Level AA**, applied while writing each component rather than retrofitted.

### The basics

- Semantic HTML throughout — real `<button>`, `<input>`, `<fieldset>`, `<legend>`. No `div` acting as a control anywhere.
- Landmarks and heading levels never skipped. Skip link to `#main` as the first focusable element.
- Every input has an explicit `<label for>`; placeholders are never labels; hints wired with `aria-describedby`.
- Full keyboard operation, including the ARIA tabs pattern with roving `tabindex`. No keyboard traps.
- Visible focus everywhere. **`outline: none` appears nowhere in the stylesheet.**
- **Never colour alone** — every status carries an icon *and* words.
- Live regions on every number that changes. Regions are updated in place, never inserted, because iOS VoiceOver misses regions added after load.
- Errors explain the fix, tied to the field with `aria-describedby` + `aria-invalid`.
- `prefers-reduced-motion` respected — verified, not assumed: forced on, animation and transition durations collapse to `1e-06s` and smooth scrolling reverts to `auto`.

### WCAG 2.2 additions

- **2.4.11 Focus Not Obscured** — the sticky header and fixed tab bar are exactly what breaks this, so `scroll-margin` keeps a focused control out of both bands.
- **2.5.7 Dragging Movements** — the hours slider is never the only route. A typed number field and −/+ step buttons drive the same value, all three in sync. Dragging is impossible with a head pointer or a switch.
- **2.5.8 Target Size** — every target ≥24×24 (most are 44×44). Gaps between adjacent targets are audited too, not just sizes: the Claim tabs sat 4–6px apart, where a shaky tap lands on the neighbour.
- **3.2.6 Consistent Help** — same affordance, same header position, every view.
- **3.3.7 Redundant Entry** — job results compare against the wages already entered in the tracker. Nothing is asked twice.
- **3.3.8 Accessible Authentication** — met by having no authentication at all.

### iOS specifics

- **16px minimum on every text input**, so Safari stops force-zooming the page on focus and stranding you in a form you can only half see. Fixed with a floor, never with `user-scalable=no`.
- **Dynamic Type** — the root font follows your own Larger Text setting, so someone who has already told their phone they need big text opens the app and finds it correct. Scoped to coarse pointers, because `-apple-system-body` resolves to ~13px on macOS and would shrink the desktop app. Tested at the largest accessibility size.
- `inputmode` and `enterkeyhint` on every numeric field — fewer, larger keys, and Dictation stays available so voice entry comes free.
- **2.5.3 Label in Name** verified by computing the accessible name of every interactive element and checking the visible text appears inside it.
- The tap highlight is deliberately **kept**. iOS Safari has no Vibration API, so that flash is the only immediate confirmation a tap registered.

### Design

Warm earth tones on aged ivory, with a book serif for headings from the system font stack (no web font request).

The palette is deliberately **not** blue-green: discriminating those hues is exactly what declines with ageing and dementia, so a teal accent — the app's original palette — was the worst available choice for this audience. Colours are low-saturation and matt, contrast is high, and no status ever rides on hue alone.

Layout borrows Notion's discipline — quiet chrome, hairline borders, generous space, and secondary detail one tap down behind toggles — while refusing the parts that would hurt: no hover-revealed controls (there is no hover on a phone or under Switch Control), no sub-4.5:1 greys, and no borderless inputs.

### How it is verified

There is no test runner. Every change is checked before commit by:

1. Extracting the inline script and running it in Node under a DOM stub — catches init exceptions and checks the maths across all render paths.
2. **Screenshotting in headless Chrome and looking at it.** The DOM has lied more than once: `btn.hidden` read `true` while the button rendered, and a media query silently overrode a layout rule.
3. Checking every colour pair with a contrast script rather than by eye.
4. Reflow at 320px in an iframe (headless Chrome clamps to a 500px minimum viewport, so narrow screenshots crop rather than reflow) and at a 28px root font.

---

## Install it as an app

**iPhone/iPad:** open the live link in Safari → **Share** → **Add to Home Screen**. It launches full screen with its own icon and works offline.

**Android/desktop:** the browser offers Install; the app also shows its own prompt.

- `manifest.json` — `display: standalone`, relative `start_url`/`scope`, matched theme colours.
- 180 `apple-touch-icon`, 192/512 icons, and a 512 **maskable** icon inside the safe zone.
- `sw.js` — precaches the app. Navigations network-first so redeploys land; assets cache-first. A new worker reloads the page once on activation, so an installed app is not stuck on an old build.
- Safe-area insets so nothing hides under the Dynamic Island or home indicator. `env(safe-area-inset-bottom)` is wrapped in `max(…, 24px)`, because with `viewport-fit` unset it reports 0 while the home indicator still floats over content.

Deliberate differences from stock PWA boilerplate, all driven by accessibility:

- **Zoom is never disabled** — `user-scalable=no` is a documented 1.4.4 failure.
- **Orientation is `any`**, not locked to portrait (SC 1.3.4).
- **`viewport-fit` is left at default.** With `cover`, iOS 26 paints content under the status bar and its Liquid Glass scroll-edge effect frosts the header.

## Running it

```
open index.html
```

No install, no server, no build.

## Not built, deliberately

Sign-up or login, employer accounts or job posting, live bank/myGov/NDIS integration, push notifications, chat, and any state other than Queensland.

Four ideas were dropped as **blocked by having no backend**, with a shippable alternative instead of a stub: Web Push (→ on-device reporting countdown), passkey sign-in (→ stating plainly that there is no account), an Apple Wallet Companion Card (→ needs a signing certificate), and haptics (→ iOS Safari has no Vibration API).

## Known limits

Stated plainly here and in the in-app accessibility statement:

- **No disabled person has tested this yet.** That is the test that actually counts, and everything above is structural verification, not lived verification.
- **The $1,200.90 maximum rate is not independently verified.** Check it against Services Australia before relying on it.
- **Easy Read symbols are drawn inline**, because the app must stay one file with no external requests. A production build should use ARASAAC symbols, which are openly licensed and what the sector recognises.
- **Live microphone recognition is untested** in this repo — headless Chrome has no mic. The panel, greeting, live region, focus handling, tap route and matcher are all tested; the speech-to-text itself needs a device. It needs Safari 14.5+ on iOS, and where recognition is missing the panel says so and the buttons carry on.

## Disclaimer

A demonstration only. All figures are estimates for a fictional user. Not financial advice. Check your own situation with Services Australia and your plan with the NDIA.
