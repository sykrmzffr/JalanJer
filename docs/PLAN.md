# JalanJer! — Build Plan (v0.1, core features)

A Waze-style driving navigation app for Malaysia. iOS first, Android second.
Reference screens: `IMAGE REFERENCES/` (Waze iOS, Shah Alam / Klang Valley).

## Ground rules

1. **Feel beats features.** Every screen must hit the performance budget below before the next feature starts. A smooth app with 5 features beats a laggy app with 20.
2. **$0 to build and test.** Use open-source and free tiers only. The only unavoidable costs are store fees, and only when publishing (see "Costs").
3. **No Mac.** Everything is developed on Windows. iOS binaries are compiled on cloud macOS machines.

## Performance budget (the "doesn't feel like a startup app" contract)

| Metric | Target | How we get it |
|---|---|---|
| Cold start → map visible | < 1.5 s on iPhone 11, < 1 s on iPhone 15 Pro Max | Hermes, minimal startup JS, cached style + tiles on disk, splash fades into the *real* map |
| Map pan / zoom / rotate | 60 fps floor on iPhone 11, 120 fps on iPhone 15 Pro Max (ProMotion) | Native GPU map (MapLibre Native, Metal on iOS). Zero JS in the gesture path |
| Bottom-sheet drag, button press | Next-frame response | Reanimated worklets on the UI thread, Gesture Handler, spring physics |
| GPS puck movement | Glides continuously, never jumps | Snap position to route + interpolate between 1 Hz GPS fixes on the native side |
| Search as you type | Local results instant, remote < 300 ms | Recents/saved filtered on device first; debounced remote query (~120 ms), cancel stale requests |
| Route calculation | < 1 s | Self-hosted Valhalla close to users; draw route as soon as the first one arrives |
| Off-route → new route | < 1.5 s | Off-route detection on device, pre-warm reroute request |
| Lists | No blank cells while scrolling | FlashList, fixed row heights, `expo-image` |

Measured on both test phones every milestone (Sentry performance + in-app FPS overlay in dev builds):
- **iPhone 11** (A13, 60 Hz) — the floor. If it's smooth here, it's smooth for most users.
- **iPhone 15 Pro Max** (A17 Pro, 120 Hz ProMotion) — must use the full 120 Hz for map and sheet motion.

## Core features (MVP), mapped to the reference screens

### 1. Home map — `landing screenmain.jpg`
- Full-screen vector map, light by day / dark by night (auto)
- Heading puck with accuracy halo
- Floating buttons: menu (top-left), compass/recenter, sound (top-right), report **+** (yellow, bottom-right)
- Speedometer bubble (bottom-left), turns red over the speed limit (OSM `maxspeed` where available)
- Bottom sheet with detents: "Where to?" search + mic, Home / Work / saved chips (horizontal scroll), Recent list
- Cut from MVP: music app integration, "Wazers around you" (needs a user base)

### 2. Search — `search screen.jpg`
- Search field with back button, voice input
- Category chips: Saved, Gas, Food, Parking (+ more, horizontal scroll)
- Home / Work rows ("Set once and go" when empty)
- Recents, swipe to delete
- Results ranked by distance from the user + text match. Malay and English queries

### 3. Route preview — `routes selection with toll prices.jpg`
- Header: "Your location → Destination"
- Up to 3 alternative routes drawn on the map with time bubbles; best one highlighted ("Best")
- Tap a bubble or line to select it
- **Avoid** menu: tolls, highways, ferries
- Bottom sheet: duration, distance, "via" road summary, **toll cost (RM)** per route
- **Leave later** (pick departure time) / **Go now**

### 4. Turn-by-turn navigation — `direction in progress.jpg`
- Top banner: maneuver arrow, distance, street name; "and then" row for the next maneuver
- Route line with maneuver arrow drawn on the road, upcoming-street label on the map
- Current-street pill at the bottom, speedometer, report button
- Camera follow mode: tilt, rotate with heading, auto-zoom by speed and distance to the next turn
- ETA sheet: arrival time, minutes left, km left; search along route; alternative routes
- Off-route detection + automatic reroute
- Keeps running with the screen locked (background location); later a Live Activity on the lock screen / Dynamic Island

### 5. Turn list — `all future turns.jpg`
- Segmented control: **Next turns** / **Reports ahead**
- Every upcoming maneuver with distance and street, roundabout exit numbers

### 6. Spoken directions — `direction voice option.jpg`
- Sheet: Normal / Less chatty / Only alerts / Off
- Voice picker (on-device iOS/Android voices, English + Bahasa Melayu)
- Audio ducks music while speaking; output follows the current Bluetooth route

### 7. Settings — `setting screen.jpg`
MVP: General, Map display, Voice and sound, Navigation (avoid tolls/highways), Vehicle (car / motorcycle), Toll passes (Touch 'n Go / RFID, informational), Speedometer.
Later: Alerts and reports, Audio player, Notifications, Planned drives.

### 8. Reports (phase after MVP)
- Yellow **+** → big icons: Traffic jam, Police, Accident, Hazard, Road closed
- Other drivers see pins and get "Still there?" prompts; reports expire automatically
- Needs a backend + users, so it comes after navigation is solid

## Tech stack (all free)

| Layer | Choice | Why |
|---|---|---|
| App framework | **React Native (New Architecture) + Expo** with dev builds | Builds iOS in the cloud from Windows; native views + UI-thread animations give native-level smoothness |
| Map rendering | **MapLibre Native** via `@maplibre/maplibre-react-native` | Open source (free forever), GPU/Metal renderer, same class of engine as Mapbox |
| Map tiles | **OpenFreeMap** to start → self-hosted **Protomaps PMTiles** (Malaysia extract) on Cloudflare R2 free tier | No API keys, no per-request billing; R2 has zero egress fees |
| Routing | **Valhalla** (open source) self-hosted, OSM data for Malaysia + Singapore | Alternatives, avoid tolls/highways, turn-by-turn instructions |
| Navigation logic | **Ferrostar** (open-source nav core: route progress, snapping, off-route, voice triggers), wrapped as an Expo native module if no maintained RN binding | Free equivalent of Mapbox Navigation SDK |
| Search / geocoding | **Photon** (OSM, search-as-you-type), self-hosted | Free; Nominatim's public server forbids autocomplete |
| Toll prices | Our own table: LLM-published rates + OSM toll plazas, matched against the route | No free API covers Malaysian toll prices |
| Live traffic | MVP: none (time-of-day typical speeds). Later: our own opt-in, anonymous speed data from users | The honest gap vs Waze — Waze's traffic comes from millions of drivers |
| Voice | On-device TTS (`expo-speech`) | Free, works offline, has Malay voices |
| Server | **Oracle Cloud Always Free** ARM VM running Valhalla + Photon. **Update 2026-10-23:** several reports say Oracle cut the free ARM VM from 4 cores / 24 GB to **2 cores / 12 GB** in 2026; check Oracle's page before signing up (details and sources in `docs/SEARCH.md`) | Enough for Malaysia's road graph; $0 (signup needs a card for verification; free capacity can be hard to get in some regions) |
| Backend (accounts, saved places, reports) | **Supabase** free tier (Postgres + PostGIS + Realtime) | Free tier pauses after a week of no activity — fine during development |
| Local storage | MMKV | Fastest key-value store on RN |
| State | Zustand | Small, no re-render storms |
| Crash + perf monitoring | Sentry free tier | |
| iOS builds | EAS Build free plan (limited builds/month, slower queue) **or** GitHub Actions macOS runners | Both compile on cloud Macs |

### Design system

- **Map chrome** (floating buttons, banners, report button, speedometer) is our own brand look, as in Waze: bold type, big round targets, high contrast. Built with **beUI Native** components (React Native, Reanimated + Gesture Handler + Uniwind): `button`, `switch`, `tabs` (Next turns / Reports ahead), `radio` (spoken directions), `swipeable-list` (recents), `menu` (Avoid), `number` (rolling ETA / speed), `voice-orb` (voice search), `loader`.
- **Structure follows each platform:**
  - iOS → Apple Human Interface Guidelines: SF Pro + Dynamic Type, SF Symbols (`expo-symbols`), sheet detents, grouped inset Settings list, swipe-back, 44 pt touch targets, haptics on key actions.
  - Android → Material Design 3: Roboto, Material Symbols, M3 bottom sheet, M3 list + top app bar, predictive back, 48 dp touch targets, M3 color roles (optionally dynamic color).
- One set of design tokens (color roles named after M3: primary, surface, on-surface…, plus spacing and radius) shared by both platforms.
- **daisyUI** is web-only, so it is not used in the app; use it later for a landing page or a report-moderation dashboard.

## Costs

| Item | Cost | When |
|---|---|---|
| All dev tools, map, routing, search, backend (free tiers) | RM 0 | Always |
| Testing on your own iPhone (free Apple ID, re-sign every 7 days, max 3 apps) | RM 0 | During development |
| Apple Developer Program (TestFlight, App Store, CarPlay) | USD 99 / year | Only when sharing with testers or publishing |
| Google Play developer account | USD 25 once | Only when publishing on Android |

## No Mac — is that fine?

Yes, with known trade-offs:
- **Builds:** iOS apps compile on cloud Macs (EAS Build or GitHub Actions). You never need Xcode locally.
- **Installing on your iPhone for free:** the cloud build produces an `.ipa`; **Sideloadly** (Windows) signs it with your free Apple ID. Re-sign every 7 days. Once you pay for the Apple Developer Program, switch to TestFlight.
- **Day-to-day:** JavaScript changes reload instantly on the phone over Wi-Fi (Metro dev server on Windows). Only native changes need a new cloud build.
- **What you lose:** no iOS Simulator and no Xcode Instruments profiling locally. Workarounds: test on the real iPhone (better for a GPS app anyway), Sentry for performance, and GitHub Actions macOS runners for simulator UI tests (Maestro).
- **Native Swift code** (e.g., wrapping Ferrostar) is written on Windows and compiled in CI, so native debugging is slower. Keep native code small.

## Milestones

| # | Milestone | Done when |
|---|---|---|
| 0 | Foundations | Repo on GitHub, Expo dev build running on your iPhone, design tokens, FPS overlay, Sentry |
| 1 | The map feels right | Home map + puck + camera + floating buttons + bottom sheet hit the perf budget on device |
| 2 | Search | Category chips, Home/Work, recents, Photon search for Malaysia |
| 3 | Route preview | 3 alternatives, Avoid menu, time bubbles, toll prices for Klang Valley + PLUS |
| 4 | Turn-by-turn | Banner, voice, camera follow, reroute, background mode; 10 real drives logged |
| 5 | Settings + polish | Settings screens, night mode, saved places synced via Supabase |
| 6 | Reports | Report button, pins, "Still there?", expiry |
| 7 | Android | M3 pass, Android-specific testing, Play Store |
| 8 | Later | CarPlay / Android Auto, Live Activity, crowd traffic, music controls, offline maps |

## Decisions (2026-10-22)

1. **Test phones:** iPhone 15 Pro Max and iPhone 11 (see performance budget).
2. **Repo:** public on GitHub, so GitHub Actions macOS builds are free and unlimited. iOS builds run there by default; EAS Build's free plan is the backup.
3. **Server:** Oracle Cloud Always Free ARM VM for Valhalla + Photon.
4. **Folder:** renamed to `JalanJer` (no `!`). The app's display name stays "JalanJer!".
