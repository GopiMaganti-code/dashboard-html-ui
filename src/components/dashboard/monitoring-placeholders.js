;(function(global){
  /**
   * Phase 3 — design placeholders only (session, fingerprint, risk, alerting).
   */
  function renderMonitoringPlaceholders(mountId){
    var mount = document.getElementById(mountId || 'monitoring-advanced-slot');
    if (!mount) return;
    mount.innerHTML =
      '<div class="monitoring-advanced-grid">' +
        '<div class="monitoring-card monitoring-card--placeholder">' +
          '<div class="monitoring-card-title">Session tracking</div>' +
          '<p class="monitoring-card-note">Reserved for backend integration.</p>' +
          '<dl class="monitoring-dl">' +
            '<dt>Session IP</dt><dd><span class="placeholder-pill">— pending —</span></dd>' +
            '<dt>Location</dt><dd><span class="placeholder-pill">— pending —</span></dd>' +
            '<dt>Session age</dt><dd><span class="placeholder-pill">— pending —</span></dd>' +
          '</dl>' +
        '</div>' +
        '<div class="monitoring-card monitoring-card--placeholder">' +
          '<div class="monitoring-card-title">Fingerprint</div>' +
          '<p class="monitoring-card-note">Reserved for automation worker telemetry.</p>' +
          '<dl class="monitoring-dl">' +
            '<dt>User agent</dt><dd><span class="placeholder-pill">— pending —</span></dd>' +
            '<dt>Device info</dt><dd><span class="placeholder-pill">— pending —</span></dd>' +
            '<dt>Fingerprint hash</dt><dd><span class="placeholder-pill mono">— pending —</span></dd>' +
          '</dl>' +
        '</div>' +
        '<div class="monitoring-card monitoring-card--placeholder">' +
          '<div class="monitoring-card-title">Risk engine</div>' +
          '<p class="monitoring-card-note">Scoring model not deployed.</p>' +
          '<div class="risk-score-placeholder"><span class="risk-label">Risk score</span><span class="risk-badge risk-badge--low">Low</span></div>' +
        '</div>' +
        '<div class="monitoring-card monitoring-card--placeholder">' +
          '<div class="monitoring-card-title">Alerting</div>' +
          '<p class="monitoring-card-note">External notification channels (email, Slack) — planned.</p>' +
          '<ul class="severity-legend">' +
            '<li><span class="sev-dot sev-dot--critical"></span> Critical</li>' +
            '<li><span class="sev-dot sev-dot--warning"></span> Warning</li>' +
            '<li><span class="sev-dot sev-dot--info"></span> Info</li>' +
          '</ul>' +
        '</div>' +
      '</div>';
  }

  global.AppMonitoringPlaceholders = {
    renderMonitoringPlaceholders: renderMonitoringPlaceholders
  };
})(window);
