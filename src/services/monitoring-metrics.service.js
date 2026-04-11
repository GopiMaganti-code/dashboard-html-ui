;(function(global){
  /**
   * Canonical failure codes (deterministic, ordered classification).
   * First matching rule wins.
   */
  var FAILURE = {
    RATE_LIMIT: 'RATE_LIMIT',
    AUTH_CHECKPOINT: 'AUTH_CHECKPOINT',
    TIMEOUT: 'TIMEOUT',
    SELECTOR: 'SELECTOR',
    NAVIGATION: 'NAVIGATION',
    OTHER: 'OTHER'
  };

  var SEVERITY_BY_CODE = {
    RATE_LIMIT: 'critical',
    AUTH_CHECKPOINT: 'critical',
    TIMEOUT: 'warning',
    SELECTOR: 'minor',
    NAVIGATION: 'minor',
    OTHER: 'minor'
  };

  var FAILURE_LABELS = {
    RATE_LIMIT: 'Rate limit',
    AUTH_CHECKPOINT: 'Auth / checkpoint',
    TIMEOUT: 'Timeout',
    SELECTOR: 'Selector',
    NAVIGATION: 'Navigation',
    OTHER: 'Other'
  };

  var DEBOUNCE_MS = 90 * 1000;
  var debounceEmitted = {};

  function getLogger(){
    return global.AppLogger && typeof global.AppLogger.info === 'function' ? global.AppLogger : null;
  }

  function logInfo(event, payload){
    var log = getLogger();
    if (log) log.info(event, payload || {});
  }

  function normalizeFailureCode(raw){
    if (raw == null) return FAILURE.OTHER;
    var u = String(raw).trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
    if (u === 'AUTH' || u === 'CHECKPOINT' || u.indexOf('AUTH') === 0 && u.indexOf('CHECKPOINT') > 0) return FAILURE.AUTH_CHECKPOINT;
    if (u === 'RATE_LIMIT' || u === 'RATELIMIT') return FAILURE.RATE_LIMIT;
    if (u === 'TIMEOUT') return FAILURE.TIMEOUT;
    if (u === 'SELECTOR' || u === 'SELECTOR_ERROR') return FAILURE.SELECTOR;
    if (u === 'NAVIGATION' || u === 'NAVIGATION_ERROR') return FAILURE.NAVIGATION;
    if (Object.prototype.hasOwnProperty.call(FAILURE_LABELS, u)) return u;
    return FAILURE.OTHER;
  }

  function getFailureDisplayLabel(code){
    var c = normalizeFailureCode(code);
    return FAILURE_LABELS[c] || FAILURE_LABELS.OTHER;
  }

  /**
   * @returns {{ code: string, severity: string, label: string }}
   */
  function classifyFailure(logText, reasonFallback){
    var t = String(logText || '') + '\n' + String(reasonFallback || '');
    var lower = t.toLowerCase();
    var code = FAILURE.OTHER;

    if (/rate\s*limit|429|connection_limit|connection limit|too many requests|throttl/i.test(t)) {
      code = FAILURE.RATE_LIMIT;
    } else if (/checkpoint|challenge|auth|login|session expired|403.*auth|unauthori|security check/i.test(t)) {
      code = FAILURE.AUTH_CHECKPOINT;
    } else if (/timeout|timed out|etimedout|deadline exceeded/i.test(lower)) {
      code = FAILURE.TIMEOUT;
    } else if (/selector|locator|element not found|strict mode|no node found|waiting for selector/i.test(lower)) {
      code = FAILURE.SELECTOR;
    } else if (/navigation|net::err|page\.goto|navigation failed|profile not accessible|private profile|404\b|403\b/i.test(lower)) {
      code = FAILURE.NAVIGATION;
    }

    var severity = SEVERITY_BY_CODE[code] || 'minor';
    var label = FAILURE_LABELS[code];

    if (global.AppLogger && typeof global.AppLogger.debug === 'function') {
      global.AppLogger.debug('MONITORING_FAILURE_CLASSIFIED', {
        code: code,
        severity: severity,
        label: label
      });
    }

    return { code: code, severity: severity, label: label };
  }

  /**
   * Total actions from last stored run payloads (not DATA row counts).
   */
  function computeTotalActionsFromRunState(runState){
    if (!runState || typeof runState !== 'object') return 0;
    var acc = runState.lastAcceptanceRun;
    var msg = runState.lastMessagesRun;
    var n = 0;
    if (acc && typeof acc === 'object') {
      if (typeof acc.actions_count === 'number' && !isNaN(acc.actions_count)) {
        n += Math.max(0, Math.floor(acc.actions_count));
      } else if (typeof acc.accepted_count === 'number' && !isNaN(acc.accepted_count)) {
        n += Math.max(0, Math.floor(acc.accepted_count));
      }
    }
    if (msg && typeof msg === 'object' && typeof msg.leads_processed === 'number' && !isNaN(msg.leads_processed)) {
      n += Math.max(0, Math.floor(msg.leads_processed));
    }
    return n;
  }

  function computeRates(totalActions, failedCount){
    var t = Math.max(0, Math.floor(Number(totalActions) || 0));
    var f = Math.max(0, Math.floor(Number(failedCount) || 0));
    if (t <= 0) {
      return {
        totalActions: 0,
        failedCount: f,
        successRate: null,
        failureRate: null
      };
    }
    var fr = Math.min(1, f / t);
    var sr = Math.max(0, Math.min(1, (t - f) / t));
    return {
      totalActions: t,
      failedCount: f,
      successRate: sr,
      failureRate: fr
    };
  }

  function parsePercentFromSummary(dataMap){
    var ap = dataMap && dataMap['accepted-profiles'];
    if (!ap || !Array.isArray(ap.summary)) return null;
    var hit = ap.summary.find(function(s){
      var lab = String((s && s.label) || '').toLowerCase();
      return lab.indexOf('accept') >= 0 && lab.indexOf('rate') >= 0;
    });
    if (!hit) return null;
    var v = hit.val;
    if (typeof v === 'number' && !isNaN(v)) return Math.min(100, Math.max(0, v)) / 100;
    var m = String(v || '').match(/(\d+(?:\.\d+)?)\s*%/);
    if (m) return Math.min(1, Math.max(0, parseFloat(m[1], 10) / 100));
    return null;
  }

  function parseReplyRate(dataMap, runState){
    if (runState && runState.lastMessagesRun && typeof runState.lastMessagesRun.leads_processed === 'number') {
      var lp = runState.lastMessagesRun.leads_processed;
      var rd = runState.lastMessagesRun.replies_detected;
      if (lp > 0 && typeof rd === 'number' && !isNaN(rd)) {
        return Math.min(1, Math.max(0, rd / lp));
      }
    }
    var ms = dataMap && dataMap['messages-sent'];
    if (!ms || !Array.isArray(ms.summary)) return null;
    var sentItem = ms.summary.find(function(s){
      var lab = String((s && s.label) || '').toLowerCase();
      return lab.indexOf('sent') >= 0 && lab.indexOf('reply') < 0;
    });
    var repItem = ms.summary.find(function(s){
      var lab = String((s && s.label) || '').toLowerCase();
      return lab.indexOf('replied') >= 0 || lab === 'reply';
    });
    if (!sentItem || repItem == null) return null;
    var sv = Number(sentItem.val);
    var rv = Number(repItem.val);
    if (!isNaN(sv) && sv > 0 && !isNaN(rv)) return Math.min(1, Math.max(0, rv / sv));
    return null;
  }

  /**
   * health = acceptanceRate*0.4 + replyRate*0.3 + (1-failureRate)*0.3
   * Rates are 0..1. Missing components use neutral 0.5 weight for that term only when totalActions>0.
   */
  function computeAutomationHealth(ctx){
    var dataMap = ctx.dataMap || {};
    var runState = ctx.runState;
    var rates = ctx.rates || { failureRate: null };
    var acc = parsePercentFromSummary(dataMap);
    var reply = parseReplyRate(dataMap, runState);
    var failR = rates.failureRate;

    var accC = acc != null ? acc : 0.5;
    var repC = reply != null ? reply : 0.5;
    var failC = failR != null ? failR : 0;

    var hasRuns = computeTotalActionsFromRunState(runState) > 0;
    var hasFailureSignal = typeof ctx.failedCount === 'number' && ctx.failedCount > 0;
    if (!hasRuns && !hasFailureSignal && acc == null && reply == null) {
      return { score: null, percent: null, status: '—', statusKey: 'unknown', breakdown: null };
    }

    var health = accC * 0.4 + repC * 0.3 + (1 - failC) * 0.3;
    health = Math.min(1, Math.max(0, health));

    var statusKey = 'healthy';
    var status = 'Healthy';
    if (health < 0.45) {
      statusKey = 'critical';
      status = 'Critical';
    } else if (health < 0.75) {
      statusKey = 'warning';
      status = 'Warning';
    }

    var acceptancePoints = accC * 0.4 * 100;
    var replyPoints = repC * 0.3 * 100;
    var reliabilityPoints = (1 - failC) * 0.3 * 100;

    logInfo('MONITORING_HEALTH_SCORE', {
      healthScore: health,
      acceptanceRate: accC,
      replyRate: repC,
      failureRate: failR,
      status: statusKey,
      acceptanceContribution: acceptancePoints,
      replyContribution: replyPoints,
      reliabilityContribution: reliabilityPoints
    });

    return {
      score: health,
      percent: health * 100,
      status: status,
      statusKey: statusKey,
      breakdown: {
        acceptancePts: acceptancePoints,
        replyPts: replyPoints,
        reliabilityPts: reliabilityPoints,
        maxAcceptance: 40,
        maxReply: 30,
        maxReliability: 30
      }
    };
  }

  /** Strict ISO-8601 timestamp parse only (stable activity detection). */
  function parseIsoTimestampOnly(s){
    if (s == null || typeof s !== 'string') return null;
    var t = String(s).trim();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(t)) return null;
    var d = new Date(t);
    if (isNaN(d.getTime())) return null;
    return d.getTime();
  }

  function maxIsoMs(a, b){
    if (a == null) return b;
    if (b == null) return a;
    return Math.max(a, b);
  }

  /**
   * Latest activity: max of valid ISO row times, then fallback to run completed_at ISO.
   */
  function getLatestActivityMs(dataMap, runState){
    var maxMs = null;
    var keys = ['connections-sent', 'profile-views', 'posts-liked', 'messages-sent', 'recent-runs', 'accepted-profiles'];
    keys.forEach(function(key){
      var block = dataMap && dataMap[key];
      if (!block || !Array.isArray(block.rows)) return;
      block.rows.forEach(function(row){
        var ms = parseIsoTimestampOnly(row && row.time);
        if (ms != null) maxMs = maxIsoMs(maxMs, ms);
      });
    });

    if (runState && typeof runState === 'object') {
      var acc = runState.lastAcceptanceRun;
      var msg = runState.lastMessagesRun;
      if (acc && acc.completed_at) maxMs = maxIsoMs(maxMs, parseIsoTimestampOnly(acc.completed_at));
      if (msg && msg.completed_at) maxMs = maxIsoMs(maxMs, parseIsoTimestampOnly(msg.completed_at));
      if (acc && acc.started_at) maxMs = maxIsoMs(maxMs, parseIsoTimestampOnly(acc.started_at));
      if (msg && msg.started_at) maxMs = maxIsoMs(maxMs, parseIsoTimestampOnly(msg.started_at));
    }

    return maxMs;
  }

  function avgWindowValues(data, start, len){
    var sum = 0;
    var c = 0;
    var i;
    for (i = 0; i < len; i++) {
      var idx = start + i;
      if (idx < 0 || idx >= data.length) continue;
      var v = data[idx];
      if (typeof v === 'number' && !isNaN(v)) {
        sum += v;
        c++;
      }
    }
    return c > 0 ? sum / c : null;
  }

  /**
   * Compare avg(last 3 buckets) vs avg(previous 3 buckets); fallback for short series.
   */
  function compareRecentPriorAverages(data){
    if (!Array.isArray(data) || data.length < 2) return null;
    var n = data.length;
    var w = n >= 6 ? 3 : Math.max(1, Math.floor(n / 2));
    if (n < 2 * w) w = Math.max(1, Math.floor((n - 1) / 2));
    if (w < 1) return null;
    var recent = avgWindowValues(data, n - w, w);
    var prior = avgWindowValues(data, n - 2 * w, w);
    if (recent == null || prior == null) return null;
    return { recent: recent, prior: prior, window: w };
  }

  function trendFromAvgs(recent, prior){
    if (recent == null || prior == null) return { symbol: '→', label: 'n/a', cls: '' };
    if (recent > prior) return { symbol: '↑', label: 'vs prior period', cls: 'trend-up' };
    if (recent < prior) return { symbol: '↓', label: 'vs prior period', cls: 'trend-down' };
    return { symbol: '→', label: 'vs prior period', cls: '' };
  }

  var STAT_KEY_PATTERNS = {
    'connections-sent': [/connection/i],
    'profile-views': [/profile/i],
    'posts-liked': [/post/i, /liked/i],
    'messages-sent': [/message/i],
    'accepted-profiles': [/accepted/i],
    'recent-runs': null
  };

  function datasetSeriesForStatKey(statKey, chartPayload){
    if (!chartPayload || !Array.isArray(chartPayload.datasets)) return null;
    var pats = STAT_KEY_PATTERNS[statKey];
    if (statKey === 'recent-runs') {
      return chartPayload.datasets.map(function(ds, i){ return { label: ds.label, index: i }; });
    }
    if (!pats) return null;
    for (var i = 0; i < chartPayload.datasets.length; i++){
      var lab = String(chartPayload.datasets[i].label || '');
      for (var j = 0; j < pats.length; j++){
        if (pats[j].test(lab)) return [{ label: lab, index: i }];
      }
    }
    return null;
  }

  function applyTrendsToStatCards(chartPayload){
    var labels = chartPayload && Array.isArray(chartPayload.labels) ? chartPayload.labels : [];
    var n = labels.length;
    if (n < 2) return;

    var cards = document.querySelectorAll('#screen-dashboard .stat-card[data-stat-key]');
    cards.forEach(function(card){
      var key = card.getAttribute('data-stat-key');
      if (!key || key === 'success-rate' || key === 'failure-rate' || key === 'health-score') return;

      var series = datasetSeriesForStatKey(key, chartPayload);
      if (!series) return;

      var cmp = null;
      if (key === 'recent-runs') {
        var maxLen = 0;
        chartPayload.datasets.forEach(function(ds){
          if (ds && Array.isArray(ds.data) && ds.data.length > maxLen) maxLen = ds.data.length;
        });
        var summed = [];
        var di;
        for (di = 0; di < maxLen; di++) {
          var s = 0;
          chartPayload.datasets.forEach(function(ds){
            if (!ds || !Array.isArray(ds.data)) return;
            var v = ds.data[di];
            if (typeof v === 'number' && !isNaN(v)) s += v;
          });
          summed.push(s);
        }
        cmp = compareRecentPriorAverages(summed);
      } else {
        var idx = series[0].index;
        var ds = chartPayload.datasets[idx];
        if (!ds || !Array.isArray(ds.data)) return;
        var two = compareRecentPriorAverages(ds.data);
        if (two) cmp = { recent: two.recent, prior: two.prior };
      }

      if (!cmp) return;
      var tr = trendFromAvgs(cmp.recent, cmp.prior);
      var el = card.querySelector('.stat-trend');
      if (el) {
        el.textContent = tr.symbol + ' ' + tr.label + ' (avg ' + cmp.recent.toFixed(2) + ' vs ' + cmp.prior.toFixed(2) + ')';
        el.className = 'stat-trend ' + tr.cls;
      }
    });

    var log = global.AppLogger && typeof global.AppLogger.debug === 'function' ? global.AppLogger : null;
    if (log) {
      log.debug('MONITORING_TRENDS_APPLIED', {
        chartPoints: n,
        mode: 'avg_last3_vs_prev3'
      });
    }
  }

  /**
   * Count failure codes from failed-action rows; return top N with share of total.
   * @returns {{ total: number, top: Array<{ code: string, label: string, count: number, percent: number }> }}
   */
  function aggregateTopFailureTypes(failedActions, topN){
    var n = typeof topN === 'number' ? topN : 2;
    if (!Array.isArray(failedActions) || failedActions.length === 0) {
      return { total: 0, top: [] };
    }
    var counts = {};
    failedActions.forEach(function(item){
      var fromApi = item && item.failure_type ? normalizeFailureCode(item.failure_type) : null;
      var cf = classifyFailure(item && item.logs, item && item.reason);
      var code = (fromApi && fromApi !== FAILURE.OTHER) ? fromApi : cf.code;
      counts[code] = (counts[code] || 0) + 1;
    });
    var total = failedActions.length;
    var entries = Object.keys(counts).map(function(k){
      return {
        code: k,
        label: FAILURE_LABELS[k] || k,
        count: counts[k],
        percent: (counts[k] / total) * 100
      };
    });
    entries.sort(function(a, b){ return b.count - a.count; });
    return { total: total, top: entries.slice(0, n) };
  }

  /**
   * Run health: prefer GET /runs payload; fallback to last stored run payloads.
   * @returns {{ processed: number, successRuns: number, failedRuns: number, successRate: number|null, source: string }}
   */
  function summarizeRunHealth(apiData, runState){
    var items = apiData && Array.isArray(apiData.items) ? apiData.items : [];
    if (items.length > 0) {
      var processedVol = 0;
      var ok = 0;
      var bad = 0;
      items.forEach(function(r){
        var p = r && r.payload != null ? r.payload : r;
        if (typeof p !== 'object' || !p) p = {};
        var ac = Number(p.actions_count);
        var lp = Number(p.leads_processed);
        var vol = 0;
        if (!isNaN(ac) && ac > 0) vol += Math.floor(ac);
        if (!isNaN(lp) && lp > 0) vol += Math.floor(lp);
        if (vol > 0) processedVol += vol;
        var st = String(r.status || p.status || '').toLowerCase();
        if (st === 'success' || st === 'completed' || st === 'ok') ok++;
        else if (st === 'failed' || st === 'error' || st === 'failure') bad++;
      });
      if (processedVol === 0 && items.length > 0) {
        processedVol = items.length;
      }
      var tr = ok + bad;
      if (tr === 0 && items.length > 0) {
        tr = items.length;
        ok = items.filter(function(r){
          var p = r && r.payload != null ? r.payload : r;
          if (typeof p !== 'object' || !p) p = {};
          var st = String(r.status || p.status || '').toLowerCase();
          return st !== 'failed' && st !== 'error' && st !== 'failure';
        }).length;
        bad = tr - ok;
      }
      return {
        processed: processedVol,
        successRuns: ok,
        failedRuns: bad,
        successRate: tr > 0 ? ok / tr : null,
        source: 'api'
      };
    }
    return summarizeRunHealthFromState(runState);
  }

  function summarizeRunHealthFromState(runState){
    if (!runState || typeof runState !== 'object') {
      return { processed: 0, successRuns: 0, failedRuns: 0, successRate: null, source: 'local' };
    }
    var processed = 0;
    var ok = 0;
    var bad = 0;
    var acc = runState.lastAcceptanceRun;
    var msg = runState.lastMessagesRun;
    if (acc && typeof acc === 'object') {
      var acn = Number(acc.actions_count);
      if (!isNaN(acn) && acn > 0) processed += Math.floor(acn);
      else {
        var ac2 = Number(acc.accepted_count);
        if (!isNaN(ac2) && ac2 > 0) processed += Math.floor(ac2);
      }
      var ast = String(acc.status || '').toLowerCase();
      if (ast === 'success') ok++;
      else if (ast === 'failed') bad++;
    }
    if (msg && typeof msg === 'object') {
      var lp = Number(msg.leads_processed);
      if (!isNaN(lp) && lp > 0) processed += Math.floor(lp);
      var mst = String(msg.status || '').toLowerCase();
      if (mst === 'success') ok++;
      else if (mst === 'failed') bad++;
    }
    if (processed === 0 && (ok + bad) > 0) {
      processed = ok + bad;
    }
    var tr = ok + bad;
    return {
      processed: processed,
      successRuns: ok,
      failedRuns: bad,
      successRate: tr > 0 ? ok / tr : null,
      source: 'local'
    };
  }

  function debounceAlerts(alerts){
    if (!Array.isArray(alerts)) return [];
    var now = Date.now();
    var out = [];
    alerts.forEach(function(a){
      if (!a || !a.text) return;
      var key = String(a.level || 'info') + '|' + String(a.text);
      var last = debounceEmitted[key];
      if (last && now - last < DEBOUNCE_MS) return;
      debounceEmitted[key] = now;
      out.push(a);
      logInfo('MONITORING_ALERT_TRIGGERED', { level: a.level, text: a.text });
    });
    return out;
  }

  function buildAlerts(ctx){
    var out = [];
    var dataMap = ctx.dataMap || {};
    var failedCount = typeof ctx.failedCount === 'number' ? ctx.failedCount : 0;
    var totalActions = typeof ctx.totalActions === 'number'
      ? ctx.totalActions
      : computeTotalActionsFromRunState(ctx.runState || {});
    var rates = computeRates(totalActions, failedCount);

    var accPct = parsePercentFromSummary(dataMap);
    if (accPct != null && accPct < 0.15) {
      out.push({
        level: 'warning',
        text: 'Acceptance rate is ' + (accPct * 100).toFixed(1) + '% — likely poor targeting, weak message fit, or account trust / reputation risk.'
      });
    }

    if (rates.failureRate != null && rates.failureRate > 0.2) {
      out.push({
        level: 'error',
        text: 'Failure rate is ' + (rates.failureRate * 100).toFixed(1) + '% (threshold 20%) — likely flaky selectors, navigation blocks, LinkedIn limits, or session issues.'
      });
    }

    var latestMs = getLatestActivityMs(dataMap, ctx.runState);
    var now = Date.now();
    if (latestMs != null && now - latestMs > 24 * 60 * 60 * 1000) {
      out.push({
        level: 'alert',
        text: 'No ISO-dated activity in the last 24 hours — possible causes: automation stopped, session expired, account restricted, or worker clock/API mismatch.'
      });
    } else if (latestMs == null && totalActions === 0) {
      out.push({
        level: 'alert',
        text: 'No valid ISO timestamps or run volume yet — possible causes: automation not started, session expired, account restricted, or data not synced.'
      });
    }

    var msgBlock = dataMap['messages-sent'];
    var repliedTimes = [];
    if (msgBlock && Array.isArray(msgBlock.rows)) {
      msgBlock.rows.forEach(function(row){
        var st = String(row && row.status || '').toLowerCase();
        if (st === 'replied') {
          var ms = parseIsoTimestampOnly(row && row.time);
          if (ms != null) repliedTimes.push(ms);
        }
      });
    }
    var threeDays = 3 * 24 * 60 * 60 * 1000;
    var hasRepliedRow = msgBlock && Array.isArray(msgBlock.rows) && msgBlock.rows.some(function(row){
      return String(row && row.status || '').toLowerCase() === 'replied';
    });
    var recentReply = repliedTimes.filter(function(ms){ return now - ms <= threeDays; });
    if (hasRepliedRow && recentReply.length === 0 && repliedTimes.length > 0) {
      out.push({
        level: 'warning',
        text: 'No replies in the last 3 days — likely inbox fatigue, low intent leads, or deliverability / messaging limits.'
      });
    }

    return debounceAlerts(out);
  }

  global.AppMonitoringMetrics = {
    FAILURE: FAILURE,
    SEVERITY_BY_CODE: SEVERITY_BY_CODE,
    classifyFailure: classifyFailure,
    normalizeFailureCode: normalizeFailureCode,
    getFailureDisplayLabel: getFailureDisplayLabel,
    computeTotalActionsFromRunState: computeTotalActionsFromRunState,
    computeRates: computeRates,
    computeAutomationHealth: computeAutomationHealth,
    parsePercentFromSummary: parsePercentFromSummary,
    parseReplyRate: parseReplyRate,
    getLatestActivityMs: getLatestActivityMs,
    parseIsoTimestampOnly: parseIsoTimestampOnly,
    applyTrendsToStatCards: applyTrendsToStatCards,
    buildAlerts: buildAlerts,
    debounceAlerts: debounceAlerts,
    aggregateTopFailureTypes: aggregateTopFailureTypes,
    summarizeRunHealth: summarizeRunHealth
  };
})(window);
