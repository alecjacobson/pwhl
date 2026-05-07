# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A Chrome extension (Manifest V3) that injects a PWHL sports panel into Google Search results when the user searches for "pwhl" — mirroring the NHL/NBA panels Google shows natively (three tabs: GAMES, STANDINGS, PLAYERS).

## Loading the extension

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this repo root

No build step — plain JS files are loaded directly.

## File structure

```
manifest.json          MV3 manifest
src/
  background.js        Service worker: proxies API fetches (bypasses CORS)
  api.js               PWHL API helpers (loaded as content script)
  panel.js             DOM rendering functions (loaded as content script)
  content.js           Entry point: detects search, injects panel
  panel.css            Panel styles
```

`api.js`, `panel.js`, and `content.js` are all declared as content scripts in order and share one execution context, so functions defined in `api.js` and `panel.js` are available in `content.js`.

## Architecture

- **Content script** (`content.js`) detects `?q=pwhl` (case-insensitive), waits for `#rso` (Google's organic results container), and inserts `#pwhl-panel` immediately before it.
- **API calls** go through the background service worker (`background.js`) to avoid CORS — the HockeyTech API returns no `Access-Control-Allow-Origin` header. The content script sends `{type: 'PWHL_FETCH', url}` messages; the background fetches and returns `{ok, data}`.
- **Lazy loading**: games are fetched on panel injection; standings and players are fetched only on first tab click.
- **SPA navigation**: a `MutationObserver` in `content.js` watches for URL changes (Google uses client-side nav) and re-runs the injection.

## PWHL Data API

Base: `https://lscluster.hockeytech.com/feed/index.php`  
Required params: `key=446521baf8c38984&client_code=pwhl`  
All responses are wrapped in `{ SiteKit: { ... } }`.

| Endpoint | Params | Returns |
|---|---|---|
| Scorebar | `feed=modulekit&view=scorebar&numberofdaysback=N&numberofdaysahead=N` | `SiteKit.Scorebar[]` — recent/upcoming games; `SiteKit.Parameters.season_id` gives the current season |
| Standings | `feed=modulekit&view=statviewtype&stat=conference&type=standings&season_id=N` | `SiteKit.Statviewtype[]` — team rows (filter by `t.team_id` to skip headers) |
| Top scorers | `feed=modulekit&view=statviewtype&type=topscorers&first=0&limit=10&season_id=N` | `SiteKit.Statviewtype[]` — player rows (filter by `p.player_id`) |

Current season is **9** (2025-26 playoffs). The `season_id` is auto-detected from the scorebar response (`Parameters.season_id`). For standings, if the current season has < 10 games played per team (i.e. we're in playoffs), `pwhlGetStandings` automatically falls back to `seasonId - 1` to show the completed regular-season standings.

Team logos: `https://assets.leaguestat.com/pwhl/logos/50x50/{team_id}.png`  
The scorebar response includes `HomeLogo` and `VisitorLogo` URLs directly.

### Game status codes

| `GameStatus` | Meaning |
|---|---|
| `"1"` | Scheduled (show time, no score) |
| `"2"` | In progress |
| `"3"` | End of period / intermission |
| `"4"` | Final |

## Google Search panel reference

The native NHL/NBA panels use class `liveresults-sports-immersive__match-grid` and `jscontroller="AIWNmf"`. Our panel intentionally does not reuse those classes — it's a self-contained `#pwhl-panel` div with `pwhl-` prefixed classes to avoid collisions with Google's styles.

Injection target: `#rso` (Google's organic results container). The panel is inserted as the previous sibling of `#rso`.
