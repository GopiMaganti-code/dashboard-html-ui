;(function(global){
  function bindStatsInteractions(deps){
    if (global.AppDashboardStatsGrid && typeof global.AppDashboardStatsGrid.bindStatsGridInteractions === 'function') {
      global.AppDashboardStatsGrid.bindStatsGridInteractions({
        showDetail: deps.showDetail
      });
    }
  }

  global.AppDashboardController = {
    bindStatsInteractions: bindStatsInteractions
  };
})(window);
