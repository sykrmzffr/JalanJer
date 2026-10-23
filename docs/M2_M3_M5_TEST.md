# Test checklist: Search, Route preview, Settings (Android)

Built overnight on branch `main-kdl2pb`. None of this has run on a phone yet, and the cloud
environment couldn't reach the search and routing servers. **Your test is the first real
run.** About 20 minutes.

## Get the app

1. GitHub → **Actions** tab → **Android build** → newest green run on branch `main-kdl2pb`.
2. Under **Artifacts**, download `JalanJer-Android-release-….apk`. Unzip, install
   (same steps as `docs/ANDROID_INSTALL.md`). It replaces your current JalanJer!.
3. Use the **release** build. It doesn't need your PC.

## A. Search (Milestone 2)

- [ ] Tap **Where to?**. The search screen slides up and the keyboard opens.
- [ ] Empty field: **Home** and **Work** rows say "Set once and go". Tap **Home**,
      search your address, pick it. Back on search, Home now shows the address.
- [ ] Type `klcc`. Results appear within about a second, with distances (km), nearest
      sensible ones near the top.
- [ ] Type `jln ss2` and `tmn melawati`. Results should be the same as typing `jalan ss 2`
      and `taman melawati`.
- [ ] Type fast, then delete letters. No old results flashing in after newer ones.
- [ ] Tap the **bookmark** on a result. Then clear the field and tap the **Saved** chip:
      the place is there. Swipe it left → **Remove**.
- [ ] Chips **Gas**, **Food**, **Parking**, **EV charging**, **Coffee**, **Hospital**, **ATM**:
      each lists places nearby. ⚠️ **Most likely thing to break.** If a chip shows an
      error or nothing at all, tell me which one and the exact message.
- [ ] Turn on airplane mode, type something: a red "Can't reach search" bar with
      **Try again**. Your recent and saved places still match.
- [ ] Recents (on the search screen and in the map sheet): swipe a row left → **Delete**.

## B. Route preview (Milestone 3)

- [ ] Pick any place. The camera flies there with a blue pin, then zooms out to show the
      routes.
- [ ] Up to **3 routes**: one thick blue line and thinner other lines, each with a time
      bubble. The fastest says **Best**.
      ⚠️ If you only ever see **one** route, tell me (see `docs/ROUTING.md`, point 1).
- [ ] Tap another line, its bubble, or its row in the panel: it becomes the thick blue one.
- [ ] Rows show time, km, "via" main roads, arrival time, and **Toll** where there are tolls.
      Do the times look believable compared with Waze or Google Maps?
- [ ] **Avoid → Tolls**: routes reload. Do the **Toll** tags disappear (where a toll-free
      way exists)? Same for **Highways**.
- [ ] Back arrow on the top card: the routes close and the normal map and sheet return.
- [ ] **Go now**: says "coming soon" (turn-by-turn is the next milestone).

## C. Settings (part of Milestone 5)

- [ ] Menu button (top-left ☰) opens **Settings**, looking like the Waze list.
- [ ] **Map display → Dark**: app and map go dark. **Automatic** follows the phone again.
- [ ] **Navigation**: the Avoid switches match the route screen's buttons.
- [ ] **Vehicle details → Motorcycle**, then preview a route: it may differ from Car.
      (Valhalla calls its motorcycle routing beta.)
- [ ] **Speedometer → off**: the speedometer disappears from the map; the yellow report
      button stays on the right.
- [ ] **General → Clear recent places** asks first, then clears only recents.
- [ ] The **X** at the top right closes Settings from any page.

## Send back

```
Search:   works? Y/N | chips that failed (+ message):
Routes:   how many routes show? __ | times believable? Y/N | Avoid tolls works? Y/N
Settings: anything broken:
Feel:     anything laggy or jumpy? (screen recordings help a lot)
```
