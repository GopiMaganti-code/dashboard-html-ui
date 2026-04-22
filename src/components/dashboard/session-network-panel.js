;(function(global){
  function esc(deps, s){
    if (deps && deps.escapeHtml) return deps.escapeHtml(s == null ? '' : String(s));
    var d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function useApiOn(){
    try {
      return !!(global.AppConfig && global.AppConfig.useApi);
    } catch (e) {
      return false;
    }
  }

  function normalizeIsoLike(raw){
    var s = String(raw || '');
    if (!s) return '';
    s = s.replace(/(\.\d{3})\d+$/, '$1');
    if (/^\d{4}-\d{2}-\d{2}T/.test(s) && !/(Z|[+\-]\d{2}:\d{2})$/.test(s)) s += 'Z';
    return s;
  }

  function formatTimestamp(raw){
    if (!raw) return '—';
    var s = String(raw);
    var normalized = normalizeIsoLike(s);
    if (global.AppUtilsFormatters && typeof global.AppUtilsFormatters.formatIsoForDisplay === 'function' && /^\d{4}-\d{2}-\d{2}T/.test(normalized)) {
      try {
        return global.AppUtilsFormatters.formatIsoForDisplay(normalized);
      } catch (e) {}
    }
    var parsed = Date.parse(normalized);
    if (!isNaN(parsed)) return new Date(parsed).toLocaleString();
    return s;
  }

  function toArray(v){
    return Array.isArray(v) ? v : [];
  }

  function toNum(v){
    var n = Number(v);
    return isNaN(n) ? 0 : n;
  }

  function clamp01(v){
    if (v < 0) return 0;
    if (v > 1) return 1;
    return v;
  }

  function getRiskConfig(){
    var defaults = {
      thresholds: { high: 65, medium: 35 },
      weights: { static: 25, highCount: 25, geo: 20, burst: 15, session: 15 }
    };
    var cfg = global.AppConfig && global.AppConfig.riskConfig ? global.AppConfig.riskConfig : null;
    if (!cfg) return defaults;
    return {
      thresholds: {
        high: Math.max(0, toNum(cfg.thresholds && cfg.thresholds.high) || defaults.thresholds.high),
        medium: Math.max(0, toNum(cfg.thresholds && cfg.thresholds.medium) || defaults.thresholds.medium)
      },
      weights: {
        static: Math.max(0, toNum(cfg.weights && cfg.weights.static) || defaults.weights.static),
        highCount: Math.max(0, toNum(cfg.weights && cfg.weights.highCount) || defaults.weights.highCount),
        geo: Math.max(0, toNum(cfg.weights && cfg.weights.geo) || defaults.weights.geo),
        burst: Math.max(0, toNum(cfg.weights && cfg.weights.burst) || defaults.weights.burst),
        session: Math.max(0, toNum(cfg.weights && cfg.weights.session) || defaults.weights.session)
      }
    };
  }

  function normalizeRiskBand(score, cfg){
    var c = cfg || getRiskConfig();
    if (score >= c.thresholds.high) return 'high';
    if (score >= c.thresholds.medium) return 'moderate';
    return 'healthy';
  }

  function parseTs(raw){
    if (!raw) return NaN;
    var normalized = normalizeIsoLike(raw);
    return Date.parse(normalized);
  }

  function deriveConfidence(isPartial, sampleSize){
    if (isPartial) return 'medium';
    if (sampleSize < 5) return 'low';
    return 'high';
  }

  function computeCampaignRiskScore(row, mappedIps, cfg){
    var c = cfg || getRiskConfig();
    var rotation = String(row && row.ip_rotation || '').toLowerCase() === 'static' ? 'static' : 'dynamic';
    var ips = toArray(mappedIps);
    var events = Math.max(0, toNum(row && row.events));
    var latestTs = parseTs(row && row.last_ts ? String(row.last_ts) : '');
    if (isNaN(latestTs)) latestTs = Date.now();

    var highCountIps = ips.filter(function(ipRow){ return toNum(ipRow && ipRow.count) > 8; }).length;
    var highCountRatio = ips.length ? (highCountIps / ips.length) : 0;

    var cityMap = {};
    ips.forEach(function(ipRow){
      var city = ipRow && ipRow.city ? String(ipRow.city).toLowerCase() : '';
      if (!city) return;
      cityMap[city] = true;
    });
    var uniqueCities = Object.keys(cityMap).length;
    var geoChurnRatio = events > 0 ? (uniqueCities / events) : 0;
    var geoChurnScore = clamp01(geoChurnRatio * 3);

    var recentWindowMs = 6 * 60 * 60 * 1000;
    var recentCount = ips.reduce(function(acc, ipRow){
      var ts = parseTs(ipRow && ipRow.lastTs ? ipRow.lastTs : '');
      if (isNaN(ts)) return acc;
      return (latestTs - ts <= recentWindowMs) ? (acc + toNum(ipRow && ipRow.count)) : acc;
    }, 0);
    var burstRatio = events > 0 ? (recentCount / events) : 0;
    var burstScore = clamp01(burstRatio);

    var stickyMap = {};
    ips.forEach(function(ipRow){
      var sid = ipRow && ipRow.stickySessionId ? String(ipRow.stickySessionId) : '';
      if (!sid) return;
      stickyMap[sid] = true;
    });
    var stickyCount = Object.keys(stickyMap).length;
    var stickyRatio = ips.length ? (stickyCount / ips.length) : 0;
    var sessionAnomalyScore = clamp01(stickyRatio);

    var score =
      (rotation === 'static' ? c.weights.static : 0) +
      (highCountRatio * c.weights.highCount) +
      (geoChurnScore * c.weights.geo) +
      (burstScore * c.weights.burst) +
      (sessionAnomalyScore * c.weights.session);

    var reasons = [];
    if (rotation === 'static') reasons.push('STATIC_ROTATION');
    if (highCountRatio > 0.2) reasons.push('HIGH_COUNT_RATIO');
    if (geoChurnScore > 0.55) reasons.push('GEO_CHURN');
    if (burstScore > 0.6) reasons.push('BURST_ACTIVITY');
    if (sessionAnomalyScore > 0.8) reasons.push('SESSION_ANOMALY');
    if (!reasons.length) reasons.push('LOW_SIGNAL');

    return {
      score: Math.round(score * 10) / 10,
      band: normalizeRiskBand(score, c),
      reasons: reasons
    };
  }

  function normalizeApiRisk(raw, fallbackRisk, fallbackScore, fallbackReasons, fallbackConfidence, cfg){
    var c = cfg || getRiskConfig();
    if (!raw || typeof raw !== 'object') {
      return {
        risk: fallbackRisk,
        score: fallbackScore,
        reasons: fallbackReasons,
        confidence: fallbackConfidence,
        source: 'heuristic'
      };
    }
    var rawBand = String(raw.level || raw.status || raw.band || '').toLowerCase();
    var score = toNum(raw.score);
    var risk = fallbackRisk;
    if (rawBand === 'high' || rawBand === 'critical') risk = 'high';
    else if (rawBand === 'medium' || rawBand === 'moderate' || rawBand === 'warning') risk = 'moderate';
    else if (rawBand === 'low' || rawBand === 'healthy' || rawBand === 'ok') risk = 'healthy';
    else if (score > 0) risk = normalizeRiskBand(score, c);
    var reasons = toArray(raw.reasons).map(function(x){ return String(x); });
    if (!reasons.length) reasons = fallbackReasons;
    var confidence = String(raw.confidence || fallbackConfidence || 'medium').toLowerCase();
    if (confidence !== 'high' && confidence !== 'medium' && confidence !== 'low') confidence = fallbackConfidence;
    return {
      risk: risk,
      score: score > 0 ? score : fallbackScore,
      reasons: reasons,
      confidence: confidence,
      source: 'api'
    };
  }

  function emitRiskObservability(campaigns){
    var totalCampaigns = campaigns.length || 1;
    var high = campaigns.filter(function(c){ return c.risk === 'high'; }).length;
    var medium = campaigns.filter(function(c){ return c.risk === 'moderate'; }).length;
    var low = campaigns.filter(function(c){ return c.risk === 'healthy'; }).length;
    var partial = campaigns.filter(function(c){ return !!c.isPartial; }).length;
    var full = campaigns.length - partial;
    var totalIps = campaigns.reduce(function(acc, c){ return acc + (c.ipsTotal || c.ips.length || 0); }, 0);
    var riskyIps = campaigns.reduce(function(acc, c){ return acc + c.ips.filter(function(ip){ return !!ip.risky; }).length; }, 0);
    var payload = {
      type: 'campaign_ip_risk_metrics',
      campaigns: {
        total: campaigns.length,
        low_percent: Math.round((low / totalCampaigns) * 1000) / 10,
        medium_percent: Math.round((medium / totalCampaigns) * 1000) / 10,
        high_percent: Math.round((high / totalCampaigns) * 1000) / 10
      },
      ips: {
        total_visible: campaigns.reduce(function(acc, c){ return acc + c.ips.length; }, 0),
        total_expected: totalIps,
        risky_visible_percent: totalIps > 0 ? Math.round((riskyIps / totalIps) * 1000) / 10 : 0
      },
      data_coverage: {
        partial_percent: Math.round((partial / totalCampaigns) * 1000) / 10,
        full_percent: Math.round((full / totalCampaigns) * 1000) / 10
      }
    };
    if (typeof console !== 'undefined' && typeof console.info === 'function') console.info('[CampaignIpRiskMetrics]', payload);
    if (global.AppLogger && typeof global.AppLogger.info === 'function') global.AppLogger.info('CAMPAIGN_IP_RISK_METRICS', payload);
    if (global.AppAnalytics && typeof global.AppAnalytics.track === 'function') global.AppAnalytics.track('campaign_ip_risk_metrics', payload);
  }

  function trackRiskMismatch(campaign){
    if (!campaign || campaign.riskSource !== 'api') return;
    var apiBand = String(campaign.apiRiskBand || campaign.risk || '').toLowerCase();
    var heuristicBand = String(campaign.heuristicRiskBand || '').toLowerCase();
    if (!apiBand || !heuristicBand || apiBand === heuristicBand) return;
    var payload = {
      campaign_id: campaign.campaignId,
      api_risk: apiBand,
      heuristic_risk: heuristicBand,
      api_score: campaign.riskScore,
      confidence: campaign.confidence
    };
    if (typeof console !== 'undefined' && typeof console.warn === 'function') console.warn('[CampaignIpRiskMismatch]', payload);
    if (global.AppLogger && typeof global.AppLogger.warn === 'function') global.AppLogger.warn('CAMPAIGN_IP_RISK_MISMATCH', payload);
  }

  function computeDriftAlerts(campaigns){
    var alerts = [];
    campaigns.forEach(function(c){
      if (!c) return;
      if (c.isPartial) alerts.push('Partial IP data loaded for ' + c.campaignId + '.');
      if (c.ipsTotal > 0 && c.ips.length / c.ipsTotal < 0.5) alerts.push('Low IP coverage for ' + c.campaignId + ' (' + c.ips.length + '/' + c.ipsTotal + ').');
      if (c.riskSource === 'api' && c.apiRiskBand && c.apiRiskBand !== c.heuristicRiskBand) {
        alerts.push('Risk drift for ' + c.campaignId + ': API=' + c.apiRiskBand + ', heuristic=' + c.heuristicRiskBand + '.');
      }
      if (c.trendDelta >= 20) alerts.push('Risk increased sharply for ' + c.campaignId + ' (+' + c.trendDelta.toFixed(1) + ').');
    });
    return alerts.slice(0, 4);
  }

  function normalizeRawCampaigns(rawApi){
    if (!rawApi) return [];
    var list = toArray(rawApi.campaigns);
    if (!list.length && rawApi.data) list = toArray(rawApi.data.campaigns);
    var cfg = getRiskConfig();
    return list.map(function(row){
      var ips = toArray(row.ips);
      var isStatic = String(row && row.ip_rotation || '').toLowerCase() === 'static';
      var mappedIps = ips.map(function(ipRow){
        var count = toNum(ipRow && ipRow.count);
        var sid = ipRow && ipRow.sticky_session_id ? String(ipRow.sticky_session_id) : '';
        var ipReasons = [];
        if (count > 8) ipReasons.push('HIGH_COUNT');
        if (isStatic && count > 5) ipReasons.push('STATIC_HIGH_COUNT');
        var risky = ipReasons.length >= 1;
        var ipScore = Math.min(100, (count > 8 ? 55 : 0) + ((isStatic && count > 5) ? 20 : 0));
        return {
          ip: ipRow && ipRow.ip ? String(ipRow.ip) : '—',
          city: ipRow && ipRow.city ? String(ipRow.city) : '',
          countryCode: ipRow && ipRow.country_code ? String(ipRow.country_code).toUpperCase() : '',
          provider: ipRow && ipRow.provider ? String(ipRow.provider) : '—',
          mode: ipRow && ipRow.mode ? String(ipRow.mode) : '—',
          stickySessionId: sid,
          count: count,
          lastTs: ipRow && ipRow.last_ts ? String(ipRow.last_ts) : '',
          risky: risky,
          riskScore: ipScore,
          riskReasons: ipReasons.length ? ipReasons : ['LOW_SIGNAL']
        };
      });
      var uniqueIps = Math.max(0, toNum(row && row.unique_ips));
      var events = Math.max(0, toNum(row && row.events));
      var hasIpsTotal = row && row.ips_total != null && row.ips_total !== '';
      var ipsTotalRaw = toNum(row && row.ips_total);
      var ipsTotal = ipsTotalRaw > 0 ? ipsTotalRaw : mappedIps.length;
      var ipsLimitRaw = toNum(row && row.ips_limit);
      var ipsLimit = ipsLimitRaw > 0 ? ipsLimitRaw : mappedIps.length;
      var ipsOffset = Math.max(0, toNum(row && row.ips_offset));
      var ipsHasMore = !!(row && row.ips_has_more) || (ipsTotal > (ipsOffset + mappedIps.length));
      var isPartial = ipsTotal > mappedIps.length || ipsOffset > 0 || ipsHasMore;
      var diversity = events > 0 ? (uniqueIps / events) : 0;
      var rotation = String(row && row.ip_rotation || '').toLowerCase() === 'static' ? 'static' : 'dynamic';
      var riskModel = computeCampaignRiskScore(row, mappedIps, cfg);
      var heuristicConfidence = deriveConfidence(isPartial, mappedIps.length);
      var apiRisk = normalizeApiRisk(row && row.risk ? row.risk : null, riskModel.band, riskModel.score, riskModel.reasons, heuristicConfidence, cfg);
      var prevScoreRaw = row && row.last_risk_score != null ? toNum(row.last_risk_score) : NaN;
      var trendDelta = isNaN(prevScoreRaw) ? 0 : (apiRisk.score - prevScoreRaw);
      return {
        campaignId: row && row.campaign_id ? String(row.campaign_id) : '—',
        uniqueIps: uniqueIps,
        events: events,
        ipRotation: rotation,
        ipDiversityScore: diversity,
        risk: apiRisk.risk,
        riskScore: apiRisk.score,
        riskReasons: apiRisk.reasons,
        confidence: apiRisk.confidence,
        riskSource: apiRisk.source,
        apiRiskBand: row && row.risk && row.risk.level ? String(row.risk.level).toLowerCase() : '',
        heuristicRiskBand: riskModel.band,
        trendDelta: trendDelta,
        previousRiskScore: isNaN(prevScoreRaw) ? null : prevScoreRaw,
        lastTs: row && row.last_ts ? String(row.last_ts) : '',
        ips: mappedIps,
        ipsTotal: ipsTotal,
        hasIpsTotal: !!hasIpsTotal,
        ipsLimit: ipsLimit,
        ipsOffset: ipsOffset,
        ipsHasMore: ipsHasMore,
        isPartial: isPartial
      };
    });
  }

  function riskLabel(risk){
    if (risk === 'high') return 'High';
    if (risk === 'moderate') return 'Medium';
    return 'Low';
  }

  function renderRiskBadge(risk, title){
    var cls = risk === 'high' ? 'campaign-ip-badge--risk' : (risk === 'moderate' ? 'campaign-ip-badge--moderate' : 'campaign-ip-badge--healthy');
    var tt = title ? ' title="' + title + '"' : '';
    var icon = risk === 'high' ? '🔴' : (risk === 'moderate' ? '🟡' : '🟢');
    return '<span class="campaign-ip-badge ' + cls + '"' + tt + '><span class="campaign-ip-badge-icon">' + icon + '</span><span>' + riskLabel(risk) + '</span></span>';
  }

  function renderModeBadge(mode){
    var value = String(mode || 'dynamic').toLowerCase() === 'static' ? 'static' : 'dynamic';
    var cls = value === 'static' ? 'campaign-ip-mode--static' : 'campaign-ip-mode--dynamic';
    return '<span class="campaign-ip-mode ' + cls + '">' + value + '</span>';
  }

  function renderInfoLabel(deps, label, tooltip){
    var text = String(label || '');
    var tip = String(tooltip || '');
    return '<span class="campaign-ip-label-with-tip">' +
      esc(deps, text) +
      '<span class="campaign-ip-info-tip" tabindex="0" role="button" title="' + esc(deps, tip) + '" aria-label="' + esc(deps, text + ' info: ' + tip) + '">' +
      'ℹ️' +
      '<span class="campaign-ip-tooltip-text" role="tooltip">' + esc(deps, tip) + '</span>' +
      '</span>' +
      '</span>';
  }

  function getSummary(campaigns){
    var totalCampaigns = campaigns.length;
    var totalUniqueIps = campaigns.reduce(function(acc, row){ return acc + row.uniqueIps; }, 0);
    var avgDiversity = totalCampaigns ? campaigns.reduce(function(acc, row){ return acc + row.ipDiversityScore; }, 0) / totalCampaigns : 0;
      var highRisk = campaigns.filter(function(row){ return row.risk === 'high'; }).length;
      var mediumRisk = campaigns.filter(function(row){ return row.risk === 'moderate'; }).length;
      var lowRisk = campaigns.filter(function(row){ return row.risk === 'healthy'; }).length;
    return {
      totalCampaigns: totalCampaigns,
      totalUniqueIps: totalUniqueIps,
      avgDiversity: avgDiversity,
      highRisk: highRisk,
      mediumRisk: mediumRisk,
      lowRisk: lowRisk,
      anyPartial: campaigns.some(function(row){ return !!row.isPartial; })
    };
  }

  function sortCampaigns(campaigns, sortBy){
    var rank = { high: 0, moderate: 1, healthy: 2 };
    var arr = campaigns.slice();
    if (sortBy === 'events') {
      return arr.sort(function(a, b){ return b.events - a.events; });
    }
    if (sortBy === 'unique_ips') {
      return arr.sort(function(a, b){ return b.uniqueIps - a.uniqueIps; });
    }
    var sameRisk = arr.length > 1 && arr.every(function(item){ return item.risk === arr[0].risk; });
    if (sameRisk) {
      return arr.sort(function(a, b){
        var tb = parseTs(b.lastTs);
        var ta = parseTs(a.lastTs);
        if (!isNaN(tb) && !isNaN(ta) && tb !== ta) return tb - ta;
        var maxB = b.ips.reduce(function(acc, x){ return Math.max(acc, toNum(x.count)); }, 0);
        var maxA = a.ips.reduce(function(acc, x){ return Math.max(acc, toNum(x.count)); }, 0);
        return maxB - maxA;
      });
    }
    return arr.sort(function(a, b){
      if (rank[a.risk] !== rank[b.risk]) return rank[a.risk] - rank[b.risk];
      return b.events - a.events;
    });
  }

  function attachHandlers(mount, deps){
    if (mount.__campaignIpHandlersBound) return;
    mount.__campaignIpHandlersBound = true;
    mount.addEventListener('change', function(evt){
      var state = mount.__campaignIpState || {};
      if (evt.target && evt.target.id === 'campaign-ip-sort') state.sortBy = evt.target.value || 'risk';
      if (evt.target && evt.target.id === 'campaign-ip-filter-risk') state.highRiskOnly = !!evt.target.checked;
      if (evt.target && evt.target.id === 'campaign-ip-filter-rotation') state.rotation = evt.target.value || 'all';
      renderSessionNetworkPanel(mount.id, mount.__campaignIpRaw, deps);
    });
    mount.addEventListener('click', function(evt){
      var button = evt.target && evt.target.closest ? evt.target.closest('[data-campaign-expand]') : null;
      if (!button) return;
      var campaignId = button.getAttribute('data-campaign-expand');
      var state = mount.__campaignIpState || {};
      var expanded = state.expanded || {};
      expanded[campaignId] = !expanded[campaignId];
      state.expanded = expanded;
      mount.__campaignIpState = state;
      renderSessionNetworkPanel(mount.id, mount.__campaignIpRaw, deps);
    });
  }

  function renderSessionNetworkPanel(mountId, rawApi, deps){
    var mount = document.getElementById(mountId || 'session-network-panel');
    if (!mount) return;
    var apiOn = useApiOn();
    var loaded = !!(deps && deps.loaded);
    var state = mount.__campaignIpState || { sortBy: 'risk', highRiskOnly: false, rotation: 'all', expanded: {} };
    mount.__campaignIpState = state;
    mount.__campaignIpRaw = rawApi;

    if (!apiOn && rawApi == null) {
      mount.innerHTML =
        '<div class="session-network-card">' +
        '<div class="session-network-head"><span class="session-network-title">Campaign IP Monitoring</span></div>' +
        '<p class="session-network-placeholder">IP monitoring is disabled.</p>' +
        '<p class="session-network-placeholder session-network-placeholder--sub">Enable API mode to load <code class="session-network-code">POST /admin/network/campaign-ips</code>.</p>' +
        '</div>';
      return;
    }
    if (!loaded) {
      mount.innerHTML =
        '<div class="session-network-card">' +
        '<div class="session-network-head"><span class="session-network-title">Campaign IP Monitoring</span></div>' +
        '<p class="session-network-placeholder">Loading campaign IP telemetry…</p>' +
        '</div>';
      return;
    }
    if (rawApi == null) {
      mount.innerHTML =
        '<div class="session-network-card">' +
        '<div class="session-network-head"><span class="session-network-title">Campaign IP Monitoring</span></div>' +
        '<p class="session-network-placeholder">Campaign IP data unavailable right now.</p>' +
        '</div>';
      return;
    }

    var campaigns = normalizeRawCampaigns(rawApi);
    var selectedCampaignId = deps && deps.selectedCampaignId ? String(deps.selectedCampaignId) : '';
    if (selectedCampaignId && campaigns.length) {
      var scoped = campaigns.filter(function(row){
        return String(row.campaignId) === selectedCampaignId;
      });
      campaigns = scoped.length ? scoped : campaigns;
    }

    var filtered = campaigns.filter(function(row){
      if (state.highRiskOnly && row.risk !== 'high') return false;
      if (state.rotation !== 'all' && row.ipRotation !== state.rotation) return false;
      return true;
    });
    var sorted = sortCampaigns(filtered, state.sortBy);
    var summary = getSummary(campaigns);
    emitRiskObservability(campaigns);
    campaigns.forEach(trackRiskMismatch);
    var driftAlerts = computeDriftAlerts(campaigns);
    var mostRecentCampaignId = '';
    var mostRecentTs = -1;
    sorted.forEach(function(row){
      var ts = parseTs(row && row.lastTs ? row.lastTs : '');
      if (!isNaN(ts) && ts > mostRecentTs) {
        mostRecentTs = ts;
        mostRecentCampaignId = row.campaignId;
      }
    });

    var rowsHtml = sorted.map(function(row){
      var isExpanded = !!(state.expanded && state.expanded[row.campaignId]);
      var ipRows = '';
      var maxCount = row.ips.reduce(function(acc, ipRow){ return Math.max(acc, toNum(ipRow && ipRow.count)); }, 0);
      var maxCountOccurrences = row.ips.filter(function(ipRow){ return toNum(ipRow && ipRow.count) === maxCount; }).length;
      var activeTaggedCount = 0;
      if (isExpanded) {
        ipRows = row.ips.map(function(ipRow){
          var loc = [ipRow.city, ipRow.countryCode].filter(Boolean).join(', ') || '—';
          var ipConfidence = row.confidence === 'high' ? 'high' : (row.confidence === 'low' ? 'low' : 'medium');
          var ipTitle = esc(deps, 'confidence: ' + ipConfidence + '; reasons: ' + ipRow.riskReasons.join(', '));
          var ipRisk = renderRiskBadge(ipRow.risky ? 'high' : 'healthy', ipTitle);
          var displayReasons = ipRow.riskReasons.filter(function(reason){ return reason !== 'LOW_SIGNAL'; });
          var chips = displayReasons.length ? ('<div class="campaign-ip-reasons">' + displayReasons.map(function(reason){
            return '<span class="campaign-ip-reason-chip">' + esc(deps, reason.replace(/_/g, ' ')) + '</span>';
          }).join('') + '</div>') : '';
          var ipTags = [];
          if (maxCountOccurrences === 1 && toNum(ipRow.count) === maxCount && maxCount > 0 && activeTaggedCount < 2) {
            ipTags.push('<span class="campaign-ip-tag">⭐ Most Active</span>');
            activeTaggedCount += 1;
          }
          return '<tr>' +
            '<td class="campaign-ip-cell--primary">' + esc(deps, ipRow.ip) + (ipTags.length ? ('<div class="campaign-ip-tags">' + ipTags.join('') + '</div>') : '') + '</td>' +
            '<td>' + esc(deps, loc) + '</td>' +
            '<td class="campaign-ip-cell--muted">' + esc(deps, ipRow.provider) + '</td>' +
            '<td class="campaign-ip-cell--muted">' + esc(deps, ipRow.mode) + '</td>' +
            '<td>' + esc(deps, String(ipRow.count)) + '</td>' +
            '<td>' + esc(deps, formatTimestamp(ipRow.lastTs)) + '</td>' +
            '<td>' + ipRisk + chips + '</td>' +
            '</tr>';
        }).join('');
        if (!ipRows) ipRows = '<tr><td colspan="7" class="session-history-empty">No IP rows for this campaign.</td></tr>';
      }
      var riskTitle = esc(deps, 'source: ' + row.riskSource + '; score: ' + row.riskScore.toFixed(1) + '; confidence: ' + row.confidence + '; reasons: ' + row.riskReasons.join(', '));
      var trendLabel = row.previousRiskScore == null ? '' : ((row.trendDelta >= 0 ? '+' : '') + row.trendDelta.toFixed(1));
      var rowDisplayReasons = row.riskReasons.filter(function(reason){ return reason !== 'LOW_SIGNAL'; });
      var rowReasonChips = rowDisplayReasons.length ? ('<div class="campaign-ip-reasons">' + rowDisplayReasons.map(function(reason){
        return '<span class="campaign-ip-reason-chip">' + esc(deps, reason.replace(/_/g, ' ')) + '</span>';
      }).join('') + '</div>') : '';
      var detailLabel = row.isPartial
        ? ('Top ' + row.ips.length + ' IPs (out of ' + row.ipsTotal + ')')
        : ('Showing all ' + row.ips.length + ' IPs');
      return '<tr class="campaign-ip-row">' +
        '<td><button type="button" class="campaign-ip-expand-btn" data-campaign-expand="' + esc(deps, row.campaignId) + '">' + (isExpanded ? 'Hide' : 'View') + '</button> ' + esc(deps, row.campaignId) + '</td>' +
        '<td>' + esc(deps, String(row.uniqueIps)) + '</td>' +
        '<td>' + esc(deps, String(row.events)) + '</td>' +
        '<td>' + renderModeBadge(row.ipRotation) + '</td>' +
        '<td>' + esc(deps, row.ipDiversityScore.toFixed(2)) + '</td>' +
        '<td>' + renderRiskBadge(row.risk, riskTitle) + rowReasonChips + (trendLabel ? ('<div class="campaign-ip-trend">Trend: ' + esc(deps, trendLabel) + '</div>') : '') + '</td>' +
        '<td>' + esc(deps, formatTimestamp(row.lastTs)) + '</td>' +
        '</tr>' +
        (isExpanded ? (
          '<tr class="campaign-ip-detail-row"><td colspan="7">' +
          (row.isPartial ? ('<div class="campaign-ip-partial-note">' + esc(deps, detailLabel) + '</div>') : '') +
          '<div class="session-history-scroll"><table class="session-history-table" role="grid">' +
          '<thead><tr><th>IP Address</th><th>Location</th><th>Provider</th><th>Mode</th><th>Usage Count</th><th>Last Used</th><th>Heuristic Risk</th></tr></thead>' +
          '<tbody>' + ipRows + '</tbody></table></div></td></tr>'
        ) : '');
    }).join('');

    if (!rowsHtml) {
      rowsHtml = '<tr><td colspan="7" class="session-history-empty">No campaigns match your filters.</td></tr>';
    }

    mount.innerHTML =
      '<div class="session-network-card campaign-ip-card">' +
      '<div class="session-network-head">' +
      '<span class="session-network-title">Campaign IP Monitoring Dashboard</span>' +
      '</div>' +
      (driftAlerts.length ? ('<div class="campaign-ip-drift-alerts">' + driftAlerts.map(function(msg){ return '<div class="campaign-ip-drift-alert">' + esc(deps, msg) + '</div>'; }).join('') + '</div>') : '') +
      '<div class="campaign-ip-summary">' +
      '<div class="campaign-ip-summary-item"><span>Total Campaigns</span><strong>' + esc(deps, String(summary.totalCampaigns)) + '</strong></div>' +
      '<div class="campaign-ip-summary-item"><span>' + renderInfoLabel(deps, 'Total Unique IPs', 'Total number of distinct IP addresses used.') + '</span><strong>' + esc(deps, String(summary.totalUniqueIps)) + '</strong></div>' +
      '<div class="campaign-ip-summary-item"><span>' + renderInfoLabel(deps, 'Avg IP Diversity Score', 'Average IP Diversity Score across campaigns. Used to understand overall IP usage health.') + '</span><strong>' + esc(deps, summary.avgDiversity.toFixed(2)) + '</strong></div>' +
      '<div class="campaign-ip-summary-item"><span>High Risk Campaigns</span><strong class="campaign-ip-text-risk">' + esc(deps, String(summary.highRisk)) + '</strong></div>' +
      '</div>' +
      '<div class="campaign-ip-controls">' +
      '<label class="campaign-ip-control">Sort by <select id="campaign-ip-sort"><option value="risk"' + (state.sortBy === 'risk' ? ' selected' : '') + '>Risk</option><option value="events"' + (state.sortBy === 'events' ? ' selected' : '') + '>Events</option><option value="unique_ips"' + (state.sortBy === 'unique_ips' ? ' selected' : '') + '>Unique IPs</option></select></label>' +
      '<label class="campaign-ip-control"><input type="checkbox" id="campaign-ip-filter-risk"' + (state.highRiskOnly ? ' checked' : '') + '> Show only High Heuristic Risk</label>' +
      '<label class="campaign-ip-control">IP rotation <select id="campaign-ip-filter-rotation"><option value="all"' + (state.rotation === 'all' ? ' selected' : '') + '>All</option><option value="dynamic"' + (state.rotation === 'dynamic' ? ' selected' : '') + '>Dynamic</option><option value="static"' + (state.rotation === 'static' ? ' selected' : '') + '>Static</option></select></label>' +
      '</div>' +
      '<div class="session-history-scroll"><table class="session-history-table" role="grid">' +
      '<thead><tr><th>Campaign ID</th><th>Unique IPs</th><th>Events</th><th>IP Rotation</th><th>' + renderInfoLabel(deps, 'IP Diversity Score', 'IP Diversity Score = Unique IPs / Total Events. Higher means better distribution; lower means more IP reuse.') + '</th><th>Heuristic Risk</th><th>Last Active</th></tr></thead>' +
      '<tbody>' + rowsHtml + '</tbody></table></div>' +
      '</div>';

    attachHandlers(mount, deps);
  }

  global.AppSessionNetworkPanel = {
    renderSessionNetworkPanel: renderSessionNetworkPanel
  };
})(window);
