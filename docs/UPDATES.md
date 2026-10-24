# Updating the Android app from inside the app

No more zip files: **☰ → Settings → App updates → Download and install**.

## How it works

1. Every Android build on GitHub (Actions → **Android build**) also puts its release APK on
   one GitHub release called **"Latest Android test build"** (tag `android-latest`). Each new
   build replaces the APK there, together with a small `latest.json` saying which commit and
   when.
2. The app checks that `latest.json` a few seconds after it opens, and every time you open
   **App updates**. When a newer build is there, the ☰ menu button gets a dot and the
   Settings row says **New build ready**.
3. **Download and install** downloads the APK inside the app and opens Android's installer.
   Tap **Install**. The app closes and the new version opens next time.

## The first time

- Install one APK the old way (zip from Actions), because the button needs new parts of the
  app that older builds don't have.
- The first time you tap **Download and install**, Android says it can't install apps from
  this source. Tap **Settings**, turn on **Allow from this source** for JalanJer!, go back
  and tap the button again. Android always asks you to confirm **Install** after that. No
  app outside the Play Store can skip that step.

## Good to know

- The repo is public, so anyone can download the test APK from the release page.
- Test builds are signed with Android's standard debug key, which is public. That's why
  each build installs over the last one, but it's for testing only. Before the Play Store
  (Milestone 7) we switch to a private key and turn this updater off (the Play Store
  doesn't allow apps that install other apps; the `REQUEST_INSTALL_PACKAGES` permission
  in `app.json` has to go).
- The newest build from **any** branch wins. Right now that's always `main-kdl2pb`.
- iPhone: not possible (Apple doesn't allow apps to install themselves).
- Free: GitHub Releases on a public repo.

## Code map

- `.github/workflows/android-build.yml`: stamps the build (`EXPO_PUBLIC_BUILD_SHA`,
  `EXPO_PUBLIC_BUILD_TIME`) and publishes the release.
- `src/features/updates/core/update-core.ts`: reading `latest.json`, deciding if it's newer
  (unit-tested). Only installs from `https://github.com/` addresses.
- `src/features/updates/update-store.ts`: check, download (expo-file-system), open the
  installer (expo-intent-launcher).
- `src/features/updates/updates-page.tsx`: the Settings screen.
