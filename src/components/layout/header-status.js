;(function(global){
  function renderHeaderStatus(state, envBadgeClassMap){
    document.querySelectorAll('.header-env-badge').forEach(function(el){
      el.textContent = state.environment ? ('ENV: ' + state.environment) : 'ENV: —';
      var cls = envBadgeClassMap[state.environment] || 'env-badge--none';
      el.className = 'header-env-badge ' + cls;
    });

    var stopped = state.campaignStatus === 'Stopped';
    var active = state.campaignStatus === 'Active';
    var dashBadge = document.getElementById('dashboard-status-badge');
    if (dashBadge){
      if (stopped) {
        dashBadge.className = 'badge badge--stopped';
        dashBadge.innerHTML = '<span class="badge-dot badge-dot--stopped"></span>Stopped';
      } else if (active) {
        dashBadge.className = 'badge';
        dashBadge.innerHTML = '<span class="badge-dot"></span>Active';
      } else {
        dashBadge.className = 'badge badge--inactive';
        dashBadge.innerHTML = '<span class="badge-dot badge-dot--inactive"></span>Inactive';
      }
    }
  }

  global.AppHeaderStatus = {
    renderHeaderStatus: renderHeaderStatus
  };
})(window);
