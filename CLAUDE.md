# MARTA Transit Intelligence — P7

## Status: LIVE — NEXTGEN UPDATE NEEDED TODAY (April 18, 2026)
- Dashboard: https://marta-p7.netlify.app
- Portfolio: https://www.generoth.com (Project 07)
- Netlify site: marta-p7 under "Airport Consulting" team
- Project root: C:\Users\GeneR\Documents\AI_Projects\marta-p7
- generoth.com source: C:\Users\GeneR\OneDrive\Documents\Gene Roth Website\generoth-com

## TOOL ACCESS
You have MCP filesystem tools for read/write to C:\Users\GeneR. Call tool_search with "filesystem write file" to load them if not available. You also have Chrome browser automation tools (call tool_search with "navigate browser chrome"). You can deploy via Claude Code CLI at the marta-p7 directory with `npm run deploy`.

## TODAY'S TASK: NextGen Bus Network Update
MARTA's NextGen Bus Network launches TODAY April 18, 2026. The dashboard needs these updates:

### Changes to make:
1. **Remove or update the NextGen timing banner** — currently says "NextGen launches April 18, 2026 — this view shows the current 118-route network." Change to something like "Now showing MARTA's NextGen Bus Network — 81 routes + 12 Reach zones, launched April 18, 2026" or remove entirely.
2. **Check if the static GTFS feed auto-updated** — the main URL is https://www.itsmarta.com/google_transit_feed/google_transit.zip. There's also a pre-published NextGen feed at https://www.itsmarta.com/google_transit_feed/April18_2026_google_transit.zip. The gtfs-static.js function caches the zip for 6 hours. If the main URL hasn't updated yet, temporarily point to the April18 zip.
3. **Update route count references** — "118 routes" → "81 routes + 12 Reach zones" in:
   - The "How This Was Built" section (in index.html)
   - The generoth.com P7 card (in generoth-com/app/page.tsx, PORTFOLIO array item 07)
4. **Verify the dashboard still works** — route IDs will change. The reverse lookup (short_name → internal ID) rebuilds automatically on cold start, but verify bus clicks still show route shapes.
5. **Optional: Add equity analysis note** — from prior analysis: ~40.91 sq mi lose fixed-route coverage, ~4,881 disabled residents in affected tracts. Tracts losing coverage have slightly LOWER disability rates than tracts keeping it (opposite of what might be assumed). This is a defensible, data-backed claim.

### What NOT to change:
- The equity panel does NOT claim NextGen disproportionately affects disabled communities — this is confirmed clean
- Population estimates are labeled as "directional approximations" — leave this honest framing
- The MARTA Reach / Mobility caveat in the footnote is accurate — keep it

## Architecture recap
- 3 Netlify serverless functions (netlify/functions/):
  - bus-feed.js: GTFS-RT protobuf → JSON, endpoint: https://gtfs-rt.itsmarta.com/TMGTFSRealTimeWebService/vehicle/vehiclepositions.pb
  - rail-feed.js: MARTA Rail REST API proxy, key in MARTA_RAIL_KEY env var
  - gtfs-static.js: 20MB GTFS zip cached 6h, Douglas-Peucker simplified shapes, route directory
- Frontend: vanilla HTML/CSS/JS, MapLibre GL on Carto Dark Matter basemap
- GTFS-RT uses short route IDs ("117"), static feed uses internal IDs ("27383"). App builds reverse lookup via short_name.

## Key technical notes (hard-won from debugging)
- **CSP**: Never use `new Error().stack` or eval-like constructs — Netlify's CSP blocks them silently and kills script execution
- **GeoJSON**: Must strip non-standard `properties` field from FeatureCollection before passing to MapLibre's setData — it silently rejects rendering otherwise. Fix: `{ type: 'FeatureCollection', features: geo.features }`
- **Map init**: MapLibre's `load` event can fail silently if Carto tiles stall. Fallback uses `style.load` + `isStyleLoaded()` check
- **Bus clicks**: Use 30x30px bounding-box query via queryRenderedFeatures for easier targeting. All click logic is inlined in one unified map.on('click') handler.
- **Route shapes**: Rendered as hot pink (#ff3366) 4px solid line with 12px glow. Auto-zooms to fit route with fitBounds (420px right padding for sidebar).

## People's Transit / Chuck Covington context
- People's Transit Ltd. = DBE subcontractor for MARTA Mobility paratransit
- Operates out of Brady Bus Facility (1040 Brady Ave NW)
- Email drafted and ready to send highlighting equity findings + NextGen implications
- Key insight for Chuck: Reach zones don't trigger same ADA paratransit mandate as fixed routes

## File structure
marta-p7/
  .gitignore, .env.example, package.json, netlify.toml, README.md, CLAUDE.md
  netlify/functions/ — bus-feed.js, rail-feed.js, gtfs-static.js
  public/ — index.html, styles.css, app.js
  scripts/ — smoke-test.js

## Deploy process
Claude Code: `cd C:\Users\GeneR\Documents\AI_Projects\marta-p7 && npm run deploy`
Vercel (generoth.com): `cd "C:\Users\GeneR\OneDrive\Documents\Gene Roth Website\generoth-com" && vercel --prod`
