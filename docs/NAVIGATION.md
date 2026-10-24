# Turn-by-turn navigation (Milestone 4)

## How to use

1. Search a place → route preview → pick a route → **Go now**.
2. The map tilts and turns with the road; your car is the arrow in the lower part of the
   screen. The black banner shows the next turn, the distance to it and the street name;
   "and then" appears when another turn follows right after.
3. Voice says each turn twice: an early warning ("In 800 meters, turn right onto …") and
   again just before it. The speaker button mutes it (same setting as on the map).
4. Bottom panel: arrival time, minutes and km left. **✕** ends navigation (asks first).
   On Android the Back button does the same.
5. Leave the route and after about 3 seconds it says "Rerouting" and finds a new route.
6. At the end: "You have arrived", and the ✕ becomes a ✓ (Done).
7. A white **turn arrow** is drawn on the road at the next turn once it's within 600 m.
8. Tap the black banner for the **turn list**: **Next turns** (every turn still to come;
   each distance is from the turn before it, like Waze; roundabouts show the exit number)
   and **Reports ahead** (reports on your route, nearest first). **CLOSE** or Android Back
   closes it.
9. Reports on your route are **spoken** once, e.g. "Police reported ahead, in 500 meters"
   (500 m ahead in town, 1 km above about 80 km/h). Not for your own reports. Muted with
   the speaker button like the turns.

**Practice drive** (Settings → Navigation → Practice drive): fake GPS that drives the route
at 50 km/h, so you can try all of this at home. The Go button then says "Practice drive".

The screen stays on while navigating.

## Not done yet (honest list)

| Plan item | Status |
|---|---|
| Keeps working with the **screen locked** (background location) | Not yet. The screen stays on instead. Background mode needs extra permissions and native config; next step. |
| Upcoming-street label on the map | Not yet (the banner shows it) |
| ETA sheet: search along route, alternative routes while driving | Not yet |
| Speed-limit warnings | Need speed-limit data (not invented) |
| Malay voice | Valhalla's instructions are English only (no Malay in its list) |
| Live Activity / Dynamic Island (iPhone) | Later (Milestone 8) |

## How it works (for future sessions)

- `src/features/navigation/core/nav-core.ts`: the "brain", pure and unit-tested
  (`npm test`). Once per GPS fix it snaps your position onto the route (ignoring small
  backwards GPS jumps), works out the current/next maneuver, decides when to speak, detects
  leaving the route (3 fixes in a row more than 35–80 m away, depending on GPS accuracy)
  and arrival (within 25 m of the end).
- `use-navigation.ts`: feeds it real GPS (`expo-location`, best accuracy, 1 per second) or
  practice fixes, speaks with the phone's voice (`expo-speech`), reroutes through Valhalla
  (at most once per 10 s), keeps the screen awake.
- `navigation-session.tsx` + `components/`: banner, car arrow, street pill, trip panel.
- Smoothness: once a second the camera glides to the new position with a native linear
  animation (no JavaScript per frame), and the car arrow is a fixed overlay, so it never
  jumps. On iPhone 15 Pro Max this should run at 120 Hz; **unmeasured** (issue #4).
- Turn icons: SF Symbols on iPhone, Material Symbols on Android
  (`maneuver-icon.ts`). If an arrow is missing on a phone, the icon name is wrong there:
  tell me which turn.

- Turn arrow: `components/nav-maneuver-arrow.tsx`, shape from `maneuverArrow` in nav-core.
  Sizes are in metres on the ground (4 m wide line, 14 m wide head), so it scales with zoom.
- Reports on the route: `placeOnRoute` in nav-core + `route-reports.ts`. A report counts
  when it's within 40 m of the route line. We don't store which direction a report was
  for, so one on the other side of a divided highway (or a road right beside the route)
  also counts. The 40 m, 500 m / 1 km and 600 m values are my starting choices, not from
  a study; change them in the code if they feel wrong on the road.

## Things to check on a phone

1. Do turns get announced at sensible moments (not too early or late)?
2. Is the camera movement smooth, or does it stutter once a second?
3. Does rerouting kick in when you deliberately take a wrong turn, and not when GPS is
   just a bit off?
4. Are all banner arrows visible (none blank)?
5. Is the turn arrow on the road the right size and lined up with the route line?
