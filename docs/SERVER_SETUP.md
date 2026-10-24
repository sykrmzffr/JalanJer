# Our own search + routing server (draft plan, not tried yet)

Right now the app uses free **public** servers for search (Photon) and routing (Valhalla).
They're fine for testing on our phones, but they ask for light use only and promise no
uptime. Before other people use JalanJer!, we run our own on the Oracle Always Free server.

> **Status: research notes and a plan, not a tested recipe.** Nothing here has been run yet.
> Facts are marked with their source; anything I couldn't confirm says so.

## 1. Sizing: will it fit on the free server?

| | What we know | Source |
|---|---|---|
| Oracle free ARM server | Reportedly **2 CPUs + 12 GB memory** since mid-2026 (was 4 + 24). 200 GB disk. | News and community reports. See `docs/SEARCH.md`. Check Oracle's page. |
| Valhalla (routing) for Malaysia | Built from an OpenStreetMap extract of Malaysia (+ Singapore, Brunei). Size unknown to me; small next to the whole world. | Valhalla Docker README |
| Photon (search) | **No Malaysia-only ready-made database.** Ready-made databases exist for the planet, continents (**asia ≈ 13.5 GB compressed**, "older estimate") and 16 countries (in Asia only India and Japan). | `rtuszik/photon-docker` README (checked 2026-10-23) |
| Photon memory | Planet: 64 GB recommended; can run with less by limiting Java's heap (e.g. `-Xmx8G`). | Photon README |

**Biggest unknown**: Photon with the whole of Asia on a 12 GB server that also runs Valhalla.
It may be too much. Options, in order of effort:

1. **Try Asia** with a capped Java heap (e.g. 6 GB) and see if search stays fast.
2. **Build a Malaysia-only Photon database** ourselves (Nominatim import of the Malaysia
   extract, then export to Photon). More work, much smaller result.
3. **Keep using public Photon** for search a while longer and self-host only Valhalla.

## 2. Plan (Docker)

Both run as Docker containers. Images:

- **Valhalla**: `ghcr.io/valhalla/valhalla-scripted:latest`, the official image. Its build
  workflow publishes both `linux/amd64` and `linux/arm64`, so it runs on Oracle's ARM server.
  Give it an OpenStreetMap file with `tile_urls=…` and it builds the routing data on first
  start, then serves on port **8002**. Docs: `docker/README.md` in the Valhalla repo.
- **Photon**: `rtuszik/photon-docker`. **Unofficial** (not made by the Photon team), but
  widely used. `REGION=asia` downloads the ready-made Asia database; `JAVA_PARAMS` sets
  memory; serves on port **2322**. I haven't checked whether it has an ARM version.

Draft `docker-compose.yml` (untested; check each image's README before using):

```yaml
services:
  valhalla:
    image: ghcr.io/valhalla/valhalla-scripted:latest
    restart: unless-stopped
    volumes:
      - ./valhalla:/custom_files
    environment:
      # Check the exact file name at https://download.geofabrik.de/asia/ first.
      # (I believe there is a combined malaysia-singapore-brunei extract; not confirmed.)
      - tile_urls=https://download.geofabrik.de/asia/malaysia-singapore-brunei-latest.osm.pbf
      - server_threads=2
    ports:
      - "127.0.0.1:8002:8002"

  photon:
    image: rtuszik/photon-docker:latest
    restart: unless-stopped
    volumes:
      - ./photon:/photon/data
    environment:
      - REGION=asia
      - UPDATE_STRATEGY=SEQUENTIAL
      - JAVA_PARAMS=-Xmx6g
    ports:
      - "127.0.0.1:2322:2322"
```

The ports are bound to `127.0.0.1`, so they're **not** open to the internet directly. A small
web server in front (e.g. Caddy) adds HTTPS and is the only thing exposed.

## 3. Why HTTPS is needed

iPhones and recent Android versions block plain `http://` connections from apps by default.
So the server needs a domain name and a certificate. Free route: a free subdomain
(e.g. DuckDNS) plus Caddy, which gets a free Let's Encrypt certificate automatically.
(Plan only; I haven't checked DuckDNS's current terms.)

## 4. Switching the app over

No code change. Set two GitHub repository variables (and the same in `.env` on your PC):

- `EXPO_PUBLIC_PHOTON_URL` = `https://<your-domain>/photon` (or a separate subdomain)
- `EXPO_PUBLIC_VALHALLA_URL` = `https://<your-domain>/valhalla`

Then run the build workflows again.

## 5. Your part (when you're ready)

1. Sign up for Oracle Cloud Free Tier. Read the current Always Free limits on Oracle's page
   first (`docs/SEARCH.md` has the link). Pick a home region close to Malaysia if offered
   (e.g. Singapore). Free ARM capacity is often "out of stock" in busy regions.
2. Create the ARM (Ampere A1) server within the free limits, with Ubuntu.
3. Tell me, and we go through the rest step by step in a session.
