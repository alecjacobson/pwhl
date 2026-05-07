// Proxy fetches to bypass CORS on lscluster.hockeytech.com
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'PWHL_FETCH') return false;
  fetch(msg.url)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(data => sendResponse({ ok: true, data }))
    .catch(err => sendResponse({ ok: false, error: err.message }));
  return true; // keep message channel open for async response
});
