# Missing function sources

`netlify.toml` declares three serverless functions. Their source was lost — it
existed only inside Netlify's build and is not recoverable from the deployed
site. They are still running in production.

| Function | Purpose | Timeout | Notes |
|----------|---------|---------|-------|
| `bus-feed` | MARTA realtime bus positions | 20s | routed from `/api/bus` |
| `rail-feed` | MARTA realtime rail | 15s | routed from `/api/rail`; needs `MARTA_RAIL_KEY` |
| `gtfs-static` | Serves static GTFS files | 26s | routed from `/api/gtfs/*` |

## Observed behaviour of `gtfs-static`

Probed 2026-08-21 against production. Useful if it has to be rewritten:

- Takes a `?file=` query parameter.
- Validates against an allowlist: `routes.txt`, `shapes.txt`, `trips.txt`,
  `stops.txt`, `agency.txt`, `calendar.txt`.
- Anything else returns HTTP 400 with
  `{"error":"bad_file","allowed":[...]}`.
- `netlify.toml` also routes two named variants: `routes-directory` and
  `shape-for-route`.

It is correctly built — the allowlist is real input validation, not a
suggestion. Preserve that behaviour if it is rewritten.

## Before rewriting

Check whether an older Netlify deploy is still downloadable from the site's
deploy history. That would recover the originals exactly.
