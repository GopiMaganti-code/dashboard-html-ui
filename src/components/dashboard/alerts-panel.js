;(function(global){
  function esc(s){
    if (global.AppUtilsEscape && typeof global.AppUtilsEscape.escapeHtml === 'function') {
      return global.AppUtilsEscape.escapeHtml(s);
    }
    var d = document.createElement('div');
    d.textContent = String(s == null ? '' : s);
    return d.innerHTML;
  }

  function levelClass(level){
    if (level === 'error') return 'alert-item--error';
    if (level === 'warning') return 'alert-item--warning';
    if (level === 'alert') return 'alert-item--alert';
    return 'alert-item--info';
  }

  function renderAlertsPanel(mountId, alerts){
    var mount = document.getElementById(mountId || 'dashboard-alerts-panel');
    if (!mount) return;
    var list = Array.isArray(alerts) ? alerts : [];
    if (list.length === 0) {
      mount.innerHTML =
        '<div class="alerts-panel-head"><span class="alerts-panel-title">Alerts</span><span class="alerts-panel-count">0</span></div>' +
        '<div class="alerts-panel-empty">No active alerts.</div>';
      return;
    }
    mount.innerHTML =
      '<div class="alerts-panel-head"><span class="alerts-panel-title">Alerts</span><span class="alerts-panel-count">' + list.length + '</span></div>' +
      '<ul class="alerts-panel-list" role="list">' +
      list.map(function(a){
        var lvl = (a && a.level) || 'info';
        return '<li class="alert-item ' + levelClass(lvl) + '" role="listitem">' + esc(a && a.text) + '</li>';
      }).join('') +
      '</ul>';
  }

  global.AppAlertsPanel = {
    renderAlertsPanel: renderAlertsPanel
  };
})(window);
