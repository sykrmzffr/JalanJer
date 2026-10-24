# Reports (Milestone 6)

Tap the yellow **+** (on the map or while navigating) to report what you see. It's
reported at your current position. Everyone nearby sees it as a pin; passing drivers get
a "Still there?" question.

## Your part in Supabase (once)

Dashboard → **SQL Editor** → **New query** → paste all of
`supabase/migrations/0002_reports.sql` → **Run** → "Success. No rows returned".

Until that's done, reporting shows "Couldn't send the report" and no pins appear.

## What you can do

- **Report**: Traffic jam, Police, Accident, Hazard, Road closed. You need to be signed in
  (stops spam). Big buttons, but please report only when stopped or let a passenger do it.
- **See reports**: coloured pins on the map within about 25 km, refreshed every minute.
  Tap a pin for details (how long ago, how many confirmed).
- **Still there?**: tap a pin, or drive within about 150 m of one while navigating, and
  answer **Still there** / **Not there**. The question hides itself after 12 seconds.
  You're not asked about your own reports or ones you already answered.

## Rules (enforced by the server, not just the app)

| Rule | Value |
|---|---|
| Who can see reports | Everyone, signed in or not. **Never who made them.** |
| Who can report | Signed-in users, at most **10 per hour** each |
| How long a report lasts | Traffic jam 30 min, Police 60 min, Accident 90 min, Hazard 2 h, Road closed 6 h |
| "Still there" | Keeps it for at least 30 more minutes from now |
| "Not there" | 2 of them hide the report |
| Votes | One per person per report |

The lifetimes are starting values I chose, not taken from Waze or any study. Change them
in `report_lifetime()` in the SQL file and run it again.

## Not done yet

- Reports ahead **on your route** in the turn list ("Reports ahead" tab, plan item 5).
- Spoken warnings ("Police reported ahead").
- Photos or comments on reports; editing or deleting your own report.
- Moderation tools.

## Code map

- `supabase/migrations/0002_reports.sql`: tables, expiry, limits, voting, security rules.
- `src/features/reports/core/reports-core.ts`: pure helpers, unit-tested.
- `src/features/reports/reports-store.ts`: loading, reporting, voting, refresh.
- `src/features/reports/report-screen.tsx`: the report picker.
- `src/features/reports/components/`: map pins and the report card.
