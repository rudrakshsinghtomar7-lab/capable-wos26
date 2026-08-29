# Capable

### 👉 [**Open the live app →**](https://rudrakshsinghtomar7-lab.github.io/capable-wos26/)

**Work, money and what you're owed.** A financial app for people with disability in Queensland, Australia.

Built for WOS26. Single self-contained `index.html` — no build step, no backend, no dependencies. Open the file, or visit the live site, and it runs.

**Live demo:** https://rudrakshsinghtomar7-lab.github.io/capable-wos26/

## What it does

Three modules, one connecting idea: *get work, understand the money, collect what you're already owed.*

1. **Job mapping** — matches people to work based on their capacity (hours available, accessibility needs), never their diagnosis. Every result shows fortnightly earnings and what those earnings do to the pension.
2. **Financial tracker** — wages, Disability Support Pension and NDIS plan funding in one place, on a **fortnightly** cycle. Most budget apps get this wrong.
3. **Claim** — Queensland government entitlements, plus demo partner discounts and cashbacks, that the user is eligible for but not collecting.

## The demo user

Sam Whitton, Woolloongabba (Brisbane). On the Disability Support Pension, self-managed NDIS plan, working 6 hours a week casual. The app opens already signed in, straight onto the dashboard. There is no sign-up, no login and no onboarding, by design.

## Rules and figures modelled

### Disability Support Pension income test (single, as at 1 July 2026)

- Income free area: **$226.00 per fortnight** — earnings below this do not reduce the payment.
- Above it, the payment reduces by **50 cents per dollar**.
- Maximum single rate used as the starting point: **$1,178.70 per fortnight** (base + pension supplement + energy supplement). Every screen that uses these carries an *"Estimate only, not financial advice"* line.

### NDIS plan structure

The plan is modelled with the real constraints, not a flat pot of money:

- Three separate support budgets: **Core**, **Capacity Building**, **Capital**.
- Funding is flexible *across categories within the same budget*, unless a support is marked **stated**.
- Funding can **never** be moved between budgets. The UI says so explicitly.
- **Stated** supports can only buy the specific support named in the plan. They are flagged with a lock badge and are **excluded from every "free to spend" total**.
- Burn rate is calculated per category against days elapsed in the plan year, with a projected run-out date and a plain-language alert when a category will not last.

### Concession card retention

If the payment stops because of work of 30+ hours a week or higher earnings, the **Pensioner Concession Card is retained for up to 2 years**. This is surfaced as a reassurance message whenever the user looks at higher-hour jobs or an earnings level that zeroes the payment.

### Entitlements

Six real Queensland schemes with published annual values and official `qld.gov.au` links: Electricity Rebate, Reticulated Natural Gas Rebate, Pensioner Rate Subsidy Scheme, Pensioner Water Subsidy Scheme, Medical Cooling and Heating Electricity Concession Scheme, and the Companion Card (shown as a non-cash entitlement, so it is not padded into the headline dollar figure).

Discounts and cashbacks are **fictional demo partner data** and are labelled as such on screen.

## Accessibility

Built to **WCAG 2.1 Level AA**, applied while writing each component rather than retrofitted.

- Semantic HTML throughout — real `<button>`, `<input>`, `<select>`, `<fieldset>`, `<legend>`. No `div` acting as a control anywhere.
- Landmarks: `<header>`, `<nav aria-label="Main">`, `<main id="main">`, `<footer>`. Heading levels never skipped.
- Skip link to `#main` as the first focusable element.
- Every input has an explicit `<label for>`; placeholders are never used as labels; hints are wired with `aria-describedby`.
- Full keyboard operation. The Claim tabs implement the ARIA tabs pattern with roving `tabindex` and Arrow/Home/End keys. No keyboard traps.
- Visible focus everywhere: `3px solid` outline with `3px` offset. `outline: none` appears nowhere in the stylesheet.
- Contrast: 4.5:1 body text, 3:1 large text and interactive controls, in both light and dark.
- **Never colour alone.** Every status carries an icon *and* words — "Running low: $340 left in Transport", not a red number.
- Live regions (`aria-live="polite"`) on every number that changes: job match count, income totals, plan totals.
- Errors explain the fix and are tied to the field with `aria-describedby` + `aria-invalid` — "Enter your wages as a number only, like 390 or 390.50."
- Hit targets 44×44px minimum.
- `prefers-reduced-motion` respected. No autoplay, no carousels, nothing flashing, no decorative animation.
- Plain language everywhere.
- Light and dark themes via `prefers-color-scheme`. Reflows cleanly at 400% zoom with no horizontal page scroll; wide tables scroll inside their own container.
- Every meter/bar has a `<table>` alternative *and* a plain-text statement of the same fact.
- `font-variant-numeric: tabular-nums` on all figures.

## Running it

```
open index.html
```

That's it. No install, no server, no build.

## Not built, deliberately

Sign-up or login, employer accounts or job posting, live bank/myGov/NDIS integration, notifications, settings pages, chat, and any state other than Queensland.

## Disclaimer

A demonstration only. All figures are estimates for a fictional user. Not financial advice. Check your own situation with Services Australia and your plan with the NDIA.
