# Recovery notes — 21 August 2026

**Resolved.** This project is complete and under version control.

## What happened

The copy under `Projects/` was incomplete — it held only config files, with no
`public/` and no function sources — and the project had no GitHub repo. The
front end was first reconstructed from the deployed site, and the three
serverless functions were believed unrecoverable, since Netlify does not expose
deployed function source.

That was wrong. A complete working copy existed at
`C:\Users\GeneR\Documents\AI_Projects\marta-p7`, a directory outside both the
`Projects` tree and the OneDrive backup trees. It was found by widening the
search after Gene pointed out the backups.

## Verified against production

| File | Check |
|------|-------|
| `public/index.html` | byte-identical to the live site |
| `public/app.js` | byte-identical |
| `public/styles.css` | byte-identical |
| `netlify.toml` | identical |
| `netlify/functions/gtfs-static.js` | its `bad_file` response matches the live endpoint's observed behaviour exactly |

Nothing was reconstructed or guessed. This is the source that produced the
running deployment.

## Also recovered from that copy

`CLAUDE.md`, `scripts/smoke-test.js`, and `package-lock.json` — none of which
existed in the `Projects` copy.

## Lesson

Three separate locations held pieces of this project and none held all of it:
`Projects/`, the home directory, and `Documents/AI_Projects/`. The search that
found it only ran because the backups were mentioned. When a project looks
incomplete, search the whole user profile before concluding anything is lost.
