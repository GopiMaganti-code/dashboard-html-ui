;(function(global){
  function toNumberOrZero(value){
    var n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  function parseDailyActionDateKey(key){
    var m = String(key || '').match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (!m) return null;
    var day = Number(m[1]);
    var month = Number(m[2]);
    var year = Number(m[3]);
    var date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return null;
    return date;
  }

  function formatDailyLabel(date){
    if (!date || isNaN(date.getTime())) return '';
    try {
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch (e) {
      return date.toISOString().slice(0, 10);
    }
  }

  function buildPayloadFromDailyCounts(dailyActionCounts){
    var source = dailyActionCounts && typeof dailyActionCounts === 'object' ? dailyActionCounts : {};
    var entries = Object.keys(source).map(function(key){
      var parsedDate = parseDailyActionDateKey(key);
      return {
        key: key,
        date: parsedDate,
        sortTs: parsedDate ? parsedDate.getTime() : Number.MAX_SAFE_INTEGER,
        values: source[key] && typeof source[key] === 'object' ? source[key] : {}
      };
    }).filter(function(entry){
      return !!entry.date;
    }).sort(function(a, b){
      return a.sortTs - b.sortTs;
    });

    var labels = entries.map(function(entry){ return formatDailyLabel(entry.date); });
    var connections = entries.map(function(entry){
      var distinct = entry.values && typeof entry.values.distinct === 'object' ? entry.values.distinct : {};
      return toNumberOrZero(distinct.connections_sent);
    });
    var views = entries.map(function(entry){
      var distinct = entry.values && typeof entry.values.distinct === 'object' ? entry.values.distinct : {};
      return toNumberOrZero(distinct.views);
    });
    var posts = entries.map(function(entry){
      var distinct = entry.values && typeof entry.values.distinct === 'object' ? entry.values.distinct : {};
      return toNumberOrZero(distinct.like_post);
    });
    var messages = entries.map(function(entry){
      var distinct = entry.values && typeof entry.values.distinct === 'object' ? entry.values.distinct : {};
      return toNumberOrZero(distinct.messages_sent);
    });
    var accepted = entries.map(function(entry){
      var distinct = entry.values && typeof entry.values.distinct === 'object' ? entry.values.distinct : {};
      return toNumberOrZero(distinct.connected);
    });

    return {
      labels: labels,
      datasets: [
        { label: 'Connections Sent', data: connections },
        { label: 'Profile Views', data: views },
        { label: 'Posts Liked', data: posts },
        { label: 'Messages Sent', data: messages },
        { label: 'Accepted', data: accepted }
      ]
    };
  }

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
      : [];
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
      : [];
    deps.setChartInstance(new deps.ChartCtor(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: apiDatasets
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
            grid: { color: 'rgba(148, 163, 184, 0.28)', drawBorder: false },
            ticks: {
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
    resizeChart: resizeChart,
    buildPayloadFromDailyCounts: buildPayloadFromDailyCounts
  };
})(window);
