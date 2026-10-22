# Cloud sessions for JalanJer!

A cloud session is a Claude Code session running on a Linux VM that Anthropic hosts. It keeps working when your PC is off, and you can steer it from the Claude desktop app, claude.ai/code, or the Claude phone app. No extra charge beyond your Claude plan.

Cloud VMs are Linux, so they **can't compile iOS apps either**. They write code, run type checks and tests, and can trigger iOS builds on EAS / GitHub Actions cloud Macs.

## 1. Put the project on GitHub (one time)

Cloud sessions clone from GitHub.

1. (Recommended) Rename the folder to `JalanJer` (no `!`).
2. Create an empty repo on github.com (e.g. `jalanjer`). Public gives unlimited free macOS CI minutes; private is fine too.
3. In the project folder:

   ```bash
   git init -b main
   ```

   ```bash
   git add .
   ```

   ```bash
   git commit -m "Add build plan and reference screens"
   ```

   ```bash
   git remote add origin https://github.com/<you>/jalanjer.git
   ```

   ```bash
   git push -u origin main
   ```

   (Or ask Claude in a local session to do this.)

## 2. Connect GitHub to Claude (one time)

1. Open https://claude.ai/code and follow onboarding.
2. Authorize the **Claude GitHub App** and install it on the `jalanjer` repo. This also enables **Auto-fix** on pull requests (Claude fixes CI failures and review comments).

## 3. Create the cloud environment (one time)

At claude.ai/code (or the desktop app when starting a Cloud session), open the environment selector → **New environment**:

- **Name:** `jalanjer`
- **Network access:** **Limited**, keep **Allow package managers** ticked, and paste into **Allowed domains**:

  ```
  *.expo.dev
  expo.dev
  exp.host
  download.geofabrik.de
  tiles.openfreemap.org
  ```

  (**Allow package managers** covers npm, Maven/Gradle, CocoaPods and the like. Git clone/push goes through Anthropic's GitHub proxy. Expo is not covered, which is why it's listed.)
- **Environment variables:** non-secret values only, e.g. `NODE_ENV=development`. Anyone using the environment can read them.
- **Network secrets:** put `EXPO_TOKEN` here later (from expo.dev → Access tokens) so the session can start EAS builds without ever seeing the token.
- **Setup script** (runs as root on Ubuntu 24.04, cached if it finishes in ~5 min; Node 22 is preinstalled):

  ```bash
  #!/bin/bash
  set -e
  npm install -g eas-cli
  ```

Project dependencies (`npm install`) go in a SessionStart hook in the repo's `.claude/settings.json` instead, so they run both locally and in the cloud. Claude sets that up in Milestone 0.

## 4. Start a cloud session

Any of these:

- **Desktop app (Code tab):** start a new session → choose **Cloud** instead of **Local** → pick the `jalanjer` repo and environment.
- **Browser / phone:** claude.ai/code or the Code tab in the Claude app.
- **Terminal** (after installing the Claude Code CLI), from the repo folder:

  ```bash
  claude --cloud "Do Milestone 0 from docs/PLAN.md"
  ```

Good habit: plan locally, commit the plan, then send execution to the cloud (as with `docs/PLAN.md`).

## 5. Bring cloud work back

- The cloud session works on a branch and can open a pull request; review the diff in the session.
- To continue on your PC: `claude --teleport` (pick the session) in the repo folder, or **Open in > Terminal** from the session menu.

## What runs where

| Task | Where |
|---|---|
| Writing code, tests, type checks, lint | Cloud session or local |
| JS hot reload on your iPhone | Local (Metro on your PC, phone on the same Wi-Fi) |
| Compiling the iOS app | EAS Build or GitHub Actions macOS runner |
| Installing on your iPhone (free) | Sideloadly on Windows, free Apple ID, re-sign every 7 days |
| Real driving tests | You, with the phone 🙂 |
