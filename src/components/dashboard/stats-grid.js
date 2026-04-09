;(function(global){
  function bindStatsGridInteractions(deps){
    var root = document.getElementById('screen-dashboard');
    if (!root || root.getAttribute('data-stats-bound') === '1') return;
    root.setAttribute('data-stats-bound', '1');

    root.querySelectorAll('.stat-card').forEach(function(card){
      var onclickAttr = card.getAttribute('onclick') || '';
      var match = onclickAttr.match(/showDetail\('([^']+)'\)/);
      if (!match) return;
      var key = match[1];

      card.removeAttribute('onclick');
      card.removeAttribute('onkeydown');

      card.addEventListener('click', function(){
        deps.showDetail(key);
      });
      card.addEventListener('keydown', function(event){
        if (event.key === 'Enter') deps.showDetail(key);
      });
    });
  }

  global.AppDashboardStatsGrid = {
    bindStatsGridInteractions: bindStatsGridInteractions
  };
})(window);
