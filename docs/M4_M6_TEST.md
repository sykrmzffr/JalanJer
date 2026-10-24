# Test checklist: Turn-by-turn and Reports (Android)

## Before you start

- Supabase → **SQL Editor** → run `supabase/migrations/0002_reports.sql` (done ✓).
- Install the newest `JalanJer-Android-release-….apk` (Actions → Android build, branch
  `main-kdl2pb`).

## A. Practice drive (at home, no driving)

1. ☰ → Settings → **Navigation** → turn on **Practice drive**.
2. Search a place 3–10 km away → the route button now says **Practice drive** → tap it.
3. Check:
   - [ ] − / + under "Practice drive" in the bottom panel changes the speed (10–150 km/h);
         the car speeds up/slows down from there and the speedometer follows.
   - [ ] The car arrow is solid blue with a white edge.
   - [ ] "Starting practice drive…" banner for a moment, then the map turns with the road (flat,
         no tilt); the blue arrow stays in the lower part of the screen.
   - [ ] The road behind you turns grey-purple.
   - [ ] Drag the map: the arrow becomes a blue dot on the map and **Recenter** appears. Tap
         it (or wait 15 s): back to following.
   - [ ] Banner never shows just a number like "2"; then it shows the full instruction.
   - [ ] Movement looks **smooth**, not jumping once a second. (Most important: tell me.)
   - [ ] Black banner: arrow + distance counting down + street name. "and then" appears for quick double turns.
   - [ ] Voice says the first instruction, then "In … meters, turn …", then the turn again just before it.
   - [ ] Speaker button mutes/unmutes the voice.
   - [ ] Bottom panel: arrival time, minutes and km left, counting down. "Practice drive" label.
   - [ ] All banner arrows show (none blank). If one is blank, tell me which turn.
   - [ ] At the end: "You have arrived", ✕ becomes ✓; tap it to finish.
   - [ ] ✕ during the drive slides up an "End navigation?" sheet; Android Back opens/closes it.
   - [ ] White turn arrow on the road at the next turn (from 600 m away). Right size? Lined up?
   - [ ] Tap the black banner → turn list. **Next turns** lists the turns; roundabouts show a
         ring with the exit number. **CLOSE** and Android Back close it (navigation keeps going).
4. Turn Practice drive **off** afterwards.

## B. Real drive (passenger holds the phone, or mount it)

- [ ] Turns announced at sensible moments (not too early/late).
- [ ] Take a wrong turn on purpose: after a few seconds "Rerouting" and a new route.
- [ ] Screen stays on.
- [ ] Known limit: if you lock the screen, navigation pauses (background mode isn't done yet).

## C. Reports

1. Make sure you're signed in (Settings → Account).
2. Tap the yellow **+** → pick **Hazard** → it closes with a buzz.
   - [ ] A yellow-brown hazard pin appears where you are (may take up to a minute on the map).
   - [ ] In Supabase → Table Editor → **reports**: a new row.
3. Tap the pin: card shows "Hazard", "just now", "your report" (no Still there buttons for your own).
4. With a second account (another phone/email): tap your pin → **Still there** / **Not there** works.
   Two "Not there" from two accounts → the pin disappears.
5. While navigating past someone else's report (within ~150 m): a "… still there?" card pops up and
   hides itself after ~12 s.
6. Signed out: + → asks you to sign in.
7. Report something on a road, then (second account, or ask a friend) practice-drive a route
   along that road:
   - [ ] About 500 m before it, the voice says "… reported ahead, in 500 meters". Only once.
   - [ ] Banner → **Reports ahead** lists it with the distance, counting down.
   - [ ] Your own reports are listed but not spoken.

## Send back

```
Practice drive smooth? Y/N | voice timing OK? Y/N | blank arrows? which:
Real drive: reroute worked? Y/N | anything wrong:
Reports: send OK? Y/N | pin shows? Y/N | votes OK? Y/N
Turn arrow OK? Y/N | turn list OK? Y/N | report spoken ahead? Y/N
```
