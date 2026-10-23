# Search (Milestone 2)

How place search works, which server it uses, and what still needs checking on a phone.

## What you can do

- Tap **Where to?** on the map. The search screen slides up.
- **Type** a place or address. Places you saved or went to before show up instantly.
  Results from the internet follow a moment later, nearest first.
- **Malay short forms work**: `jln` = Jalan, `tmn` = Taman, `kg` = Kampung, `bdr` = Bandar,
  `lrg` = Lorong, `sg` = Sungai, `bkt` = Bukit, `kl` = Kuala Lumpur, `pj` = Petaling Jaya,
  `jb` = Johor Bahru. `ss2` and `ss 2` mean the same.
- **Chips**: Saved, Gas, Food, Parking, EV charging, Coffee, Hospital, ATM. Tapping one
  (except Saved) lists that kind of place near you. Tap it again to turn it off.
- **Home / Work**: "Set once and go" opens a search for that address. After that, one tap
  goes there.
- **Recents**: swipe a row left, then tap **Delete**. Works on the search screen and in the
  map sheet.
- **Save a place**: tap the bookmark at the right of any search result. Saved places appear
  under the **Saved** chip and on the map sheet.
- Picking a result puts a pin on the map and shows a card with the name and address.
  Routes to it come in Milestone 3.

- **Voice search**: tap the mic (in the search field, or on the map's "Where to?" row) and
  say a place. It uses the phone's own speech recognition (Apple on iPhone, Google on
  Android), trying Malay first and English if Malay isn't available. How well it handles
  Malaysian place names is **untested**.

## Which search server

Search uses **Photon**, a free, open-source search engine for OpenStreetMap data.

| | Now (testing) | Later (before sharing the app) |
|---|---|---|
| Server | Komoot's free public server, `https://photon.komoot.io` | Our own Photon on the Oracle free server |
| Cost | Free | Free (see the Oracle note below) |
| Limits | "Reasonable" use only. Heavy use gets throttled or banned. No uptime promise. | Only our server's capacity |

What Photon's own README says about the public server (checked 2026-10-23):
"You are welcome to use the API for your project as long as the number of requests stay in
a reasonable limit. Extensive usage will be throttled or completely banned. We do not give
guarantees for availability and reserve the right to implement changes without notice."
<https://github.com/komoot/photon>

Two test phones are clearly "reasonable". The app also keeps requests low: it waits
until you stop typing for 0.12 s, needs at least 3 letters, cancels requests you no longer
need, and remembers recent answers. Before anyone else uses the app, move to our own server.

**To switch servers** (no code change): set `EXPO_PUBLIC_PHOTON_URL` to the server address.
Put it in `.env` on your PC for Debug builds, and add a GitHub repository variable with the
same name for the cloud builds (Settings → Secrets and variables → Actions → Variables).

## Our own server: research notes

### Oracle Always Free got smaller in 2026

Several sources report that Oracle **halved** the free Arm (Ampere A1) server: from 4 CPUs +
24 GB memory to **2 CPUs + 12 GB memory** (1,500 OCPU-hours and 9,000 GB-hours a month).
The reported start date differs between sources (15 June or 18 August 2026). One report says
servers above the new size get shut down until you shrink them. The 200 GB of free disk is
reported unchanged.

I could not open Oracle's own page from the cloud environment, so this comes from news and
community reports quoting it. Check <https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm>
before signing up. Sources:
[InfoQ](https://infoq.com/news/2026/07/oracle-cloud-free-tier-limits/),
[Linuxiac](https://linuxiac.com/oracle-quietly-cuts-free-tier-ampere-a1-resources-in-half/),
[Oracle community post](https://community.oracle.com/customerconnect/discussion/970310/oci-always-free-updated-ampere-a1-compute-allocation),
[terminalbytes](https://terminalbytes.com/oracle-cloud-free-tier-changes-2026/).

**What this means for us**: the plan (`docs/PLAN.md`) puts Photon (search) and Valhalla
(routing) together on the Oracle server. 12 GB is half of what the plan assumed. A
Malaysia-only setup is much smaller than the whole world, so it may still fit, but I don't
have numbers for a Malaysia-only Photon or Valhalla yet. Measure before relying on it.

### Photon's hardware needs

From Photon's README (2026): the **whole world** needs about 95 GB of disk and ideally 64 GB
of memory. It can run with less memory by giving Java a smaller heap (their example:
`-Xmx8G`). It needs Java 21 or newer. GraphHopper publishes ready-made weekly database
downloads at <https://download1.graphhopper.com/public>, for the world and some countries.
I couldn't open that page from the cloud environment, so **I don't know** whether a
Malaysia-only download exists or how big it is. Check that first. If there isn't one, a
Malaysia database has to be built with Nominatim, which is a bigger job.

### Photon API features used

From <https://github.com/komoot/photon/blob/master/docs/api-v1.md>:
`q` (text), `lat`/`lon` + `zoom` + `location_bias_scale` (prefer places near you),
`bbox` (we limit results to Malaysia plus a margin into Singapore and southern Thailand),
`limit`, and `include` for categories, e.g. `include=osm.amenity.fuel`. A comma means
"any of". `q` can be left out when `include` is given.

**Unverified**: the category chips depend on `include` working on the public server
(added in Photon 1.0; the latest release is 1.3.0). The cloud environment can't reach
photon.komoot.io, so this has **not been tested against the real server**. If the chips
show an error on the phone, this is the first thing to look at.

## Code map

- `src/features/search/core/search-core.ts`: text matching, Malay short forms, distance,
  ranking, merging results. Pure TypeScript with unit tests (`npm test`).
- `src/features/search/core/photon-core.ts`: Photon URLs and response parsing, also tested.
- `src/features/search/photon-client.ts`: the network call (timeout, cancel, errors).
- `src/features/search/use-search.ts`: search-as-you-type hook (instant local results,
  120 ms debounce, cancel stale requests, cache).
- `src/features/search/search-screen.tsx` and `components/`: the screen.
- `src/stores/destination-store.ts`: the picked place. Milestone 3 (routes) starts here.
