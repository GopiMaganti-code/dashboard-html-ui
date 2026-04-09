;(function(global){
  function getLogger(){
    if (global.AppLogger && typeof global.AppLogger.debug === 'function') return global.AppLogger;
    return { debug: function(){} };
  }

  function initChart(deps){
    var logger = getLogger();
    var canvas = document.getElementById('activityChart');
    if (!canvas || typeof deps.ChartCtor === 'undefined' || deps.getChartInstance()) {
      logger.debug('CHART_INIT_SKIP', {
        hasCanvas: !!canvas,
        hasCtor: typeof deps.ChartCtor !== 'undefined',
        hasInstance: !!deps.getChartInstance()
      });
      return;
    }
    var ctx = canvas.getContext('2d');
    var overviewPayload = deps.getOverviewChartPayload ? deps.getOverviewChartPayload() : null;
    var labels = (overviewPayload && Array.isArray(overviewPayload.labels))
      ? overviewPayload.labels.slice()
      : ['Apr 1','Apr 2','Apr 3','Apr 4','Apr 5','Apr 6'];
    var C = {
      connections:'#5BB89A',
      profile:'#7B6FD6',
      posts:'#E89B2C',
      messages:'#D65A7A',
      accepted:'#8BC34A'
    };
    function topDatasetIndex(chart, dataIndex){
      var ds = chart.data.datasets;
      for (var i = ds.length - 1; i >= 0; i--) {
        var v = ds[i].data[dataIndex];
        if (typeof v === 'number' && v > 0) return i;
      }
      return -1;
    }
    function stackedTopBorderRadius(ctx){
      var chart = ctx.chart;
      var idx = ctx.dataIndex;
      if (topDatasetIndex(chart, idx) === ctx.datasetIndex) {
        return { topLeft: 6, topRight: 6, bottomLeft: 0, bottomRight: 0 };
      }
      return 0;
    }
    var fallbackDatasets = [
      { label: 'Connections Sent', data: [2,3,1,4,0,1], backgroundColor: C.connections, borderWidth: 0, borderSkipped: false, borderRadius: stackedTopBorderRadius },
      { label: 'Profile Views', data: [1,2,2,1,0,1], backgroundColor: C.profile, borderWidth: 0, borderSkipped: false, borderRadius: stackedTopBorderRadius },
      { label: 'Posts Liked', data: [3,2,3,4,2,1], backgroundColor: C.posts, borderWidth: 0, borderSkipped: false, borderRadius: stackedTopBorderRadius },
      { label: 'Messages Sent', data: [1,0,1,1,0,0], backgroundColor: C.messages, borderWidth: 0, borderSkipped: false, borderRadius: stackedTopBorderRadius },
      { label: 'Accepted', data: [0,1,0,1,0,0], backgroundColor: C.accepted, borderWidth: 0, borderSkipped: false, borderRadius: stackedTopBorderRadius }
    ];
    var apiDatasets = (overviewPayload && Array.isArray(overviewPayload.datasets))
      ? overviewPayload.datasets.map(function(ds, idx){
          var palette = [C.connections, C.profile, C.posts, C.messages, C.accepted];
          return {
            label: ds.label || ('Series ' + (idx + 1)),
            data: Array.isArray(ds.data) ? ds.data.slice() : [],
            backgroundColor: palette[idx % palette.length],
            borderWidth: 0,
            borderSkipped: false,
            borderRadius: stackedTopBorderRadius
          };
        })
      : null;
    deps.setChartInstance(new deps.ChartCtor(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: apiDatasets && apiDatasets.length ? apiDatasets : fallbackDatasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 650, easing: 'easeOutQuart' },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { top: 4, right: 4, bottom: 0, left: 4 } },
        plugins: {
          legend: {
            position: 'top',
            align: 'center',
            labels: {
              boxWidth: 10,
              boxHeight: 10,
              padding: 14,
              usePointStyle: true,
              pointStyle: 'rect',
              font: { family: "'Inter',system-ui,sans-serif", size: 11, weight: '500' },
              color: '#475569'
            }
          },
          tooltip: {
            backgroundColor: '#1a1a1a',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            borderColor: '#333333',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: true,
            boxPadding: 6,
            boxWidth: 8,
            boxHeight: 8,
            titleFont: { family: "'Inter',system-ui,sans-serif", size: 13, weight: '600' },
            bodyFont: { family: "'Inter',system-ui,sans-serif", size: 12 },
            filter: function(){ return true; },
            callbacks: {
              title: function(items){ return items.length ? items[0].label : ''; },
              label: function(context){
                var label = context.dataset.label || '';
                var v = context.parsed.y !== null ? context.parsed.y : context.raw;
                return ' ' + label + ': ' + v;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true,
            grid: { display: false, drawBorder: false },
            ticks: { font: { family: "'Inter',system-ui,sans-serif", size: 11 }, color: '#64748b' }
          },
          y: {
            stacked: true,
            beginAtZero: true,
            max: 12,
            grid: { color: 'rgba(148, 163, 184, 0.28)', drawBorder: false },
            ticks: {
              stepSize: 2,
              font: { family: "'Inter',system-ui,sans-serif", size: 11 },
              color: '#64748b',
              padding: 6
            }
          }
        },
        datasets: {
          bar: {
            categoryPercentage: 0.65,
            barPercentage: 0.88
          }
        }
      }
    }));
    logger.debug('CHART_INSTANCE_CREATED', { chartId: 'activityChart' });
  }

  function resizeChart(deps){
    var logger = getLogger();
    var instance = deps.getChartInstance();
    if (instance) {
      requestAnimationFrame(function(){ instance.resize(); });
      logger.debug('CHART_RESIZE_REQUEST', { chartId: 'activityChart' });
    }
  }

  global.AppChartService = {
    initChart: initChart,
    resizeChart: resizeChart
  };
})(window);
