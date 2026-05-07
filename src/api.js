const PWHL_BASE = 'https://lscluster.hockeytech.com/feed/index.php';
const PWHL_PARAMS = { key: '446521baf8c38984', client_code: 'pwhl' };

function pwhlUrl(extra) {
  return `${PWHL_BASE}?${new URLSearchParams({ ...PWHL_PARAMS, ...extra })}`;
}

function pwhlFetch(extra) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'PWHL_FETCH', url: pwhlUrl(extra) },
      resp => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        if (!resp.ok) return reject(new Error(resp.error));
        resolve(resp.data.SiteKit);
      }
    );
  });
}

// Returns { games: [], seasonId: string }
async function pwhlGetGames() {
  const kit = await pwhlFetch({
    feed: 'modulekit',
    view: 'scorebar',
    numberofdaysback: '5',
    numberofdaysahead: '5',
  });
  return { games: kit.Scorebar || [], seasonId: String(kit.Parameters?.season_id ?? '') };
}

async function pwhlFetchStandingsForSeason(seasonId) {
  const kit = await pwhlFetch({
    feed: 'modulekit',
    view: 'statviewtype',
    stat: 'conference',
    type: 'standings',
    season_id: seasonId,
  });
  return (kit.Statviewtype || []).filter(t => t.team_id);
}

// If the current season is a short playoff run (< 10 GP), fall back to the
// previous season which has the full regular-season standings.
async function pwhlGetStandings(seasonId) {
  const teams = await pwhlFetchStandingsForSeason(seasonId);
  const isPlayoffOnly = teams.length > 0 && parseInt(teams[0].games_played, 10) < 10;
  if (isPlayoffOnly) {
    const prev = await pwhlFetchStandingsForSeason(parseInt(seasonId, 10) - 1);
    if (prev.length > 0) return prev;
  }
  return teams;
}

async function pwhlGetPlayers(seasonId) {
  const kit = await pwhlFetch({
    feed: 'modulekit',
    view: 'statviewtype',
    type: 'topscorers',
    first: '0',
    limit: '10',
    season_id: seasonId,
  });
  return (kit.Statviewtype || []).filter(p => p.player_id);
}
