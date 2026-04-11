;(function(global){
  function esc(s){
    if (global.AppUtilsEscape && typeof global.AppUtilsEscape.escapeHtml === 'function') {
      return global.AppUtilsEscape.escapeHtml(s);
    }
    var d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  function badge(status, running){
    if (running) return '<span class="run-badge run-badge--running">⏳ running</span>';
    if (status === 'success') return '<span class="run-badge run-badge--success">✅ success</span>';
    if (status === 'failed') return '<span class="run-badge run-badge--failed">❌ failed</span>';
    return '<span class="run-badge">—</span>';
  }

  function formatRunTs(raw){
    if (!raw) return '—';
    if (global.AppUtilsFormatters && typeof global.AppUtilsFormatters.normalizeTimestampToIso === 'function') {
      var iso = global.AppUtilsFormatters.normalizeTimestampToIso(raw);
      if (iso && global.AppUtilsFormatters.formatIsoForDisplay) {
        return global.AppUtilsFormatters.formatIsoForDisplay(iso);
      }
    }
    return String(raw);
  }

  function kv(label, value, mono){
    return '<div class="run-kv"><span>' + esc(label) + '</span><strong' + (mono ? ' class="mono"' : '') + '>' + esc(value || '—') + '</strong></div>';
  }

  function renderRunTrackingPanels(deps){
    var recentMount = document.getElementById('recent-runs-summary-slot');
    var acceptanceMount = document.getElementById('acceptance-runs-slot');
    var messagesMount = document.getElementById('messages-runs-slot');
    if (!recentMount || !acceptanceMount || !messagesMount) return;

    var recentRows = deps.getRecentRows();
    var acceptanceRun = deps.getAcceptanceRun();
    var messagesRun = deps.getMessagesRun();
    var acceptanceRunning = deps.isAcceptanceRunning();
    var messagesRunning = deps.isMessagesRunning();

    recentMount.innerHTML =
      '<div class="run-section-head"><div class="sec-title">Recent runs</div></div>' +
      '<div class="table-wrap"><table class="run-table"><thead><tr><th style="width:42%">Lead</th><th style="width:26%">Action</th><th style="width:16%">Status</th><th style="width:16%">Time</th></tr></thead>' +
      '<tbody>' + recentRows.map(function(r){
        return '<tr><td>' + esc(r.name || '—') + '</td><td>' + esc(r.action || '—') + '</td><td>' + deps.statusPill(r.status || '') + '</td><td>' + esc(r.time || '—') + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    acceptanceMount.innerHTML =
      '<div class="run-section-head"><div class="sec-title">Acceptance runs</div>' +
      '<button type="button" class="btn run-action-btn" id="dashboard-acceptance-run-btn"' + (acceptanceRunning ? ' disabled' : '') + '>' + (acceptanceRunning ? 'Running…' : 'Run Acceptance Check') + '</button></div>' +
      '<div class="run-summary-grid">' +
      kv('Status', '', false).replace('</strong>', badge(acceptanceRun && acceptanceRun.status, acceptanceRunning) + '</strong>') +
      kv('Last run', acceptanceRun ? formatRunTs(acceptanceRun.completed_at || acceptanceRun.started_at) : '—') +
      kv('Accepted count', acceptanceRun && String(acceptanceRun.accepted_count) || '0') +
      kv('Reference node', acceptanceRun && acceptanceRun.new_reference_node || '—', true) +
      '</div>';

    messagesMount.innerHTML =
      '<div class="run-section-head"><div class="sec-title">Messages runs</div>' +
      '<button type="button" class="btn run-action-btn" id="dashboard-messages-run-btn"' + (messagesRunning ? ' disabled' : '') + '>' + (messagesRunning ? 'Running…' : 'Run Messages Check') + '</button></div>' +
      '<div class="run-summary-grid">' +
      kv('Status', '', false).replace('</strong>', badge(messagesRun && messagesRun.status, messagesRunning) + '</strong>') +
      kv('Last run', messagesRun ? formatRunTs(messagesRun.completed_at || messagesRun.started_at) : '—') +
      kv('Leads processed', messagesRun && String(messagesRun.leads_processed) || '0') +
      kv('Replies detected', messagesRun && String(messagesRun.replies_detected) || '0') +
      kv('Failed count', messagesRun && String(messagesRun.failed_count) || '0') +
      '</div>' +
      '<div class="run-replies-title">Replies preview</div>' +
      '<div class="run-replies-list">' + (
        messagesRun && Array.isArray(messagesRun.replies) && messagesRun.replies.length
          ? messagesRun.replies.slice(0, 5).map(function(r){
              return '<div class="run-reply-item"><div class="run-reply-name">' + esc(r.name || 'Unknown') + '</div><div class="run-reply-msg">' + esc(r.last_reply_message || 'Reply detected') + '</div></div>';
            }).join('')
          : '<div class="run-replies-empty">No replies captured for the last run.</div>'
      ) + '</div>';
  }

  global.AppRunTrackingPanel = {
    renderRunTrackingPanels: renderRunTrackingPanels
  };
})(window);
