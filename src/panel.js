function pwhlCreatePanel() {
  const el = document.createElement('div');
  el.id = 'pwhl-panel';
  el.innerHTML = `
    <div class="pwhl-header">
      <div class="pwhl-header-logo">PWHL</div>
      <div class="pwhl-header-text">
        <span class="pwhl-header-abbr">PWHL</span>
        <span class="pwhl-header-full">Professional Women's Hockey League</span>
      </div>
    </div>
    <div class="pwhl-tabs" role="tablist">
      <button class="pwhl-tab pwhl-tab--active" data-tab="games" role="tab" aria-selected="true">GAMES</button>
      <button class="pwhl-tab" data-tab="standings" role="tab" aria-selected="false">STANDINGS</button>
      <button class="pwhl-tab" data-tab="players" role="tab" aria-selected="false">PLAYERS</button>
    </div>
    <div class="pwhl-body">
      <div class="pwhl-pane" id="pwhl-pane-games"><div class="pwhl-loading">Loading…</div></div>
      <div class="pwhl-pane pwhl-pane--hidden" id="pwhl-pane-standings"><div class="pwhl-loading">Loading…</div></div>
      <div class="pwhl-pane pwhl-pane--hidden" id="pwhl-pane-players"><div class="pwhl-loading">Loading…</div></div>
    </div>
  `;

  el.querySelectorAll('.pwhl-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.pwhl-tab').forEach(t => {
        t.classList.remove('pwhl-tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('pwhl-tab--active');
      tab.setAttribute('aria-selected', 'true');
      el.querySelectorAll('.pwhl-pane').forEach(p => p.classList.add('pwhl-pane--hidden'));
      el.querySelector(`#pwhl-pane-${tab.dataset.tab}`).classList.remove('pwhl-pane--hidden');
    });
  });

  return el;
}

function pwhlRelativeDate(iso) {
  const game = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((new Date(game.getFullYear(), game.getMonth(), game.getDate()) - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return game.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const WINNER_SVG = `<svg class="pwhl-winner-svg" aria-label="Winner" height="8" width="6" viewBox="0 0 6 8"><polygon fill="currentColor" points="6,0 6,8 0,4"/></svg>`;

function pwhlSeriesContext(g) {
  const hw = parseInt(g.HomeWins, 10);
  const vw = parseInt(g.VisitorWins, 10);
  if (hw === vw) return `Series tied ${hw}-${vw}`;
  if (hw > vw) return `${g.HomeCode} leads ${hw}-${vw}`;
  return `${g.VisitorCode} leads ${vw}-${hw}`;
}

function pwhlRenderGames(games, container) {
  if (!games.length) {
    container.innerHTML = '<div class="pwhl-empty">No games in this window.</div>';
    return;
  }

  const tileHtml = games.map(g => {
    const scheduled = g.GameStatus === '1';
    const live = g.GameStatus === '2' || (g.GameStatus === '3' && g.Intermission !== '0');
    const final = !scheduled && !live;
    const playoff = g.game_letter !== '';

    const homeGoals = parseInt(g.HomeGoals, 10);
    const visGoals = parseInt(g.VisitorGoals, 10);
    const homeWon = final && homeGoals > visGoals;
    const visWon = final && visGoals > homeGoals;

    const statusLine = scheduled
      ? g.ScheduledFormattedTime
      : live
      ? `${g.PeriodNameShort} ${g.GameClock}`
      : g.GameStatusString;

    // For playoff games show the current series standing; omit for regular season.
    // HomeWins/VisitorWins always reflect the live series state so all tiles for
    // a given series share the same label, which matches Google's NHL panel behaviour.
    const contextLine = playoff ? pwhlSeriesContext(g) : '';

    return `
      <div class="pwhl-game-tile" data-status="${g.GameStatus}">
        ${contextLine ? `<div class="pwhl-game-context">${contextLine}</div>` : ''}
        <table class="pwhl-game-table">
          <tbody>
            <tr class="pwhl-team-row${visWon ? ' pwhl-team-winner' : ''}">
              <td class="pwhl-logo-cell"><img src="${g.VisitorLogo}" alt="${g.VisitorCode}" class="pwhl-team-img" /></td>
              <td class="pwhl-name-cell">${g.VisitorCode}</td>
              <td class="pwhl-status-cell" rowspan="2">
                <div class="pwhl-game-status">${statusLine}</div>
                <div class="pwhl-game-date">${pwhlRelativeDate(g.GameDateISO8601)}</div>
              </td>
              <td class="pwhl-score-cell">${scheduled ? '' : g.VisitorGoals}</td>
              <td class="pwhl-arrow-cell">${visWon ? WINNER_SVG : ''}</td>
            </tr>
            <tr class="pwhl-team-row${homeWon ? ' pwhl-team-winner' : ''}">
              <td class="pwhl-logo-cell"><img src="${g.HomeLogo}" alt="${g.HomeCode}" class="pwhl-team-img" /></td>
              <td class="pwhl-name-cell">${g.HomeCode}</td>
              <td class="pwhl-score-cell">${scheduled ? '' : g.HomeGoals}</td>
              <td class="pwhl-arrow-cell">${homeWon ? WINNER_SVG : ''}</td>
            </tr>
          </tbody>
        </table>
      </div>`;
  }).join('');

  container.innerHTML = `<div class="pwhl-games-row">${tileHtml}</div>`;

  // Scroll so the last completed game and first upcoming game are both visible.
  requestAnimationFrame(() => {
    const row = container.querySelector('.pwhl-games-row');
    const tiles = Array.from(row.querySelectorAll('.pwhl-game-tile'));
    const firstUpcoming = tiles.findIndex(t => t.dataset.status === '1');
    if (firstUpcoming > 1) {
      // Scroll to put the last completed game at the left edge.
      const tileW = tiles[0].offsetWidth + 10; // tile width + gap
      row.scrollLeft = (firstUpcoming - 1) * tileW;
    } else if (firstUpcoming === -1) {
      // All completed — show the most recent (last) tile.
      row.scrollLeft = row.scrollWidth;
    }
    // firstUpcoming === 0 or 1: no scroll needed, already visible.
  });
}

function pwhlRenderStandings(teams, container) {
  if (!teams.length) {
    container.innerHTML = '<div class="pwhl-empty">No standings data.</div>';
    return;
  }

  let anyPlayoffClinch = false;
  let anyDivClinch = false;

  const rows = teams.map(t => {
    const playoffClinch = t.clinched_playoff_spot === '1' || t.clinched_playoff_spot === 1;
    const divClinch = t.clinched_group_title === '1' || t.clinched_group_title === 1;
    if (playoffClinch) anyPlayoffClinch = true;
    if (divClinch) anyDivClinch = true;

    const clinchMark = divClinch ? '<span class="pwhl-clinch pwhl-clinch-y" title="Clinched division">y</span>'
      : playoffClinch ? '<span class="pwhl-clinch pwhl-clinch-x" title="Clinched playoff spot">x</span>'
      : '';

    return `
      <tr>
        <td class="pwhl-st-rank">${t.rank}</td>
        <td class="pwhl-st-clinch">${clinchMark}</td>
        <td class="pwhl-st-team">
          <img src="https://assets.leaguestat.com/pwhl/logos/50x50/${t.team_id}.png" alt="${t.team_code}" class="pwhl-team-img-sm" />
          ${t.city}
        </td>
        <td>${t.games_played}</td>
        <td>${t.wins}</td>
        <td>${t.losses}</td>
        <td>${t.ot_losses}</td>
        <td class="pwhl-bold">${t.points}</td>
      </tr>`;
  }).join('');

  const legends = [];
  if (anyDivClinch) legends.push('<span class="pwhl-clinch pwhl-clinch-y">y</span> - Clinched division');
  if (anyPlayoffClinch) legends.push('<span class="pwhl-clinch pwhl-clinch-x">x</span> - Clinched playoff spot');
  const legend = legends.length
    ? `<div class="pwhl-st-legend">${legends.join(' &nbsp; ')}</div>` : '';

  container.innerHTML = `
    <table class="pwhl-data-table">
      <thead>
        <tr>
          <th></th>
          <th></th>
          <th class="pwhl-left-hdr">Team</th>
          <th title="Games Played">GP</th>
          <th title="Wins (3 pts for regulation, 2 for OT/SO)">W</th>
          <th title="Regulation Losses">L</th>
          <th title="Overtime / Shootout Losses (1 pt)">OTL</th>
          <th title="Points (3-2-1-0)" class="pwhl-bold">PTS</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${legend}`;
}

function pwhlRenderPlayers(players, container) {
  if (!players.length) {
    container.innerHTML = '<div class="pwhl-empty">No player data.</div>';
    return;
  }
  const rows = players.map((p, i) => `
    <tr>
      <td class="pwhl-st-rank">${i + 1}</td>
      <td class="pwhl-pl-name">${p.first_name} ${p.last_name}</td>
      <td>${p.team_code}</td>
      <td>${p.games_played}</td>
      <td>${p.goals}</td>
      <td>${p.assists}</td>
      <td class="pwhl-bold">${p.points}</td>
    </tr>`).join('');

  container.innerHTML = `
    <table class="pwhl-data-table">
      <thead>
        <tr>
          <th></th>
          <th class="pwhl-left-hdr">Player</th>
          <th>Team</th>
          <th title="Games Played">GP</th>
          <th title="Goals">G</th>
          <th title="Assists">A</th>
          <th title="Points" class="pwhl-bold">PTS</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}
