# Install JalanJer! on your iPhone (from Windows, for free)

You don't need a Mac. A Mac in the cloud (GitHub Actions) builds the app and gives you an `.ipa` file
(an iPhone app package). **Sideloadly** on your Windows PC puts it on your iPhone using your free Apple ID.

There are two builds:

| Build | What it's for | Needs your PC running? |
|---|---|---|
| **Debug** | Day-to-day work. The app loads its JavaScript from your PC over Wi-Fi, so code changes appear on the phone in a second without a new build. Shows the FPS meter. | Yes (`npx expo start --dev-client`) |
| **Release** | Testing real speed. All JavaScript is inside the app, like the App Store version. No FPS meter. | No |

Both use the same app ID (`com.sykrmzffr.jalanjer`), so installing one replaces the other.

## Free Apple ID limits (good to know)

- The app **stops opening after 7 days**. Fix: install it again with Sideloadly (same steps, same file, takes a minute). Your data in the app stays.
- A free Apple ID can have **at most 3 sideloaded apps** on a phone at the same time.
- These limits go away only with the paid Apple Developer Program (USD 99/year), which we don't need yet.

## One-time setup on Windows

1. Install **iTunes** and **iCloud** from Apple's website (apple.com), *not* from the Microsoft Store.
   Sideloadly needs the Apple website versions. (This is what Sideloadly's own site says; if their
   instructions have changed, follow theirs.)
2. Install **Sideloadly** from <https://sideloadly.io>. It's free.
3. Connect the iPhone to the PC with a USB cable. On the iPhone tap **Trust** and enter your passcode.

## 1. Download the app from GitHub

1. Open the repo on github.com → **Actions** tab → **iOS build**.
2. Click the newest run with a green check ✅. (To start a fresh build yourself: **Run workflow** → **Run workflow**. It takes roughly 20–40 minutes.)
3. Scroll down to **Artifacts**. Download `JalanJer-Debug-…-unsigned.ipa` or `JalanJer-Release-…-unsigned.ipa`.
4. GitHub gives you a `.zip`. Right-click → **Extract All**. Inside is the `.ipa`.

(You must be signed in to GitHub to download artifacts. They are kept for 30 days.)

## 2. Install with Sideloadly

1. Open Sideloadly. Your iPhone should show in the **iDevice** box.
2. Drag the `.ipa` onto the Sideloadly window (or click the IPA icon and pick it).
3. Type your **Apple ID** email. Tip: you can make a separate free Apple ID just for this.
4. Click **Start**. Enter your Apple ID password when asked (and the 2-factor code if your phone shows one).
5. Wait for **Done**.

## 3. Allow the app on the iPhone (first time only)

1. **Trust your Apple ID as a developer:** Settings → General → **VPN & Device Management** → tap your
   Apple ID under "Developer App" → **Trust**.
2. **Turn on Developer Mode** (iOS 16 and newer): Settings → **Privacy & Security** → scroll to the bottom →
   **Developer Mode** → on. The iPhone restarts; after it restarts, tap **Turn On** and enter your passcode.
   (The Developer Mode switch only appears after a sideloaded app is on the phone.)
3. Open **JalanJer!**. Allow **Location** ("While Using the App") so the blue dot shows.

## 4. Debug build: connect to your PC (Metro)

Only for the **Debug** build.

1. Phone and PC on the **same Wi-Fi**. (Office/hotel/public Wi-Fi often blocks phones from seeing PCs. Home Wi-Fi or your phone's hotspot usually works.)
2. On the PC, in the project folder:

   ```bash
   npm install
   ```

   ```bash
   npx expo start --dev-client
   ```

3. The first time, Windows Firewall asks about **Node.js**: tick **Private networks** and click **Allow**.
4. Open JalanJer! on the iPhone. When iOS asks to find devices on your **local network**, tap **Allow**.
5. The app's start screen lists your PC under development servers. Tap it.
   If it isn't listed, tap **Enter URL manually** and type `http://<your PC's IP>:8081`.
   Find the IP by running `ipconfig` on the PC and looking for **IPv4 Address** (looks like `192.168.1.23`).
6. Edit a file on the PC and save: the phone updates by itself.

**When do I need a new build?** Only when native things change: new native libraries, `app.json` changes,
app icon. JavaScript/TypeScript changes never need one in the Debug build.

## Measuring smoothness

The Debug build shows a small meter at the top: **JS** and **UI** frames per second.

- **UI** is what you feel when moving the map. Target: ~60 on iPhone 11, ~120 on iPhone 15 Pro Max.
- **JS** dropping doesn't stop the map moving (the map runs natively), but it will slow buttons and sheets later.

The Debug build is slower than the real app because JavaScript runs in debug mode. Judge final smoothness
and start-up time with the **Release** build.

## Problems

| What you see | Try |
|---|---|
| App won't open after a week | Reinstall with Sideloadly (7-day limit). |
| Sideloadly: "maximum number of apps" | Delete another sideloaded app from the phone, then retry. |
| Debug build: "No development servers found" | Same Wi-Fi? Firewall allowed? Use **Enter URL manually**. |
| Map is grey/blank | Check internet: map tiles come from OpenFreeMap. |
| No blue dot | Settings → JalanJer! → Location → "While Using the App". |
