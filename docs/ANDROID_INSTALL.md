# Install JalanJer! on an Android phone

Much simpler than iPhone: no Apple ID, no Sideloadly, no 7-day limit. GitHub builds an `.apk`
(an Android app file) and you install it directly.

There are two builds:

| Build | What it's for | Needs your PC running? |
|---|---|---|
| **debug** | Day-to-day work. Loads its JavaScript from your PC over Wi-Fi; code changes appear in a second. Shows the FPS meter. | Yes (`npx expo start --dev-client`) |
| **release** | Everything built in. Just open it. Use it to judge real speed. | No |

Both use the same app ID, so installing one replaces the other.

## 1. Download the .apk

1. Open the pull request on GitHub → **Checks** tab → **Android build** → **Summary**.
2. Under **Artifacts**, download `JalanJer-Android-release-….apk` (or `-debug-`).
3. GitHub gives you a `.zip`. Extract it to get the `.apk`.

Easiest: do this **on the phone itself** in Chrome (signed in to GitHub). Android can open the
`.zip` in the Files app and extract it there.

Or download on the PC and copy the `.apk` to the phone (USB cable, Google Drive, or email it to yourself).

## 2. Install it

1. On the phone, tap the `.apk` file (in **Files** / **Downloads**).
2. Android warns about installing apps from unknown sources. Tap **Settings**, turn on
   **Allow from this source** for the app you opened it with (Files or Chrome), go back.
3. Tap **Install**. If Google Play Protect asks to scan, that's fine; tap **Install anyway** if it
   says the app is unknown (it is: it's your own app, not from the Play Store).
4. Open **JalanJer!** and allow **Location** ("While using the app").

The exact wording differs between phone brands (Samsung, Xiaomi, etc.), but the steps are the same.

## 3. Debug build only: connect to your PC

1. Phone and PC on the **same Wi-Fi**.
2. On the PC, in the project folder:

   ```bash
   npx expo start --dev-client
   ```

3. Windows Firewall asks about **Node.js** the first time: tick **Private networks**, **Allow**.
4. Open JalanJer! on the phone, tap your PC in the list, or **Enter URL manually**:
   `http://<your PC's IP>:8081` (find the IP with `ipconfig` → **IPv4 Address**).

## What to check

- Map opens on Shah Alam, blue dot shows where you are.
- Debug build: the meter at the top shows **JS** and **UI** frames per second while you move the map.

This tests the app's features on Android. iPhone smoothness still has to be checked on the iPhones.
