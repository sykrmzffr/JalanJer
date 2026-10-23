# Turn-by-turn (Milestone 4): options and plan

Research only, no code yet. Milestone 4 waits until the iPhone speed checks in issue #4 are
done (agreed rule), so this is ready when we start.

## What turn-by-turn needs

From `docs/PLAN.md` (Milestone 4): top banner (arrow, distance, street) with "and then",
route line and turn arrow on the road, current-street pill, speedometer, camera that tilts,
turns with you and zooms by speed, ETA sheet, **off-route detection + automatic reroute**,
and keeps running with the screen locked.

The "brain" behind that, every GPS fix (about once a second):

1. Snap the GPS position onto the route (GPS drifts 5–20 m).
2. Work out progress: which step you're on, metres to the next turn, time and km left.
3. Decide when to speak ("In 500 metres, turn left…") and when to switch to the next step.
4. Detect when you've left the route, then ask for a new route.

## Option A: Ferrostar (what the plan named)

Ferrostar is an open-source navigation core by Stadia Maps (Rust, with iOS/Android/web
bindings). Built with Valhalla and MapLibre in mind.

What I checked (2026-10-23):

- The Ferrostar guide on GitHub (`guide/src/react-native-getting-started.md`) documents three
  React Native packages: `@stadiamaps/ferrostar-uniffi-react-native`,
  `@stadiamaps/ferrostar-core-react-native` and `@stadiamaps/ferrostar-maplibre-react-native`.
  It says Expo apps need a development build (we have one).
- **But none of the three is on npm** (I ran `npm view` for each: "404 Not Found").
  A third-party note from early October 2026 describes them as pre-alpha.
- The package that *is* on npm, `@stadiamaps/ferrostar` (0.58.0, published 2026-10-13), is
  the **web** build (WebAssembly). React Native's JavaScript engine (Hermes) can't run
  WebAssembly, as far as I know, so it doesn't help us.
- Platform support: iOS 15+, Android API 25+ (from the Ferrostar guide). Both phones are fine.

So using Ferrostar today means either building its React Native packages from the GitHub
source (Rust toolchain plus generated bindings, in our CI), or writing our own Expo module
around its iOS and Android libraries. Both are a lot of native work we can't debug locally
(no Mac).

## Option B: our own small navigation core in TypeScript

Steps 1–4 above are mostly geometry, and Valhalla already gives us the hard parts: the
route shape, each turn's position (`begin_shape_index`), and the spoken texts
(`verbal_pre_transition_instruction` etc.). A TypeScript core would:

- run once per GPS fix (about 1 per second), which costs nothing next to the map's work;
- be plain TypeScript with unit tests, like the search and routing code (`npm test`);
- sit behind a small interface (`startTrip`, `onLocation`, events), so we can swap in
  Ferrostar later without touching the screens.

Downsides: we own the edge cases (tunnels, parallel roads, GPS jumps, U-turns). Ferrostar
has had years of work on these.

## Recommendation

**Start with Option B behind an interface, and watch Ferrostar.** If its React Native
packages reach npm and work with Expo SDK 58, switch the core to Ferrostar and keep our
screens. This keeps Milestone 4 free of native code we can't debug on Windows.

## Other things Milestone 4 needs (checked or to check)

| Need | Status |
|---|---|
| Spoken directions | `expo-speech` is already installed (the phone's own voices). Valhalla's instructions come in English only (no Malay in its language list, checked). |
| Keep running with the screen locked | Needs background location (`expo-location` background mode + an iOS "location" background permission). New native config, so a new build. |
| Live Activity / Dynamic Island | Later (plan Milestone 8). |
| Reroute | Same Valhalla request as route preview, starting from where you are, with your heading. |
| Speed-limit warnings | Need speed-limit data; Valhalla can return it on a separate request (`trace_attributes`). To check. |

## Sources

- Ferrostar repository and guide: <https://github.com/stadiamaps/ferrostar> (README, `guide/src/`)
- npm registry lookups run from the cloud session, 2026-10-23
- Valhalla route API reference (maneuver fields): `docs/docs/api/route/api-reference.md` in the Valhalla repo
