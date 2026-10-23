# Sentry: crash reports and performance

Sentry tells you when the app crashes on a phone and how fast it is (app start time,
slow and frozen frames). We use its **free plan**. Until you set it up, the app works
normally with Sentry switched off.

Free-plan limits (number of errors and performance events per month) change from time to
time; check <https://sentry.io/pricing/>. With two test phones we stay far below them.

## 1. Create the Sentry project (one time)

1. Sign up at <https://sentry.io> (free).
2. Create a project and choose **React Native** as the platform. Name it `jalanjer`.
3. Sentry shows a **DSN**: a web address that looks like
   `https://1234abcd...@o123456.ingest.sentry.io/7890123`. Copy it.
   (You can find it again later under Project Settings → Client Keys (DSN).)

The DSN only lets an app *send* reports to your project; it can't read anything.
Apps always ship with it inside, so it's fine that it ends up in the app.

## 2. Put the DSN in two places

**a) On your Windows PC** (used by the Debug build, which loads JS from your PC):

1. In the project folder, copy `.env.example` to a new file named `.env`.
2. Paste the DSN after `EXPO_PUBLIC_SENTRY_DSN=`, save.
3. Restart `npx expo start --dev-client`.

`.env` is never committed, so the DSN doesn't go into the public repo.

**b) On GitHub** (used by the Release build, which has its JS built in the cloud):

1. Repo → **Settings** → **Secrets and variables** → **Actions** → **Variables** tab.
2. **New repository variable**: name `EXPO_PUBLIC_SENTRY_DSN`, value = the DSN.
3. Re-run the **iOS build** workflow and install the new Release `.ipa`.

## 3. Check it works

Open the app, then look at your project on sentry.io:

- The performance pages (Sentry has renamed these over time, e.g. "Performance" or "Insights"): app start time and slow/frozen frames.
- **Issues**: crashes and errors, if any happened.

Debug builds report as environment `development`, Release builds as `production`.
Judge speed numbers only from `production`.

## Later (optional): readable crash locations

Crash reports currently show positions in the compiled app code. To see the original
file and line, Sentry needs the source maps uploaded at build time. That needs a Sentry
auth token stored as a GitHub **secret** and a small workflow change. Ask for it when
crash reports start mattering; it's free too.
