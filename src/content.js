(function () {
  function isPwhlSearch() {
    const q = new URLSearchParams(location.search).get('q');
    return !!q && q.trim().toLowerCase() === 'pwhl';
  }

  function waitForElement(selector, timeout = 8000) {
    return new Promise((resolve, reject) => {
      const found = document.querySelector(selector);
      if (found) return resolve(found);
      const obs = new MutationObserver(() => {
        const el = document.querySelector(selector);
        if (el) { obs.disconnect(); resolve(el); }
      });
      obs.observe(document.documentElement, { childList: true, subtree: true });
      setTimeout(() => { obs.disconnect(); reject(new Error(`Timeout: ${selector}`)); }, timeout);
    });
  }

  async function init() {
    if (!isPwhlSearch()) return;

    let anchor;
    try {
      anchor = await waitForElement('#rso');
    } catch {
      return;
    }

    const panel = pwhlCreatePanel();
    anchor.parentNode.insertBefore(panel, anchor);

    let seasonId;
    try {
      const { games, seasonId: sid } = await pwhlGetGames();
      seasonId = sid;
      pwhlRenderGames(games, panel.querySelector('#pwhl-pane-games'));
    } catch (e) {
      panel.querySelector('#pwhl-pane-games').innerHTML = `<div class="pwhl-empty">Could not load games.</div>`;
    }

    if (!seasonId) return;

    // Load standings and players only when their tabs are first clicked
    let standingsLoaded = false;
    let playersLoaded = false;

    panel.querySelector('[data-tab="standings"]').addEventListener('click', async () => {
      if (standingsLoaded) return;
      standingsLoaded = true;
      try {
        const teams = await pwhlGetStandings(seasonId);
        pwhlRenderStandings(teams, panel.querySelector('#pwhl-pane-standings'));
      } catch {
        panel.querySelector('#pwhl-pane-standings').innerHTML = `<div class="pwhl-empty">Could not load standings.</div>`;
      }
    });

    panel.querySelector('[data-tab="players"]').addEventListener('click', async () => {
      if (playersLoaded) return;
      playersLoaded = true;
      try {
        const players = await pwhlGetPlayers(seasonId);
        pwhlRenderPlayers(players, panel.querySelector('#pwhl-pane-players'));
      } catch {
        panel.querySelector('#pwhl-pane-players').innerHTML = `<div class="pwhl-empty">Could not load players.</div>`;
      }
    });
  }

  // Google Search uses client-side navigation; re-run on URL changes
  let lastUrl = location.href;
  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      document.getElementById('pwhl-panel')?.remove();
      init();
    }
  }).observe(document.documentElement, { childList: true, subtree: true });

  init();
})();
