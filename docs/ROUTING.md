# Route preview (Milestone 3)

What happens after you pick a place in search, which server calculates routes, and what's
still missing.

## What you can do

- Pick a place in search (or tap Home, Work, a saved place or a recent one). The map
  shows a header card ("Your location ↓ Place") and the route panel at the bottom.
- **Up to 3 routes** appear on the map. The selected one is the thick blue line on top;
  the others are thinner. Each route has a **time bubble**; the fastest says **Best**.
- **Tap a line, a bubble or a row** in the panel to select that route.
- Each row shows: travel time, distance, the main roads ("via …"), arrival time (24-hour),
  and tags: **Best**, **Toll**, **Ferry**.
- **Avoid**: Tolls, Highways, Ferries. Tap to switch on/off. Routes reload straight away.
  Your choices are remembered for next time.
- **Back arrow** on the header card closes the preview and returns to the normal map.
- **Go now** says "coming soon": turn-by-turn navigation is Milestone 4.

## Not done yet (honest list)

| Plan item | Status | Why |
|---|---|---|
| **Toll cost in RM** per route | Not done. Rows only say **Toll** | No free API has Malaysian toll prices (see `docs/PLAN.md`). Prices must come from a table we build from official sources (PLUS, LLM, operators) and check. I won't invent numbers. |
| **Leave later** | Not done | Valhalla doesn't return alternative routes for timed requests (its API reference says alternates "are also not supported on time dependent routes"), and without live traffic a later departure would show the same times anyway. |
| Avoid as a dropdown **menu** | Done as three toggle chips instead | One tap per option instead of two. Easy to change if you prefer a menu. |
| Route draws in **< 1 s** (performance budget) | Unmeasured | Depends on the server and how far away it is. I don't know where the public server is hosted; our own server can be in an Asian Oracle region. |

## Which routing server

Routes come from **Valhalla**, a free, open-source routing engine using OpenStreetMap roads.

| | Now (testing) | Later (before sharing the app) |
|---|---|---|
| Server | Public demo server run by FOSSGIS, `https://valhalla1.openstreetmap.de` | Our own Valhalla on the Oracle free server |
| Rules | Fair use, enforced by rate limits. No uptime promise. | Only our server's capacity |

Valhalla's README (checked 2026-10-23): "Usage of the demo server follows the usual
fair-usage policy as OSRM & Nominatim demo servers (somewhat enforced by rate limits)."
It also asks apps that use the public server to identify themselves with an
`X-Client-Id` header, which the app sends (`JalanJer`), and to let the project know through
GitHub Discussions if an app is published. <https://github.com/valhalla/valhalla>
One CRAN guide quotes the rate limit as 1 request per second per user; I couldn't
confirm that on an official page.

**To switch servers** (no code change): set `EXPO_PUBLIC_VALHALLA_URL`, in `.env` on your PC
and as a GitHub repository variable for the cloud builds. Same steps as for search
(`docs/SEARCH.md`).

## Things that are guesses until tested on a phone

The cloud environment can't reach the routing server, so none of this has run against
the real server yet. The code follows Valhalla's API reference, and the parsing is
unit-tested with made-up responses in the documented shape. Check these first if
something looks wrong:

1. **Where alternative routes are in the answer**: checked in Valhalla's source code
   (`src/tyr/route_serializer_valhalla.cc`, 2026-10-23). The answer has the main route in
   `trip` and the others in a top-level `alternates` list, each with its own `trip`. That's
   exactly what the app reads. If only one route shows up, the server simply found no good
   alternative ("There may be no alternates", says the API reference).
2. **Instructions language**: Valhalla has no Malay (checked the supported list), so
   instructions come in British English. That only matters for Milestone 4 (voice).
3. **Avoid**: Valhalla treats "avoid" as a strong preference, not a hard rule. If a toll
   road is the only way, the route still uses it (and still shows **Toll**).

## Code map

- `src/features/route/core/valhalla-core.ts`: request body, polyline decoding, response
  parsing, time/distance formatting, bubble placement. Unit-tested (`npm test`).
- `src/features/route/valhalla-client.ts`: the network call (timeout, cancel, errors).
- `src/features/route/use-routes.ts`: loads routes for the picked place with your Avoid
  settings; ignores answers to older requests.
- `src/features/route/components/route-lines.tsx`: lines and time bubbles on the map
  (drawn by MapLibre on the GPU).
- `src/features/route/components/route-preview-panel.tsx`: the bottom panel.
- `src/stores/settings-store.ts`: remembered Avoid choices.
