;(function(global){
  function esc(deps, s){
    if (deps && deps.escapeHtml) return deps.escapeHtml(s == null ? '' : String(s));
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function disp(v){
    if (v == null || v === '') return '—';
    return String(v);
  }

  function formatSessionTimestamp(raw){
    if (raw == null || raw === '') return '—';
    var s = String(raw);
    if (global.AppUtilsFormatters && typeof global.AppUtilsFormatters.formatIsoForDisplay === 'function' && /^\d{4}-\d{2}-\d{2}T/.test(s)) {
      return global.AppUtilsFormatters.formatIsoForDisplay(s);
    }
    return s;
  }

  function useApiOn(){
    try {
      return global.AppConfig && global.AppConfig.useApi === true;
    } catch (e) {
      return false;
    }
  }

  /**
   * @param {string} mountId
   * @param {object|null} rawApi — null = not loaded or API off
   * @param {{ escapeHtml?: function, loaded?: boolean }} deps — loaded true when request finished (even if empty)
   */
  function renderSessionNetworkPanel(mountId, rawApi, deps){
    var mount = document.getElementById(mountId || 'session-network-panel');
    if (!mount) return;

    var apiOn = useApiOn();
    var loaded = !!(deps && deps.loaded);

    if (!apiOn) {
      mount.innerHTML =
        '<div class="session-network-card">' +
        '<div class="session-network-head"><span class="session-network-title">Session &amp; Network</span></div>' +
        '<p class="session-network-placeholder">IP monitoring not enabled.</p>' +
        '<p class="session-network-placeholder session-network-placeholder--sub">Enable API integration (<code class="session-network-code">useApi</code>) to load session and network data from the backend.</p>' +
        '</div>';
      return;
    }

    if (!loaded) {
      mount.innerHTML =
        '<div class="session-network-card">' +
        '<div class="session-network-head"><span class="session-network-title">Session &amp; Network</span></div>' +
        '<p class="session-network-placeholder">Loading session data…</p>' +
        '</div>';
      return;
    }

    if (rawApi == null) {
      mount.innerHTML =
        '<div class="session-network-card">' +
        '<div class="session-network-head"><span class="session-network-title">Session &amp; Network</span></div>' +
        '<p class="session-network-placeholder">Session data unavailable. Check backend <code class="session-network-code">GET /api/v1/session-info</code> and network.</p>' +
        '</div>';
      return;
    }

    var svc = global.AppSessionNetworkService;
    if (!svc || typeof svc.normalizeSessionInfo !== 'function') return;

    var n = svc.normalizeSessionInfo(rawApi);
    if (!n) {
      mount.innerHTML =
        '<div class="session-network-card">' +
        '<div class="session-network-head"><span class="session-network-title">Session &amp; Network</span></div>' +
        '<p class="session-network-placeholder">No session fields returned. Backend should populate <code class="session-network-code">GET /api/v1/session-info</code>.</p>' +
        '</div>';
      return;
    }

    if (typeof svc.hasSessionTelemetry === 'function' && !svc.hasSessionTelemetry(n)) {
      mount.innerHTML =
        '<div class="session-network-card">' +
        '<div class="session-network-head"><span class="session-network-title">Session &amp; Network</span></div>' +
        '<p class="session-network-placeholder">IP monitoring not enabled — no telemetry in the latest <code class="session-network-code">session-info</code> response. Backend should populate connection IP, session IP, geo, ISP type, and history.</p>' +
        '</div>';
      return;
    }

    var risks = typeof svc.evaluateSessionRisks === 'function' ? svc.evaluateSessionRisks(n) : { level: 'none', badges: [] };
    var isp = typeof svc.ispLabel === 'function' ? svc.ispLabel(n.ispType) : n.ispType;

    var badgesHtml = (risks.badges || []).map(function(b){
      return '<span class="session-risk-badge ' + esc(deps, b.cls) + '">' + esc(deps, b.text) + '</span>';
    }).join('');

    var ipChangeRow = '';
    if (n.ipChanged) {
      var prev = disp(n.previousIp);
      var cur = disp(n.currentIp);
      ipChangeRow =
        '<div class="session-ip-change session-ip-change--yes">' +
        '<span class="sn-label">IP changed</span> ' +
        '<span class="sn-val sn-val--danger">' + esc(deps, prev) + ' → ' + esc(deps, cur) + '</span>' +
        '</div>';
    } else {
      ipChangeRow = '<div class="session-ip-change"><span class="sn-label">IP changed</span> <span class="sn-val">No</span></div>';
    }

    var rows = (n.ipHistory && n.ipHistory.length) ? n.ipHistory : [];
    var tableBody = rows.map(function(row){
      var loc = [row.city, row.country].filter(Boolean).join(', ') || '—';
      var ispR = typeof svc.ispLabel === 'function' ? svc.ispLabel(row.isp_type) : disp(row.isp_type);
      return '<tr>' +
        '<td>' + esc(deps, formatSessionTimestamp(row.at)) + '</td>' +
        '<td>' + esc(deps, disp(row.ip)) + '</td>' +
        '<td>' + esc(deps, loc) + '</td>' +
        '<td>' + esc(deps, ispR) + '</td>' +
        '</tr>';
    }).join('');

    if (!tableBody) {
      tableBody = '<tr><td colspan="4" class="session-history-empty">No IP history yet</td></tr>';
    }

    mount.innerHTML =
      '<div class="session-network-card">' +
      '<div class="session-network-head">' +
      '<span class="session-network-title">Session &amp; Network</span>' +
      (badgesHtml ? '<div class="session-risk-row">' + badgesHtml + '</div>' : '') +
      '</div>' +
      '<div class="session-network-grid">' +
      '<div class="session-network-col">' +
      '<div class="session-network-subtitle">Current session</div>' +
      '<dl class="session-dl">' +
      '<dt>Current IP</dt><dd>' + esc(deps, disp(n.currentIp)) + '</dd>' +
      '<dt>Location</dt><dd>' + esc(deps, [n.location.city, n.location.country].filter(Boolean).join(', ') || '—') + '</dd>' +
      '<dt>ISP / ASN type</dt><dd class="' + (n.ispType === 'datacenter' || n.ispType === 'hosting' ? 'sn-dd--risk' : '') + '">' + esc(deps, isp) + '</dd>' +
      '</dl></div>' +
      '<div class="session-network-col">' +
      '<div class="session-network-subtitle">Connection info</div>' +
      '<dl class="session-dl">' +
      '<dt>Connection IP</dt><dd>' + esc(deps, disp(n.connectionIp)) + '</dd>' +
      '<dt>First connection</dt><dd>' + esc(deps, formatSessionTimestamp(n.connectionAt)) + '</dd>' +
      '</dl></div>' +
      '<div class="session-network-col session-network-col--full">' +
      '<div class="session-network-subtitle">IP change status</div>' +
      ipChangeRow +
      (n.countryChanged ? '<div class="session-country-alert">Country changed vs connection — review account security.</div>' : '') +
      '</div></div>' +
      '<div class="session-history-wrap">' +
      '<div class="session-network-subtitle">IP history (last 10 sessions)</div>' +
      '<div class="session-history-scroll">' +
      '<table class="session-history-table" role="grid">' +
      '<thead><tr><th>Timestamp</th><th>IP address</th><th>Location</th><th>ISP type</th></tr></thead>' +
      '<tbody>' + tableBody + '</tbody>' +
      '</table></div></div>' +
      '</div>';
  }

  global.AppSessionNetworkPanel = {
    renderSessionNetworkPanel: renderSessionNetworkPanel
  };
})(window);
