# Accounts and synced places (Supabase)

Sign in with your email (no password) and your **Home, Work, saved and recent places**
follow you to every phone you sign in on. Without signing in, everything still works and
stays on the phone.

Project: `https://cxugmbtnmxqwlyuulfkj.supabase.co` (free plan).

## Your part in the Supabase dashboard (once, ~10 minutes)

### 1. Create the table and its security rules

1. Dashboard → **SQL Editor** → **New query**.
2. Open `supabase/migrations/0001_places.sql` from the repo, copy all of it, paste, click **Run**.
3. It should say "Success. No rows returned".

What it does: one `places` table. **Row Level Security** means each signed-in person can
only read and change their own rows; signed-out visitors can't touch it at all.

### 2. Make the sign-in email contain a code

The app asks for a 6-digit code (no links to tap), so the emails must include it.

1. Dashboard → **Authentication** → **Emails** (or "Email Templates").
2. Open the **Magic Link** template. Replace the body with something like:

   ```html
   <h2>Your JalanJer! code</h2>
   <p>Enter this code in the app: <strong>{{ .Token }}</strong></p>
   <p>It expires in 1 hour. If you didn't ask for it, ignore this email.</p>
   ```
3. Do the same for the **Confirm signup** template (first-time sign-ins may use that one).
   I'm not 100% sure which of the two Supabase sends to brand-new users, so do both.
4. Save.

### 3. Check sign-in is switched on

Authentication → **Sign In / Providers** → **Email** is enabled. Leave "Confirm email" as it is.

## Limits on the free plan (good to know)

- **Emails**: Supabase's built-in email sender is for testing and has a low limit
  (Supabase's docs said 3 emails an hour; check Authentication → Rate Limits). Fine for us
  two; real users later need a custom email sender (SMTP), which can also be free.
- A code can be requested once every 60 seconds, and expires after 1 hour (Supabase docs).
- The free project **pauses after 7 days with no activity**. Places stay on the phone; press
  **Restore** in the dashboard to wake it.

## How sync works

- The phone is the main copy. Every change is saved on the phone first, then synced a few
  seconds later, when the app opens, and when it comes back to the front.
- If two phones change the same thing, the **newest change wins** (by the phones' clocks).
- Deleting a place on one phone deletes it on the others too.
- Signing out keeps your places on this phone. If someone else then signs in on the same
  phone, those places would merge into their account, so sign out only on your own phones.

## Privacy

Your Home and Work addresses are personal data. They are stored in our Supabase project
(Singapore if that region was chosen) and protected by the rules above. Before the app is
public we need a privacy policy that says this (Malaysia's PDPA applies).

## Code map

- `supabase/migrations/0001_places.sql`: table + security rules.
- `src/lib/supabase.ts`: the connection (URL and publishable key; never the secret key).
- `src/features/account/core/places-sync.ts`: merge logic, unit-tested (`npm test`).
- `src/features/account/places-sync-service.ts`: when and how sync runs.
- `src/features/account/account-screen.tsx`: Settings → Sign in / Account.
