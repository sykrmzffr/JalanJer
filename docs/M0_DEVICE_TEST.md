# Milestone 0: on-phone test checklist

Do this on **both** phones: iPhone 11 and iPhone 15 Pro Max. Takes about 20 minutes per phone.
Full install steps are in `docs/IPHONE_INSTALL.md`; this is the short version plus what to check.

## Before you start

- [ ] Turn **Low Power Mode off** on both phones. It caps the 15 Pro Max screen at 60 Hz and slows the CPU, which would make the numbers wrong.
- [ ] Charge the phones above 50%. Don't test while they're hot.
- [ ] Download both files from the green **iOS build** run on GitHub (Actions → iOS build → Artifacts):
      `JalanJer-Debug-…` and `JalanJer-Release-…`. Unzip each one to get the `.ipa`.

## A. Release build: real speed

1. [ ] Install the **Release** `.ipa` with Sideloadly. Then on the phone: Trust the developer profile, turn on Developer Mode, restart.
2. [ ] Open JalanJer!. Tap **Allow While Using App** for location.
3. [ ] **Cold start time.** Swipe the app away in the app switcher. Wait 10 seconds. Then tap the icon and time it until the map shows streets: use a stopwatch, or record the screen and count frames afterwards. Do it 3 times and write down the middle time.
      - Target: **under 1.5 s** on iPhone 11, **under 1 s** on iPhone 15 Pro Max.
      - The splash screen should fade straight into the map, with no white or blank screen in between.
4. [ ] **Map feel.** Pan fast, pinch-zoom in and out, and twist with two fingers to rotate. Watch for:
      - stutter or jumps while your finger is moving
      - the map "lagging behind" your finger
      - streets or labels that stay blurry or grey for more than about a second after you stop
      - on the 15 Pro Max: does it feel as smooth as scrolling in Settings or Safari? That smoothness is 120 Hz. If the map feels noticeably choppier than Safari, note it.
5. [ ] **Blue dot (puck).** Your blue dot shows where you actually are. Walk a few steps or turn around: the dot moves, and the direction cone turns with you.
6. [ ] **Location denied.** Settings → JalanJer! → Location → **Never**. Reopen the app: a notice with **Open Settings** appears, and the button opens the right page. Set it back to **While Using the App**.
7. [ ] **No internet.** Turn on Airplane Mode, then cold start the app. It should not get stuck on the splash screen. It should move on within about 3 seconds, even if the map is grey. Turn Airplane Mode off.

## B. Debug build: FPS meter

1. [ ] Install the **Debug** `.ipa` with Sideloadly. It replaces the Release build, which is fine.
2. [ ] On the PC, in the project folder: `npm install`, then `npx expo start --dev-client`. Allow Node.js through Windows Firewall (Private networks).
3. [ ] Open the app. Allow **Local Network**, then tap your PC in the list.
4. [ ] Pan and zoom the map for 10 seconds. Read the green meter at the top:
      - **UI**: about **60** on iPhone 11, about **120** on iPhone 15 Pro Max. It shouldn't stay below 55 or 110.
      - **JS**: lower numbers here are OK in Debug.
      - Note: the meter counts the phone's screen refreshes, not map frames directly. If UI says 120 but the map *looks* choppier than Safari, trust your eyes and tell us.
5. [ ] Edit any text in `src/features/map/home-map.tsx` and save. The phone updates within a couple of seconds.

## What to send back

Copy this, fill it in, and paste it in the chat:

```
iPhone 11        – cold start (middle of 3): __ s | map smooth? Y/N | UI fps: __ | puck OK? Y/N | notes:
iPhone 15 Pro Max – cold start (middle of 3): __ s | map smooth? Y/N | UI fps: __ | puck OK? Y/N | notes:
Anything broken / weird:
```

Screen recordings of any stutter are very helpful.
