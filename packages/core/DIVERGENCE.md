# Deliberate divergences: `packages/core` vs the web client

`packages/core` is a port of logic that still lives in `src/lib/` and is still
running in production. Those two copies drifting apart by accident is a real
risk, and the default rule is **fix in both or neither**.

This file is the allowlist for the exceptions: divergences that are deliberate,
reasoned, and recorded. Anything not listed here that differs between the two
copies is accidental drift and should be treated as a bug.

## Why exceptions are safe right now

`packages/core` has **no production consumer**. `apps/mobile` does not exist yet
and `apps/web` still imports from its own `src/lib/`. So a fix landed here
carries zero production risk today, while the equivalent fix in the web app
would mean editing a live codebase mid-Play-Store-closed-testing — and, for the
Lovable-owned files, editing files that get regenerated.

That balance inverts once mobile ships. **When `apps/mobile` goes to a real
track, every open row below becomes a backport obligation, not an accepted
difference.**

---

## DIVERGENCE-001 — auth failures counted at one choke point

| | |
|---|---|
| **Files** | `src/net/goBackendClient.ts` vs `src/lib/goBackendClient.ts` |
| **Status** | Fixed in core. Backport pending. |
| **Backport window** | After the Play Store closed-testing window closes |
| **Tests** | `DIVERGENCE-001: exactly one failure counted per terminally-failed request` (3 cases) |

**Web behaviour.** `noteAuthFailure()` is called from three sites, and the same
logical event is counted differently depending on which path it takes:

| Path | Web increments |
|---|---|
| No token available (`authHeaders`) | 1 |
| 401, refresh fails | **2** — the refresh-failed branch and the `!response.ok` branch both fire for the same response |
| 401, refresh succeeds, retry succeeds | 0 |

With three counting rules feeding one threshold, `AUTH_FAILURE_THRESHOLD = 3` is
only meaningful for one of them. In practice the breaker opens after **2** failed
calls, not the 3 its own constant and comment describe.

**Core behaviour.** Every increment funnels through a single `failAuth()` helper
at the terminal error path. Contract: exactly one increment per request that
terminally fails auth; a request that recovers via refresh-and-retry counts zero.

**When backporting, funnel the increment — do not retune the threshold.**
Changing the number to compensate would paper over the inconsistency while
leaving the three paths counting differently.

**Impact if never backported:** low. Web's breaker is twice as trigger-happy as
designed, so a user with one genuinely expired session reaches a 30-second
backend lockout sooner than intended. Annoying, not dangerous.

---

## DIVERGENCE-002 — socket token freshness is explicit, not inferred

| | |
|---|---|
| **Files** | `src/net/backendSocketClient.ts` vs `src/lib/backendSocketClient.ts` |
| **Status** | Fixed in core. Backport optional — see impact. |
| **Backport window** | Same, but web is not currently harmed |
| **Tests** | `DIVERGENCE-002: token freshness is explicit, not inferred from state` (2 cases) |

**Web behaviour.** `openSocket()` chooses `getFreshAuthToken()` when
`this.state === 'reconnecting'`. That condition can never be true at that point:
every path into `connect()` nulls `this.ws` first, and `connect()` then sets
state from `this.ws ? 'reconnecting' : 'connecting'` two lines later. The
caller's intent is overwritten before it is read, so the refresh branch is dead
code and **every reconnect uses the cached token**. `reconnectWithFreshToken()`
does not, despite its name, refresh anything.

**Core behaviour.** Freshness is an explicit argument —
`openSocket(forceFresh: boolean)` — so intent survives the call. Two named entry
points make the choice deliberate:

- `reconnect()` — uses the current session token. Wired to `TOKEN_REFRESHED`,
  where the session is already fresh and refreshing again is a wasted round trip.
- `reconnectWithFreshToken()` — forces a refresh. For mobile foreground-resume.

**Impact.** On **web**, masked: reconnects are driven by `TOKEN_REFRESHED`, by
which point the session already holds the new token, so `getToken()` happens to
return something valid. Backporting is optional.

On **mobile**, this is the failure mode the migration exists to eliminate. A
backgrounded RN process has its JS timers suspended, so supabase-js's
auto-refresh never runs. On resume the socket reconnects against an hours-stale
cached session, the server rejects it, the socket closes, and the backoff loop
retries with that same dead token indefinitely. **The driver shows as online and
silently receives nothing, with no visible error.**

**Required follow-up in `apps/mobile`:** an `AppState` listener that calls
`reconnectWithFreshToken()` on foreground. The fix above makes that possible; it
does not happen on its own. There is no web equivalent of a suspended process,
which is exactly why web never surfaced this.

**Scheduled: inside the socket increment, not after it.** This is not a
follow-up task to be picked up once the socket works — it is part of what
"the socket works" means on mobile. A socket increment that reconnects on
foreground with a stale cached token will *pass* a desk test, because a session
that has not been suspended long enough still holds a valid token. It fails only
after a real backgrounding, which is the exact condition drivers spend their day
in. Deferring it produces a green increment that is wrong in production, so the
`AppState` listener ships in the same increment as the socket client and the
foreground-resume path is part of that increment's acceptance, not a later fix.

---

## DIVERGENCE-003 — exact brand hex instead of rounded HSL

| | |
|---|---|
| **Files** | `src/tokens/themes.ts` vs `src/index.css` |
| **Status** | **Accepted permanently.** Not a backport candidate while web stays on Lovable. |
| **Tests** | Verified by conversion check; canonical values asserted directly |

The CSS custom properties are rounded HSL approximations of the brand hex.
`#B81104` is `hsl(4.33 95.7% 36.9%)`, written in CSS as `4 96% 37%`; converting
that back yields `#B91004` — one step off in R and G. `#7F0B02` likewise returns
`#7E0A02`. Yellow round-trips exactly, which is how spot-checking one colour
gives false confidence.

Core carries canonical hex explicitly (`theme.brandHex`, `canonical: true`) for
the documented colours, and flags the pink theme's values as derived
(`canonical: false`) since no published hex exists for them.

**Mobile renders the correct red; web renders one step off.** The difference is
imperceptible side by side. Correcting web would mean editing Lovable-regenerated
CSS and breaking the zero-diff discipline that keeps the web app shipping, so it
is accepted rather than outstanding.

**Do not "fix" mobile down to match web** — that reintroduces the drift. If web
ever moves off Lovable, align it upward to `#B81104`.

---

## DIVERGENCE-004 — auth identifier resolution duplicated in `apps/mobile`

| | |
|---|---|
| **Files** | `apps/mobile/src/auth/identity.ts` vs `src/pages/Auth.tsx` |
| **Status** | **Open duplication. Guarded by test, promotion deferred.** |
| **Promotion window** | When the web app is next touched for another reason — not before |
| **Tests** | `DIVERGENCE-004: auth identity rules match web` in `src/divergence/identity.divergence.test.ts` |

Unlike 001–003, this is not a behavioural difference. It is **the same rules
implemented twice**, which is the condition the top of this file calls
accidental drift. It is recorded here because these are **auth semantics**, and
drift produces inconsistent *login behaviour* between platforms — a user who can
sign in on web and not on mobile, with no error that explains why.

The rules that must not diverge:

| Rule | Value | Consequence if it drifts |
|---|---|---|
| Local-number prefix | `0…` → `+263…` | A Zimbabwean local number resolves to a different account, or none |
| Synthetic email domain | `<digits>@pickme.phone` | Phone-registered accounts become unreachable — the address is what Supabase authenticates against |
| Nickname resolution | `email_for_nickname` RPC | Nickname login silently falls through to using the nickname as an email |
| Retry policy | Retry transient network errors only, never a rejected credential | Retrying a wrong password risks rate-limiting or locking the account |

**Why it is not in `packages/core` yet.** Core is scoped as a port of
`src/lib/`. This logic lives in a *page component* on web, so promoting it is a
refactor of `src/pages/Auth.tsx` — and that file is inside the byte-identical
web app the migration is deliberately not touching. Promoting now would mean
either editing web mid-flight or moving the code to core while web keeps its own
copy, which is the same duplication with a longer import path.

**So it is guarded instead of promoted.** The test asserts mobile's behaviour
against the four rules above *and* reads `src/pages/Auth.tsx` to confirm the web
literals (`+263`, `@pickme.phone`, `email_for_nickname`) are still present. If
either side moves, the suite fails loudly rather than the two quietly disagreeing.

**On promotion:** move the module into `packages/core/src/auth/identity.ts`,
have both apps import it, and delete this entry along with the file-reading half
of the test.
