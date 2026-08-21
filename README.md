# MARTA Transit Intelligence — Portfolio Project P7

A real-time Atlanta transit dashboard. Live buses from GTFS-RT, live trains from MARTA's rail API, rail-line polylines, paratransit equity analysis, AI-generated narrative, 30-second refresh cycle.

## Architecture

Browser (public/)
- MapLibre GL → Carto Dark Matter basemap (no key)
- Rail polylines + stations → inline GeoJSON (hand-curated; cleaner than shapes.txt for rail)
- Live trains (arrows) → /api/rail → Netlify function → MARTA Rail API (w/ key)
- Live buses (dots) → /api/bus → Netlify function → MARTA GTFS-RT (protobuf → JSON)
- Route shapes → /api/gtfs/shape-for-route?route=ID → Netlify function (DP-simplified)
- Route names → /api/gtfs/routes-directory → Netlify function

Three serverless functions solve three problems:
- bus-feed — decodes GTFS-RT protobuf and adds CORS
- rail-feed — holds the API key server-side, dedupes arrivals per train
- gtfs-static — caches the 20MB zip for 6h, precomputes Douglas-Peucker–simplified per-route GeoJSON + route metadata

## Setup

    npm install
    echo "MARTA_RAIL_KEY=your-key-here" > .env
    netlify dev

## Deploy

    netlify init
    netlify env:set MARTA_RAIL_KEY "your-key-here"
    npm run deploy

## Link from generoth.com

    <a href="https://marta-p7.netlify.app" class="project-card">
      <div class="project-num">P7</div>
      <h3>MARTA Transit Intelligence</h3>
      <p>Live Atlanta bus & rail dashboard — GTFS-RT, equity analysis, AI narrative.</p>
      <div class="project-tech">MapLibre · Netlify Functions · GTFS-RT · protobuf</div>
    </a>

## Notes on the equity panel

Paratransit coverage is approximated live:
- Active bus positions binned into ~1km grid cells (tract proxy)
- Each cell expanded by one ring of neighbors (~¾-mile ADA paratransit buffer)
- Mean tract population (~3,900, ACS 5-year Atlanta region)
- MARTA service-area population baseline (~1.5M)

Directional, not definitive — but it reflects reality: when buses thin out (late evenings, Sundays), paratransit-eligible coverage contracts with them.

## Refresh cadence

Dashboard polls every 30s. Server-side caches: 15s bus, 10s rail, 6h static-feed zip.
