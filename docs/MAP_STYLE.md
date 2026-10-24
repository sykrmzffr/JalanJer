# Map style

The light map is our own flat, Waze-like version of OpenFreeMap's free "Liberty" style.
It's bundled with the app (`src/features/map/styles/light.json`), so the map doesn't wait
for a style download. The tiles still come from OpenFreeMap (free, no key).

## What's different from Liberty

- No 3D buildings and no shaded relief: flat, like Waze's default view.
- Few colours: grey land, white roads with a grey edge, soft green parks, soft blue water.
  The grey, white, road-edge, park and water colours were sampled from the Waze screens in
  `IMAGE REFERENCES/`. The rest (buildings, labels, highway edge) are my starting choices.
- No shop/place icons, no footpaths, no route-number boxes (E6, 286…): less clutter while
  driving. Road names still show.

The navigation camera is also flat now (no tilt).

The dark map is still OpenFreeMap's own "Dark" style (already flat and low-colour).

## Changing it

1. Edit the colours or the removed-layer list in `scripts/build-map-style.mjs`.
2. Run `npm run map-style` (needs internet; downloads Liberty and rewrites `light.json`).
3. Commit `light.json`.

Running it again also picks up OpenFreeMap's own fixes to Liberty.
