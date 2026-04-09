;(function(global){
  function esc(s){
    if (global.AppUtilsEscape && typeof global.AppUtilsEscape.escapeHtml === 'function') {
      return global.AppUtilsEscape.escapeHtml(s);
    }
    var d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  function statusClass(status){
    return status === 'success' ? 'acceptance-status--success' : 'acceptance-status--failed';
  }

  function fmt(v, fallback){
    return v ? esc(v) : fallback;
  }

  function renderAcceptanceRunPanel(deps){
    var mount = document.getElementById('acceptance-run-panel-slot');
    if (!mount) return;
    var state = deps.getState();
    var run = state.lastRun || null;
    var running = !!state.running;
    mount.style.display = '';
    mount.innerHTML =
      '<div class="panel acceptance-panel">' +
      '<div class="acceptance-head">' +
      '<div class="acceptance-title-wrap"><div class="sec-title">Acceptance run tracking</div>' +
      '<div class="acceptance-sub">Track accepted connections from the connections page.</div></div>' +
      '<button type="button" class="btn acceptance-run-btn" id="acceptance-run-btn"' + (running ? ' disabled' : '') + '>' + (running ? 'Running…' : 'Run Acceptance Check') + '</button>' +
      '</div>' +
      '<div class="acceptance-summary">' +
      '<div class="acceptance-kv"><span>Last run time</span><strong>' + fmt(run && run.completed_at, '—') + '</strong></div>' +
      '<div class="acceptance-kv"><span>Status</span><strong class="' + statusClass(run && run.status || 'failed') + '">' + fmt(run && run.status, 'Not run') + '</strong></div>' +
      '<div class="acceptance-kv"><span>Accepted count</span><strong>' + fmt(run && String(run.accepted_count), '0') + '</strong></div>' +
      '<div class="acceptance-kv"><span>Reference node</span><strong class="mono">' + fmt(run && run.new_reference_node, '—') + '</strong></div>' +
      '</div>' +
      (run && run.status === 'failed' && run.error_message ? '<div class="acceptance-error">' + esc(run.error_message) + '</div>' : '') +
      '<div class="acceptance-list-title">Accepted profiles</div>' +
      '<div class="acceptance-list">' + (
        run && Array.isArray(run.accepted_profiles) && run.accepted_profiles.length
          ? run.accepted_profiles.map(function(p){
              return '<div class="acceptance-item"><div class="acceptance-item-name">' + esc(p.name || 'Unknown') + '</div>' +
                '<a href="https://' + esc(p.profile_url || '') + '" target="_blank" rel="noopener noreferrer">' + esc(p.profile_url || '—') + '</a>' +
                '<span>' + esc(p.accepted_at || '—') + '</span></div>';
            }).join('')
          : '<div class="acceptance-empty">No accepted profiles recorded yet.</div>'
      ) + '</div>' +
      '</div>';
  }

  global.AppAcceptanceRunPanel = {
    renderAcceptanceRunPanel: renderAcceptanceRunPanel
  };
})(window);
