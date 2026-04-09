;(function(global){
  function renderFailedActionsPanel(deps){
    var mount = document.getElementById('failed-actions-list');
    if (!mount) return;
    var eye = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    var docIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>';
    mount.innerHTML = deps.failedActions.map(function(item, i){
      var hasShot = !!(item.screenshot_url && String(item.screenshot_url).trim());
      var shotTitle = hasShot ? 'View screenshot captured at failure' : 'No screenshot available';
      var logsOk = deps.failedActionLogsAvailable(item);
      var logsTitle = logsOk ? 'Open execution logs in a modal' : 'No logs available';
      return '<div class="failed-item">' +
        '<div class="failed-item-main">' +
        '<div class="failed-lead">' + deps.escapeHtml(item.lead) + '</div>' +
        '<div class="failed-reason">' + deps.escapeHtml(item.reason) + '</div>' +
        '<div class="failed-time">' + deps.escapeHtml(item.timestamp) + '</div></div>' +
        '<div class="failed-item-actions">' +
        '<span class="pill pill-fail">failed</span>' +
        '<div class="failed-item-buttons">' +
        '<button type="button" class="btn-shot-ghost" data-shot-idx="' + i + '"' + (hasShot ? '' : ' disabled') + ' title="' + deps.escapeHtml(shotTitle) + '">' +
        eye + ' View Screenshot</button>' +
        '<button type="button" class="btn-shot-ghost" data-logs-idx="' + i + '"' + (logsOk ? '' : ' disabled') + ' title="' + deps.escapeHtml(logsTitle) + '">' +
        docIcon + ' View Logs</button>' +
        '</div></div></div>';
    }).join('');

    mount.querySelectorAll('.btn-shot-ghost[data-shot-idx]:not([disabled])').forEach(function(btn){
      btn.addEventListener('click', function(){
        deps.openShotModal(parseInt(btn.getAttribute('data-shot-idx'), 10));
      });
    });
    mount.querySelectorAll('.btn-shot-ghost[data-logs-idx]:not([disabled])').forEach(function(btn){
      btn.addEventListener('click', function(){
        deps.openLogsModal(parseInt(btn.getAttribute('data-logs-idx'), 10));
      });
    });
  }

  global.AppFailedActionsPanel = {
    renderFailedActionsPanel: renderFailedActionsPanel
  };
})(window);
