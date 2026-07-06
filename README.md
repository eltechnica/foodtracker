# Ultimate Health Tracker

An all-in-one health app built with **Expo / React Native (TypeScript)**. It
tracks food, meals, weight, spend, and alcohol, and uses AI to estimate calories
from meal photos — with **your hand as a stable scale reference**.

> **Status:** MVP. The pure logic (portion math, nutrition/spend/weight
> aggregation, FitMenCook parsing, Apple Health export parsing) is fully
> implemented and unit-tested (56 tests). The UI is wired to it. Native health
> sync and a live AI key are the two things you plug in per the notes below.

## What it does

| Area | What's built |
|------|--------------|
| 📷 **AI meal photos** | Snap a meal (with your hand in frame). A vision model identifies foods and their pixel footprint; the app converts pixels → cm → grams → calories using your calibrated hand. Provider-agnostic: Mock (no key), Claude, or OpenAI. |
| ✋ **Hand calibration** | Measure your hand once. It scales both the photo math and the classic "palm of protein / fist of carbs" portion guide to *your* hand. |
| ⚖️ **Weight** | Manual entry, trend (smoothed) weight, weekly rate. Import Apple Health / Renpho weigh-ins from an `export.xml`. |
| 💳 **Spend & alcohol** | Log grocery / dining / alcohol / other. See eating-out share. Log drinks by volume × ABV → standard drinks + alcohol calories. |
| 👨‍🍳 **FitMenCook recipes** | Paste a recipe or a YouTube transcript; ingredients + quantities are auto-extracted. Log a serving straight into your day. |
| 📊 **Today** | One dashboard: calories, macros, spend, alcohol, weight at a glance. |

## Feasibility notes (important)

Some integrations have hard platform constraints — this is the honest picture:

- **Apple Health** has **no cloud/web API**. Live sync requires a native
  HealthKit module in a **dev/EAS build** (not Expo Go). The code targets that
  via `src/services/health/index.ts` (`AppleHealthKitProvider` + an injectable
  native bridge). As a **zero-native fallback that works today**, the app parses
  the "Export All Health Data" `export.xml` (`exportParser.ts`).
- **Renpho** has **no public API**, but the Renpho app writes weigh-ins into
  Apple Health. So the real pipeline is **Renpho → Apple Health → this app**;
  imported entries are tagged `renpho` vs `apple-health` by source name.
- **FitMenCook** has no public API. Supported paths: paste the recipe, paste a
  **YouTube transcript** (auto-extract ingredients), or manual entry.
- **AI calorie estimation** works today with any vision provider; the hand is
  the scale trick that makes single-photo portioning far more reliable.

## Architecture

```
src/
  domain/          Pure, framework-free logic (unit-tested)
    handScale.ts   Pixel→cm→volume→grams via the hand reference; portion guide
    nutrition.ts   Macro/calorie aggregation, daily totals
    spend.ts       Spend summaries + alcohol (standard drinks, ABV→calories)
    weight.ts      Trend weight (EWMA), weekly rate, net change
    fitmencook.ts  Ingredient/transcript parsing, per-serving nutrition
    types.ts       Shared domain types
  services/
    ai/            Provider-agnostic vision: Mock | Claude | OpenAI + estimate pipeline
    health/        HealthKit interface + Apple Health export.xml parser
  store/           Zustand store persisted to AsyncStorage
  ui/              Theme + reusable components
app/               Expo Router screens (Today, Meals, Weight, Spend, Recipes, Settings)
```

The domain layer imports **no** React Native / Expo — that's why it runs and
tests in plain Node, and why the numbers can't drift from the UI (derived values
are computed on demand, never stored).

## Running

```bash
npm install
npm test          # 56 unit tests for the domain + services
npm run typecheck # tsc --noEmit
npm start         # Expo dev server (press i / a / w)
```

### Use it as an installable app (no App Store)

The web build is a **PWA** deployed to GitHub Pages by the
`.github/workflows/deploy-pages.yml` workflow. Once Pages is enabled for the
repo (Settings → Pages → Source: **GitHub Actions**) and `main` has the code,
the app is live at:

```
https://eltechnica.github.io/foodtracker/
```

On iPhone: open that URL in **Safari → Share → Add to Home Screen** → it gets a
real icon and launches full-screen, no browser chrome. Works on Android/desktop
too.

### See it on desktop (fastest, local)

No phone or Xcode needed — run the **web** target and it opens in your browser:

```bash
npm install
npm run web       # opens http://localhost:8081 in your browser
# or build the static PWA the way CI does:
npm run build:web # outputs ./dist (open via any static server under /foodtracker/)
```

Everything works there except the truly native bits (live camera capture and
HealthKit); use **Library** to pick a meal photo and the Mock AI provider to see
the full flow. To run on a phone instead, install **Expo Go** and run
`npm start`, then scan the QR code.

- The app works out of the box with the **Mock** AI provider (no key needed).
- To use real AI: Settings → pick **Claude** or **OpenAI** → paste your API key.
- For live Apple Health sync you need a development build with the HealthKit
  entitlement (already declared in `app.json`); Expo Go can't read HealthKit.

## Roadmap (post-MVP)

- Native HealthKit bridge wired into `AppleHealthKitProvider` (dev build)
- Bank/receipt import for spend (Plaid or receipt OCR)
- Barcode / label scanning for packaged foods
- Goals & targets (calorie/macro/weight) with progress
- Multi-currency spend with FX
