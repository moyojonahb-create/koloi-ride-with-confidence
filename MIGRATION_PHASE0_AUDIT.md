# CruiXe — Phase 0 Migration Audit (Capacitor → React Native)

Audited against the working tree at commit `63699db0`, immediately after pulling
221 upstream commits. Every claim below was verified by reading the file, not
inferred from the brief. Where the brief has drifted from the repo, that is
called out explicitly.

**Verified baseline:** 424 TS/TSX files, 70,230 lines under `src/`. Matches the
brief exactly.

---

## 1. `src/` structure

| Folder | Files | Purpose |
|---|---|---|
| `src/components/` | 230 | All UI. Includes `ui/` (shadcn/Radix primitives), `ride/`, `driver/`, `admin/`, `wallet/`, `map/`, `luggage/`, `auth/` |
| `src/pages/` | 54 | Route-level screens — rider, driver, admin, marketing |
| `src/lib/` | 76 | Business logic, API/socket clients, design tokens, helpers. The bulk of what should move to `packages/core` |
| `src/hooks/` | 39 | React hooks — auth, realtime, ride state, driver status, calls |
| `src/integrations/` | 5 | Supabase client + generated `types.ts`, and a Lovable platform integration |
| `src/test/` | 16 | Vitest suites |
| `src/assets/` | — | Car/logo images (non-code) |
| `src/data/` | — | Static data (non-code) |

Entry: `main.tsx` → `App.tsx` (react-router-dom route table). `index.css`
carries the entire design-token system. `rum.ts` is Datadog init.

---

## 2. Capacitor plugins in use → RN equivalents

The native surface is **much smaller than expected**. Only `@capacitor/core` is
statically imported (2 files); all six plugins are dynamic-imported from a single
call site each, mostly inside `src/lib/nativeBridge.ts`. Total files touching
Capacitor: **4**.

| Capacitor plugin | Used in | RN equivalent |
|---|---|---|
| `@capacitor/geolocation` | `nativeBridge.ts` | `expo-location` / `react-native-geolocation-service` — but see §5, background is the real work |
| `@capacitor/haptics` | `lib/haptics.ts` | `expo-haptics` or `react-native-haptic-feedback` |
| `@capacitor/keyboard` | `nativeBridge.ts` | RN `Keyboard` API + `react-native-keyboard-controller` |
| `@capacitor/splash-screen` | `nativeBridge.ts` | `expo-splash-screen` |
| `@capacitor/status-bar` | `nativeBridge.ts` | `expo-status-bar` / RN `StatusBar` |
| `@capacitor-community/contacts` | contact picker | `expo-contacts` / `react-native-contacts` |

**Implication:** the Capacitor→native mapping is a day of work, not a phase. The
real migration cost is the UI layer, not the native bridge.

---

## 3. DOM/browser-only dependencies → RN replacements

Counts are **files importing the package**, measured directly.

### Blocking, high-reach

| Package | Files | Replacement | Notes |
|---|---|---|---|
| `lucide-react` | **218** | `lucide-react-native` | **The brief omits this entirely.** Highest-reach dependency in the app. Same icon set and names, so it is close to a find-and-replace — but it touches more files than anything else on this list. |
| `sonner` | 68 | `burnt`, `react-native-toast-message`, or a custom sheet | Toast call sites are simple; mechanical. |
| `framer-motion` | 67 | `react-native-reanimated` (+ `moti` for a similar declarative API) | Real rewrite. `moti` gets closest to existing `animate`/`initial` syntax. |
| `react-router-dom` | 61 | React Navigation | Route table in `App.tsx` maps cleanly; deep links + the `/ride/:id` redirect need re-expressing. |
| Radix UI (`@radix-ui/*`) | 32 | Rebuild on RN primitives + `@gorhom/bottom-sheet` | 26 Radix packages installed. Most sit behind `components/ui/*`, so rebuild the wrapper layer, not 32 files of call sites. |

### Blocking, contained

| Package | Files | Replacement | Notes |
|---|---|---|---|
| `mapbox-gl` | **0 static imports** | `@rnmapbox/maps` | **Correction to the brief:** Mapbox is *not* an npm import at runtime — `src/lib/mapboxLoader.ts` injects `https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js` from CDN. `MapboxMap.tsx` builds markers with `document.createElement` and drives `addSource`/`addLayer` imperatively. This is a **full rewrite, not a port** — and it is the single largest item in the migration. |
| `recharts` | 6 | `victory-native` / `react-native-gifted-charts` | Admin + earnings charts only. |
| `agora-rtc-sdk-ng` | 1 | `react-native-agora` | Contained to `hooks/useAgoraCall.ts`. Small surface, but unverified end-to-end today (see §"Known gaps"). |
| `leaflet` | 2 | Drop, or `@rnmapbox/maps` | Only `OSMMap.tsx` + one admin screen. |
| `leaflet.offline` | **0** | — | **Correction to the brief:** declared in `package.json` but never imported. Dead dependency. There is no existing offline-tile feature to preserve. |
| `next-themes` | 3 | Context + AsyncStorage | Drives dark mode; see §"Design tokens" for why this matters more than it looks. |
| `@sentry/react` | 2 | `@sentry/react-native` | Straightforward. |
| `@datadog/browser-rum` | 1 | Drop | Recommend Sentry alone on mobile. Carrying a second RUM SDK is not worth the bundle or the setup for a 1-file integration. |
| `@lovable.dev/cloud-auth-js` | 1 | **Exclude from mobile** | `src/integrations/lovable/index.ts`. Platform-specific to Lovable; must not enter `packages/core`. |
| `vaul`, `cmdk`, `embla-carousel-react`, `react-day-picker`, `input-otp`, `react-resizable-panels` | 1 each | `@gorhom/bottom-sheet`, custom, `react-native-reanimated-carousel`, `react-native-calendars`, custom OTP input, drop | All single-file; low risk. |

### Web Push (not in the brief's list)

`src/lib/push.ts` is a **VAPID Web Push implementation** backed by the
`public/sw.js` service worker registered in `main.tsx:140`. Service workers,
`Notification`, and the Push API do not exist in React Native. This is deleted
and replaced by FCM, not ported.

---

## 4. Confirmed portable (no changes expected)

| Package | Files | Verdict |
|---|---|---|
| `@supabase/supabase-js` | 6 | Isomorphic. Only the auth storage adapter changes (§"Supabase client"). |
| `date-fns` | 28 | Pure JS. No change. |
| `zod` | 7 | Pure JS. No change. |
| `react-hook-form` | 6 | Works in RN; inputs bind to RN components via `Controller`. Schemas unchanged. |
| `@tanstack/react-query` | 4 | Works in RN as-is. |
| `class-variance-authority` / `tailwind-merge` / `clsx` | 11 | Pure JS; useful if NativeWind is adopted. |

---

## 5. Expo vs bare React Native

**Recommendation: Expo (managed + EAS Build + custom dev client) — with one
condition I could not verify offline.**

The case for Expo here is unusually strong because it directly solves a listed
gap: EAS Build replaces the hand-signed AAB process (gap #4) as a side effect
rather than as extra work, and `expo-*` modules cover five of the six Capacitor
plugins one-for-one.

**What I could not verify, and will not assert:** current (2026) Expo config-plugin
compatibility for `react-native-agora` and `react-native-background-geolocation`.
This machine has no package-registry access during this audit, and the brief
explicitly asks for verification rather than assumption. Both are the classic
"needs a custom dev client" cases; both have historically had community config
plugins. **This must be confirmed against the live registry before Phase 1 is
committed to.** If either fails, the honest answer is bare RN + Fastlane, because
background location and voice calling are not features this product can drop.

**Verified since (web search, Sept 2026):** neither library forces bare RN.
`react-native-agora` (v4.6.2) has no first-party config plugin but Agora
documents Expo integration via a custom dev client;
`react-native-background-geolocation` added Expo support in v4.9.2 with a config
plugin and an official `INSTALL-EXPO.md`. **Decision: Expo + custom dev client +
EAS Build.**

**One caveat, and it is not a footnote.** There are field reports of background
tracking stopping on screen lock under the Expo workflow — the exact capability
this migration exists to deliver. So the decision above is **provisional until
the spike passes**: see `apps/spike-background-location/RUNBOOK.md`.

That spike runs **immediately after the scaffold and before any real screen**,
not in Phase 2's normal slot. The reasoning: if the managed workflow genuinely
cannot do reliable background location, the answer is ejecting to bare RN, which
invalidates the EAS Build argument that chose Expo in the first place.
Discovering that after building screens on Expo assumptions is expensive.
Discovering it now costs a day.

Fallback if the spike fails on devices with meaningful driver share → **bare RN
CLI** + Fastlane + GitHub Actions (Phase 5 gets bigger, nothing else changes).

---

## Corrections to the brief

1. **`leaflet.offline` is unused** — no offline tile feature exists to replace.
2. **`mapbox-gl` is CDN-loaded, not imported** — the map is a rewrite, not a swap, and `MapboxMap.tsx` is raw DOM.
3. **`lucide-react` (218 files) is missing from the brief** — the highest-reach DOM dependency in the app.
4. **There are two HTTP clients, not one.** The brief covers `goBackendClient.ts`. There is also `src/lib/backendClient.ts` — older, carrying the typed wallet/ride domain calls (`walletPayRide`, `cancelRide`, `updateRideFare`, …), with **no timeout and no circuit breaker**. On mobile networks an untimed fetch can hang indefinitely. Consolidate during the port rather than carrying both.
5. **The design system is two systems, not one** (see below).
6. **`goBackendClient.ts` is not portable "as-is"** (see below).

## Design tokens — bigger than the brief assumes

Verified values: `--cruixe-red: 4 96% 37%` ≈ **#B81104** , `--cruixe-yellow:
52 100% 50%` = **#FFDD00** ✓, `Sora` body / `Space Grotesk` display ✓.

**The CSS HSL values are rounded approximations of the brand hex, and
round-tripping them loses the brand colour.** `#B81104` is actually
`hsl(4.33 95.7% 36.9%)`; CSS rounds it to `4 96% 37%`, and converting that back
yields **`#B91004`** — one off in two channels. `#7F0B02` likewise comes back as
`#7E0A02`. Yellow survives exactly, which is why this is easy to miss by
spot-checking one colour.

Caught by testing the conversion rather than assuming it. `packages/core` now
carries canonical hex explicitly (`theme.brandHex`) for the documented colours,
marked `canonical: true`, and flags the pink theme's values as derived
(`canonical: false`) since no published hex exists for them. **React Native must
read `theme.brandHex`, never `hslToHex(theme.brand.red)`.**

### Accepted divergence: web and mobile reds differ by one step in two channels

Mobile now renders the exact brand red (`#B81104`). The web app continues to
render the rounded HSL (`#B91004`) because its CSS is Lovable-owned and
correcting it would mean editing files Lovable regenerates, breaking the
zero-diff discipline that keeps the web app shipping.

**This is accepted, not outstanding.** The difference is one step in R and one
in G — imperceptible side by side, and mobile is the one that is correct. Do not
"fix" the mobile values to match web; that would reintroduce the drift. If web
ever moves off Lovable, align it upward to `#B81104` at that point.

But a flat token file would lose two things:

- **Four theme permutations, not one.** `index.css` defines `:root`,
  `.dark`, `[data-theme="female"]`, and `[data-theme="female"].dark`. The female
  theme **repoints `--cruixe-red` to pink** (`330 75% 45%`) and is auto-enabled
  for female drivers in `DriverDashboard.tsx`. The token file must be structured
  as themes × tokens.
- **A parallel inline-style system.** `src/lib/rideGlass.ts` exports hardcoded
  hex constants (`RIDE_RED = '#B81104'`, gradients, glass surfaces) consumed by
  **25 files** — the entire redesigned rider/driver ride flow. These are inline
  styles, not Tailwind classes, and they do **not** respond to the CSS themes at
  all (a known issue, previously documented). Two consequences: (a) those 25
  files port to RN `StyleSheet` more easily than the Tailwind ones, and (b)
  NativeWind will not be the authoring mode for the most important screens, so
  the Phase 3 "rebuild with NativeWind" instruction is only half right.

## Portability notes on the three "portable" files

All three are structurally portable, but none is drop-in:

- **`import.meta.env` is Vite-only** and appears in all of them. Metro/Hermes has
  no equivalent. Config must be **injected** into `packages/core`, not read from
  the ambient environment.
- **`goBackendClient.ts`** — circuit breaker verified present and correct (3×401,
  30s, closes on `SIGNED_IN`/`TOKEN_REFRESHED`/`SIGNED_OUT`). Blockers: the
  `import.meta.env.DEV ? "/go-api"` branch is a Vite dev-proxy concept that is
  meaningless in RN; `AbortSignal.any` needs a Hermes check; module-level
  `supabase` import needs DI.
- **`backendSocketClient.ts`** — heartbeat/backoff/queue/ref-counted rooms all
  verified as described. Blockers: line 8 reads **`location.protocol` /
  `location.host`**, which do not exist in RN and will throw; `new URL` +
  `searchParams` needs `react-native-url-polyfill`; module-level singleton +
  `onAuthStateChange` side effect needs a factory.
- **`integrations/supabase/client.ts`** — confirms the brief's guess:
  `brokeredPreviewStorage()` is **definitively browser-only** (it uses
  `window.parent.postMessage`, `location.hostname`, `localStorage` to broker
  sessions to the Lovable editor). Swap for AsyncStorage. Also: the error path
  writes **`document.body.innerHTML`**, which will throw in RN. Header is
  `x-client-info: pickme-web` — mobile should send its own value.

## Known gaps confirmed (do not port forward)

1. **No native push.** No FCM, no `@capacitor/push-notifications`. What exists is Web Push + service worker — unusable on RN and unreliable in the Capacitor WebView. Full replacement.
2. **No background location.** `DriverDashboard.tsx` uses `setInterval` + `getCurrentPosition` (lines 217, 245). **Worse than the brief states:** the *presence heartbeat* is on a timer too, so a locked screen silently marks the driver offline — this is the likely mechanism behind the "driver goes offline without turning offline" bug reported in testing. A real foreground service fixes both.
3. **Wallet settlement.** Backend gap, out of client scope — RN wallet screens must not imply funds move.
4. **No Android CI/CD.** Confirmed: no build workflow; `.github/workflows/ci.yml` does not produce signed artifacts.
5. **Agora unverified end-to-end.** Contained to one hook; needs a real two-account call test.

---

## Two upstream bugs the port's tests surfaced

Both are pre-existing in the web client and were **ported faithfully rather than
quietly repaired**, because web and mobile must not silently diverge on
behaviour while both are live. Each is locked by a test named to make the
discrepancy deliberate, so the next person doesn't "fix" it into a real change.

**1. The auth circuit breaker opens after 2 failed calls, not the documented 3.**
A 401 whose refresh fails calls `noteAuthFailure()` twice for the same response
— once in the refresh-failed branch, once in the `!response.ok` branch. The
threshold constant and its comment both say 3. Practical effect: the breaker is
twice as trigger-happy as designed, so a user with one genuinely expired session
reaches a 30-second backend lockout faster than intended. Low severity, trivially
fixable — but fix it in both clients or neither.

**2. `reconnectWithFreshToken()` does not refresh the token.** `openSocket()`
picks `refreshToken()` only when state is `'reconnecting'`, but every path into
`connect()` nulls `this.ws` first and `connect()` derives state from `this.ws` —
so state is always `'connecting'` and `getToken()` always wins. The refresh
branch is dead code.

On web this is harmless: reconnects are driven by `TOKEN_REFRESHED`, by which
point the session already holds the new token, so refreshing again would be a
redundant round trip. **On React Native it is a real Phase 2 risk**: the app can
be backgrounded for hours with timers suspended, and on resume the socket
reconnects against whatever `getSession()` still has cached, with no forced
refresh. Web never sees this because tabs stay alive and supabase-js keeps
refreshing underneath. Worth revisiting alongside the backgrounding work.

## Live issue found during the audit: mobile telemetry is reporting nothing

Not a migration item — an active production problem, found while trying to pull
a device breakdown for the background-location spike.

**Symptom.** Over 90 days the `cruixe-web` Sentry project holds **2 error
events**, both Chrome on Windows (a developer machine). The remaining 98 are
`cruixe-api` — Railway containers. **Zero events from Android**, while a closed
test is running.

**Misrouting is ruled out.** Both organisations on the account were checked. The
other org, `pickme-63`, contains one project (`flutter`, a leftover from an
earlier experiment — worth deleting) with **zero events in 90 days**. So across
both orgs the entire 90-day total is those same 100 events. The pre-28-Aug builds
are not reporting to the old project; **they are not reporting at all.** Events
are not being misrouted, they are not being sent.

That leaves two live candidates, and points hard at the second:

**1. The DSN moved organisation and project on 2026-08-28** (commit `e2d0882d`):

```
before  https://fae54652…@o4511199932645376.ingest.de.sentry.io/4511200277692496
after   https://dd32fb52…@o4511105677328384.ingest.de.sentry.io/4511989333098576
```

Different org *and* different project — not a rotation. Any AAB built before
28 Aug reports to the old project. If the testers' installed build predates that
commit, their crashes have been arriving somewhere else all along.

**2. `enabled: import.meta.env.PROD` (src/main.tsx:45) fails silently.**
`package.json` offers both `build` and `build:dev`, and `build:dev` runs
`vite build --mode development`, which makes `import.meta.env.PROD` **false** and
disables Sentry outright. There is no Android CI (confirmed: no `cap sync` or
bundle step in either workflow), so the AAB is hand-built — and one wrong script
silently ships a build with no telemetry and no warning. The same flag gates
sourcemap upload (`vite.config.ts:51`), so a dev-mode build also produces
unreadable stack traces even if events did arrive.

**Discriminator — must use a PRODUCTION-script build.** An earlier draft of this
said "install a debug build," which is a false negative waiting to happen: a
`build:dev` AAB has `PROD` false, so Sentry never initialises and *nothing
arrives whether or not production builds work*. That test would have "confirmed"
the bug regardless of the truth.

The correct test:

1. `npm run build` (**not** `build:dev`) → `npx cap sync android` → assemble the
   AAB → install on a device → trigger a deliberate error → watch `cruixe-web`.
   - **Event arrives** → production builds are fine; whatever shipped to testers
     was built with the wrong script. Rebuild and re-upload.
   - **Nothing arrives** → something deeper than the flag. Check WebView network
     egress and whether `initTelemetry()` runs at all in the packaged app.
2. Optionally repeat with `build:dev`. If prod reports and dev does not, the
   mechanism is confirmed *and* you know which script silently shipped a blind
   AAB.

**A fix that does not wait on this answer.** `telemetry-observability.patch`
(repo root, unapplied, for review) makes a native build report regardless of
which script produced it, logs the resolved project id at init, and emits a boot
event. That is correct under either cause, because the actual root problem is
that "disabled" and "enabled but quiet" look identical from outside. The boot
event also makes real cold-start volume visible — which matters, because the
alternative explanation for zero events is that **no tester has genuinely used
the app**, and that carries its own Play Store deadline.

**Worth fixing in the Capacitor app now, not just inheriting correctly in RN.**
The underlying flaw is that telemetry being off is indistinguishable from
telemetry being on and quiet. Whatever the cause, the fix is to make the state
observable — log the initialised DSN's project id at startup, or emit a
deliberate boot event — so "are we receiving crashes?" is answerable in seconds
rather than by inference.

**Side effect for the migration:** `@sentry/react` is a *browser* SDK running in
a WebView, so `device.family` is empty on every event and always would be. The
device breakdown for the spike must come from **Play Console**, not Sentry —
already reflected in the spike runbook. `@sentry/react-native` would populate
these properly, which is a point in favour of the RN move independent of
everything else.

## Backlog — not built, recorded so it is not lost

### Pre-permission priming screen in driver onboarding

Before triggering the OS location prompt, show a CruiXe-branded screen that
explains why background location is needed, then trigger the system dialog from
a button on it.

**Why it matters more than it looks.** "Always Allow" is effectively one-shot: a
driver who taps "Don't Allow" cannot be re-prompted by the app: recovery means
talking them through iOS Settings → Privacy → Location Services, or Android's
equivalent, which in practice means a support conversation per driver. Drivers
who have just read a plain-language explanation in the app's own UI grant at
materially higher rates than drivers ambushed by a system alert mid-onboarding.

The system dialog string is deliberately short (see
`docs/app-store-review-notes.md` for why), so the priming screen is where the
fuller explanation belongs on the user-facing side — the rider-watching-the-map
mechanism, the screen-off case, and the offline boundary.

Design notes for whoever picks it up:

- Show it **after** the driver understands they are going online, not on first
  launch. Context is what makes it persuasive.
- Never trigger the OS prompt automatically on screen entry — the whole point is
  that the driver taps a button having read why.
- Provide a recovery path: if permission is already denied, deep-link to
  Settings rather than showing the same priming screen again.
- Applies to both platforms, with different copy — iOS asks for "Always"
  separately after "While Using"; Android 11+ likewise splits background
  location into its own Settings-only step.

## Profile phone write — a latent defect, and a corrected inference

**Corrected.** An earlier pass concluded the null `phone` columns were caused by
web's signup write silently skipping. That conclusion was wrong, and the
correction matters more than the original finding.

### What is actually true

`PATCH /api/profiles/me` accepts `phone` — `only(payload, "full_name", "phone",
…)` in `backend/internal/business/handler.go:571`. The endpoint is fine.
`handle_new_user()` copies only `full_name`, and no trigger populates `phone`,
so the client write is the only path that sets it.

Web writes it in `src/pages/Auth.tsx`:

```ts
const { data: authData } = await supabase.auth.getUser();
if (authData?.user) { await updateMyProfile({ phone: formattedPhone }); }
```

**The guard is a real latent defect.** When `signUp()` returns no session — what
email confirmation does — `getUser()` resolves null, the guard is false, and the
write is skipped with no error, no log and no retry. Signup still shows its
success toast and navigates, so the failure would be completely invisible.

### Why it is not the cause of the observed nulls

Queried directly against the database:

| Evidence | Reading |
|---|---|
| March account: 193s between signup and confirmation | Email confirmation was **ON** |
| June account: 0.033s, auto-confirmed | Confirmation was **OFF** by then |
| Neither user has `phone` in `raw_user_meta_data` | Neither used the phone-signup path |
| June account has no `full_name` either | Not created through the normal signup form |

Confirmation is **off today**, so the guard passes and web's write should be
firing. The two null phones belong to accounts that never went through phone
signup, so they say nothing about whether the write works. **The defect is real
and worth fixing; the nulls are not its evidence.**

### Why `pendingProfile.ts` is still justified

Not by "signup-then-confirm-later" — that was the weaker argument resting on the
same mistaken inference. The real justification is **robustness to the
confirmation setting changing underneath the code**, and on this project it
demonstrably does: it has already been flipped once between March and June.

A fire-and-forget write is correct only while confirmation stays off. Nothing in
the codebase records that dependency, nothing fails when it is flipped, and the
symptom — phone numbers quietly stopping — would surface as a data-quality
puzzle weeks later. Queueing is correct under either setting, which is why
mobile queues to AsyncStorage and flushes on the auth event that delivers a
session, retrying on the next sign-in if it fails.

**Open item for web:** the guard should either write unconditionally through a
queue, or fail loudly when it cannot write. It currently does neither. Low
urgency while confirmation is off; it becomes a live bug the moment it is not.

## Fare calculation audited against live `town_pricing` — one shared bug found

Audited the ported `calculateRecommendedFare` field-by-field against the real
table (13 towns, queried directly). **The port is faithful. The calculation it
faithfully reproduces has a defect.**

That distinction is the point of this section: "byte-for-byte the web
calculation" was an accurate description of the port and a useless statement
about correctness.

### Field-by-field

| Field | Consumed by the fare calc? | Notes |
|---|---|---|
| `base_fare` | ✅ | |
| `per_km_rate` | ✅ | |
| `minimum_fare` | ✅ | Clamped **before** rounding — see the rounding note |
| `night_multiplier` | ✅ | Per-town, read from the row. All 13 towns are 1.2 |
| `demand_multiplier` | ✅ | All 13 towns are 1.0, so currently inert but wired |
| `offer_floor` | ✅ | `tripFloor = max(offer_floor, minimum_fare)` |
| `offer_ceiling` | ✅ | `tripCeiling = min(offer_ceiling, 2 × fare)` |
| `currency_code` / `currency_symbol` | ✅ | Passed through |
| **`short_trip_fare`** | ❌ **never read** | **Bug — see below** |
| **`short_trip_km`** | ❌ **never read** | **Bug — see below** |
| `is_negotiation_enabled` | ❌ not read | Not a fare input; admin-editable only. Noted, not a fare defect |

### BUG-001 — `short_trip_fare` / `short_trip_km` are configured but dead

**Present in both `src/hooks/useTownPricing.ts` and
`packages/core/src/pricing/fare.ts`. Not a port defect — a shared bug.**

Grepped across the whole web app: `short_trip_fare` and `short_trip_km` appear
only in the type definition, the default object, generated Supabase types, test
fixtures, and **the admin editor** (`src/pages/admin/AdminTownPricing.tsx:164`,
which renders both as editable number fields). **No calculation anywhere reads
them.**

All 13 towns have both populated. `short_trip_km` is 2 in every row, and
`short_trip_fare` equals that town's `minimum_fare` exactly in every row.

**Why this is worse than an unused column.** Operations staff can open the admin
UI, set a town's short-trip fare, save it, and see it persist — and it changes
nothing. Config that is editable, persisted, and inert is worse than config that
is absent, because absent config prompts a question and inert config produces
false confidence.

**Worked example, Victoria Falls** (`base_fare` 3.00, `per_km_rate` 1.20,
`short_trip_fare` 2.50, `short_trip_km` 2):

| Trip | Configured intent | What is actually charged |
|---|---|---|
| 1 km, daytime | 2.50 flat | 3.00 + 1.20 = 4.20 → rounds to **4.00** |

A 60% overcharge on the shortest trips, in every town, if the intended semantics
are a flat short-trip fare. **The intended semantics are a product question and
this audit does not assume them** — but the fields are unreadable by any code
path, which is a defect under every reading.

**Do not "fix" this in core alone.** Fare arithmetic diverging between the two
clients would mean the same trip quotes differently on web and mobile, which is
materially worse than both being consistently wrong. This needs a product
decision on the intended semantics, then a change landed in both.

#### BUG-001 is BLOCKED — and the blocker is a product decision, not engineering

**Nobody should write the fix until this is answered:**

> Does `short_trip_fare` mean **a flat fare** for trips under `short_trip_km`,
> or **a floor** applied to them?

The two readings produce different prices for the same trip. A 1 km Victoria
Falls ride is **$2.50** under the flat reading and **$4.00** under the floor
reading (since the distance-based fare already exceeds the floor). Nothing in
the schema, the admin UI, or the code distinguishes them, because no code
consumes the fields at all. **This is an owner decision.** Engineering can
implement either in under an hour; guessing which is what produces a pricing
incident.

**Commercial weight, and it is not small.** Short trips are plausibly the modal
trip in the pilot towns — Gwanda, Beitbridge and Plumtree are small enough that a
sub-2 km ride is the ordinary case, not an edge case. If the flat reading is
correct, the app is currently quoting roughly **60% over configured intent on
the most common trip**, in a market where the alternative is informal transport
competing directly on price. That is the kind of gap that shows up as
unexplained low conversion rather than as a bug report, because riders who think
a fare is too high simply do not book.

**Landing rule when it is settled:** the change goes into
`src/hooks/useTownPricing.ts` and `packages/core/src/pricing/fare.ts` **in the
same commit**, with a shared test asserting the agreed semantics on both sides.
A staged rollout where one platform gets the fix first is explicitly not
acceptable here — two clients quoting different prices for the same trip is a
trust problem, and a rider comparing with a friend will find it immediately.

### The $0.50 hard floor is vestigial, not a floor

`fare = Math.max(fare, 0.5)` runs *after* the `minimum_fare` clamp. The lowest
`minimum_fare` across all 13 towns is $1.00, so **the $0.50 floor can never
bind.** It is dead code. The 3c report described it as if it were the operative
floor; `minimum_fare` is.

### Latent: rounding can drop below `minimum_fare`

The clamp is applied *before* rounding to the nearest $0.50:

```
fare = Math.max(fare, pricing.minimum_fare);   // clamp
fare = Math.round(fare * 2) / 2;               // then round — can go down
```

Every current `minimum_fare` is an exact multiple of $0.50 (1.00, 1.50, 2.00,
2.50), verified for all 13 rows, so rounding cannot currently move a clamped
fare below the minimum. **It is reachable, though:** the admin UI accepts
arbitrary values, and a `minimum_fare` of $1.60 would round to $1.50 — a fare
below the configured minimum, with nothing to catch it.

**Code fix when the shared change is made:** clamp after rounding, or round up
rather than to-nearest. Same both-or-neither rule as BUG-001 — it lands in
`src/hooks/useTownPricing.ts` and `packages/core/src/pricing/fare.ts` together,
because it changes quoted prices and divergence here has the same trust cost.

**Cheaper mitigation, and it should happen regardless:** constrain the
`minimum_fare` input in `src/pages/admin/AdminTownPricing.tsx` to $0.50
increments (`step="0.5"` plus validation on save). That makes the bug
**unreachable by construction** rather than unreachable by luck.

Today it is luck. All 13 rows happen to be exact multiples of $0.50, so nothing
misbehaves — but that is a property of the current data, not of the system, and
the admin UI accepts any value. One ops user typing `1.60` into a field that
offers no resistance reintroduces it, and the symptom would be a fare $0.10
below the configured minimum: far too small to notice, and wrong in the
direction that costs the business money on every short trip in that town.

Note the input constraint is a **web-only admin change** and therefore does not
carry the both-or-neither obligation — there is no mobile admin screen, and
mobile never writes `minimum_fare`.

## The increment gate is `node scripts/verify.mjs` — do NOT make it an npm script

`scripts/verify.mjs` runs every gate in one command: core typecheck, mobile
typecheck, the core suite, both platform bundles, and the web zero-diff check.
Every gate runs even when an earlier one fails, so one run reports every problem
rather than the first, and the exit code is non-zero if any failed.

**It exists because a green test run twice masked a broken build.** Vitest does
not typecheck, so `packages/core` carried a real `TS2493` while 89 tests passed;
before that, the `.js`-extension bug bundled-failed while `tsc` was clean.
Different resolvers fail differently, and reporting "gates green" after checking
whichever one was edited last is how both got through. The fix is a choke point,
not a resolution to remember.

### Why it is deliberately not `npm run verify`

The obvious convenience is a `"verify"` entry in the **root** `package.json`.
**Do not add one.**

Root `package.json` is the web app's manifest. It is covered by the byte-identical
rule, and it is **Lovable-regenerated** — Lovable's tooling owns and rewrites it.
An entry added there would eventually be clobbered by a regeneration, and the
failure mode is the bad one: `npm run verify` starts reporting "missing script"
or, worse, someone quietly stops running it and the gate silently stops being
mechanical. **A gate that people believe is running and is not is worse than
never having claimed one.**

`node scripts/verify.mjs` is equally mechanical, lives in a file Lovable does not
touch, and keeps the zero-diff invariant intact. That invariant is what lets the
web app keep shipping from Lovable while the migration proceeds underneath it;
trading it for four saved keystrokes is a bad trade.

**If you are reading this because you were about to add the npm script: that is
the thing this section exists to stop.**

---

## Native config batch — apply together, rebuild once

Changes in this section alter native project config, so each one costs a full
EAS build and a redistributed dev client. They are therefore **batched
deliberately and applied in a single rebuild**, not merged as they are
discovered. Nothing here is urgent enough on its own to justify a build; all of
it is blocking before a real track.

**Trigger for the batch:** whenever FCM push is added — that is a native change
that must happen anyway, and it is the natural carrier for the rest. Apply every
open row below in the same commit, then rebuild once.

### Scheduled: the 3c → 3d boundary

**The build happens between increment 3c (fare and configuration) and 3d
(request and realtime). Not earlier, not later.** This is a decision, not a
convenience, and it should not drift.

The reasoning is about *what each increment's gates can actually prove*:

| Increment | Needs a rebuild? | Why |
|---|---|---|
| 3a — shell and location | No | Bundles and typechecks prove the code; the GPS fix is the one gate deferred, accepted at the time |
| 3b — destination search | **No** | `useLandmarks`, `useStreets`, `placeCache`, `streetSearchRank` and the Nominatim proxy are pure JS over `fetch` and Supabase. Verifiable through the bundle with no native module |
| 3c — fare and configuration | **No** | Pricing, tiers, wallet reads and route estimates are pure JS |
| 3d — request and realtime | **Yes** | First increment whose gates genuinely need a device: socket behaviour across backgrounding, and the `AppState` foreground-resume path from DIVERGENCE-002 which by definition cannot be tested in a bundler |

Rebuilding before 3d would buy verification nothing 3b and 3c need, at the cost
of a ~15-minute EAS build and a 169 MB redistribution per test device on a link
that has already wedged once mid-download. Rebuilding after 3d would mean 3d's
gates are unverifiable at the moment they matter most.

**The build carries:** N-1 (`scheme`), N-2 (password-reset `redirectTo`), N-4
(`expo-location` autolink), plus whatever 3d itself turns out to require — which
is why it is scheduled at that boundary rather than fixed to a date. N-3 (FCM)
joins it if ready; it is not a blocker for the slice.

**Do not pull the build earlier for convenience.** The temptation will be to
rebuild as soon as N-4 blocks a visible gate on 3a. It already does, and that
was accepted deliberately: one gate deferred is cheaper than three rebuilds.

Until the batch lands, the features these enable simply do not work on device,
on either platform. That is accepted and recorded, not forgotten.

| # | Change | File | Blocks | Both platforms? |
|---|---|---|---|---|
| N-1 | `"scheme": "cruixe"` | `apps/mobile/app.json` | All deep links. `/track/:tripId` is the one route genuinely linked from outside — riders share tracking. Also required by React Navigation's `linking` config. | Yes — iOS URL types and Android intent filters both derive from it |
| N-2 | Password-reset `redirectTo` | `apps/mobile/app.json` + Supabase dashboard redirect allow-list | `/reset-password`. Web uses `${window.location.origin}/reset-password`, which has no device equivalent; mobile needs `cruixe://reset-password`, so it depends on N-1 | Yes |
| N-3 | FCM push (the carrier change) | `app.json` plugins, `google-services.json`, APNs key | All notifications. Web Push (`src/lib/push.ts` + `public/sw.js`) is service-worker based and deleted rather than ported | Yes — APNs for iOS, FCM for Android |
| N-4 | `expo-location` native module | already in `package.json`; needs autolinking into a build | The rider location path in increment 3a. Installed after build `b2146450`, so its native module is **not in the current dev client** — `requestForegroundPermissionsAsync()` fails with "Cannot find native module 'ExpoLocation'" until a rebuild | Yes |

**On N-4 specifically.** The obvious shortcut is to use
`react-native-background-geolocation` instead, since it *is* in the current
binary and already permissioned. **Do not.** The spike harness registers a
global `BackgroundGeolocation.onLocation` listener that appends every fix to the
spike log (`apps/mobile/App.tsx` → `appendFix`). A rider screen requesting a
position through that library would write phantom fixes into an S0–S6
measurement and silently corrupt it — the results would look like the platform
delivering extra fixes rather than the app asking for them.

The separation is also correct independently of the spike: background-geolocation
is a driver-side always-on foreground-service concern, while a rider wanting one
fix to centre a map is a foreground one-shot. They should not share a source
even after the spike ends.

**Note on N-2:** the Supabase redirect allow-list is a dashboard setting, not a
repo change, and is easy to forget because nothing in the codebase references
it. A `redirectTo` that is not on the allow-list is silently ignored and the
user lands on the site URL instead — which on mobile means the link appears to
do nothing at all.

**Do not apply these one at a time.** Each costs ~15 minutes of EAS build plus a
169 MB redistribution to every test device, on a link that has already proven
unreliable. Three separate rebuilds buy nothing over one.

## Build toolchain: EAS cloud only — no local Gradle stack

**Decision: the local Android toolchain is out of scope and will not be set up.**
Builds go through EAS in the cloud. The development APK has already built
successfully as `b2146450-4cf0-4bd8-971d-18300602489a`, which is the artifact
being installed on physical devices for the spike.

A local JDK / Android SDK / Gradle stack is required *only* for `expo
run:android` local Gradle builds, which are not in the plan. Anyone tempted to
"just get the local build working" should stop and read this section first: on
the pilot's 160 KB/s hotspot link, the Gradle `-all` distribution alone is a
~230 MB download, and it buys nothing EAS does not already provide.

Partially installed during the aborted attempt and left in place — harmless, but
noted so nobody mistakes it for a working local build path:

- Temurin JDK 17.0.20.1 at `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot`
- `JAVA_HOME` + PATH set at User scope
- Android `cmdline-tools` 23.0.0 and `platforms;android-36`

Gradle itself was never installed and no Gradle task was ever run.

Two facts worth keeping from the attempt, since they will resurface:

- `sdkmanager` is now a deprecated shim over a new `android` CLI with different
  flags. The working invocation is `android sdk install "platforms;android-36"`;
  `--no-metrics` and `--licenses` no longer exist.
- That command exits `0xC0000409` (a JVM crash on shutdown) *after* completing
  successfully. Verify against `platforms/android-36/source.properties` rather
  than trusting the exit code.

### The extension's 60s subprocess timeouts were self-inflicted

`Subprocess initialization did not complete within 60000ms` fired 8 times on
5 Sep. The 12:40 and 13:42 instances coincide exactly with the bandwidth-
saturating toolchain downloads described above — a symptom of a saturated
hotspot link, not a configuration fault.

Measurements taken at the time rule out the usual configuration suspects:
`claude.exe` cold start 218–714 ms, `git status` on this repo 0.45 s, and a full
CLI turn with *all* MCP servers disabled still took 14.4 s versus 16.6 s with
them enabled — so MCP accounts for ~2 s, not 60 s. The residual ~14 s floor is
network round-trip time on the hotspot.

**No further network diagnosis is warranted.** If the error reappears while
something large is downloading, that is the explanation.

## Blocker requiring a human decision before Phase 1

**Lovable's AI is actively committing to this repo — 221 commits landed between
the last local commit and this audit**, including an architectural change that
deleted `src/pages/RiderRideDetail.tsx` outright and redirected its routes.

Phase 1 moves `src/` to `apps/web/src/`. Lovable owns and regenerates specific
files (`integrations/supabase/client.ts` and `previewAuthStorage.ts` are both
marked *"automatically generated. Do not edit it directly."*) and its tooling
assumes a Vite app at the repo root. A monorepo restructure will very likely
either break Lovable's ability to keep shipping the web app, or be clobbered by
it.

This is a product/process decision, not a technical one, and it must be settled
before any restructure:

- **A —** Freeze Lovable, do the monorepo restructure, all future web work is manual.
- **B —** Leave the web app untouched at root; create `apps/mobile` + `packages/core` alongside it, and have `packages/core` be *copied from* rather than *imported by* web. Loses single-source-of-truth; keeps Lovable working.
- **C —** New repo for mobile, consuming `packages/core` as a published/git dependency.

I recommend **B or C** while Lovable remains in active use, and **A** only once
web development has genuinely moved off Lovable.
