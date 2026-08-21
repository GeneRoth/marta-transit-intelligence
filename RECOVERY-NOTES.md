# Recovery notes — 21 August 2026

This project had **no complete copy on disk and no GitHub repo**. The only
surviving copy of the front end was the deployed site itself.

## Recovered from https://marta-p7.netlify.app

| File | Source |
|------|--------|
| `public/index.html` | fetched from the live site |
| `public/app.js` | fetched from the live site |
| `public/styles.css` | fetched from the live site |

These are the deployed build output. For a static front end that is the same
thing as the source, so nothing is lost here.

## NOT recovered — still missing

`netlify.toml` declares three serverless functions whose source exists only
inside Netlify's build:

| Function | Purpose (inferred) | Timeout |
|----------|--------------------|---------|
| `bus-feed` | MARTA realtime bus positions | 20s |
| `rail-feed` | MARTA realtime rail, needs `MARTA_RAIL_KEY` | 15s |
| `gtfs-static` | Serves static GTFS files from an allowlist | 26s |

Netlify does not expose deployed function source, so these must be either
rewritten or retrieved from a Netlify deploy artifact if one is still
downloadable.

Observed behaviour of `gtfs-static`, which is a good starting point if it is
rewritten: it takes a `?file=` parameter, validates it against the allowlist
`routes.txt, shapes.txt, trips.txt, stops.txt, agency.txt, calendar.txt`, and
returns `{"error":"bad_file","allowed":[...]}` with HTTP 400 for anything else.
It is well built and should be preserved as-is if it can be retrieved.

## Also note

`MARTA_RAIL_KEY` is a third API credential in the portfolio, alongside
`ANTHROPIC_API_KEY` and `GOOGLE_TTS_API_KEY`. It is set in Netlify env vars.

## Recommended next step

Put this project under git and push it to GitHub so this cannot happen again.
It is currently the only portfolio project with no repository.
