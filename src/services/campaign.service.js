;(function(global){
  function normalizeCampaignStatusLocal(st){
    if (global.AppUtilsFormatters && typeof global.AppUtilsFormatters.normalizeCampaignStatus === 'function') {
      return global.AppUtilsFormatters.normalizeCampaignStatus(st);
    }
    var u = String(st || '').trim();
    if (u === 'Inactive') return 'Inactive';
    if (u === 'Stopped') return 'Stopped';
    return 'Active';
  }

  function getCampaignsSorted(raw){
    var list = Array.isArray(raw && raw.campaigns) ? raw.campaigns.slice() : [];
    list.sort(function(a, b){
      var ta = new Date(a.createdAt || 0).getTime();
      var tb = new Date(b.createdAt || 0).getTime();
      return tb - ta;
    });
    return list;
  }

  function statusBadgeHtml(status){
    var st = normalizeCampaignStatusLocal(status);
    var cls = 'campaign-status-badge--active';
    var dot = 'campaign-status-dot--active';
    var label = 'Active';
    if (st === 'Inactive') { cls = 'campaign-status-badge--inactive'; dot = 'campaign-status-dot--inactive'; label = 'Inactive'; }
    if (st === 'Stopped') { cls = 'campaign-status-badge--stopped'; dot = 'campaign-status-dot--stopped'; label = 'Stopped'; }
    return '<span class="campaign-status-badge ' + cls + '"><span class="campaign-status-dot ' + dot + '" aria-hidden="true"></span>' + label + '</span>';
  }

  function filterCampaigns(list, activeFilter, searchQuery){
    var filtered = activeFilter === 'all'
      ? list
      : list.filter(function(c){ return normalizeCampaignStatusLocal(c.status) === activeFilter; });
    var q = (searchQuery || '').toLowerCase();
    if (q) {
      filtered = filtered.filter(function(c){
        var id = c.campaignId != null ? String(c.campaignId) : '';
        var name = c.campaignName || c.name || '';
        var email = c.aiSdrEmail || '';
        var env = c.environment || '';
        return (id + ' ' + name + ' ' + email + ' ' + env).toLowerCase().indexOf(q) >= 0;
      });
    }
    return filtered;
  }

  function buildCampaignRowHtml(c, helpers){
    var cid = (c.campaignId != null && c.campaignId !== '') ? String(c.campaignId) : '—';
    var name = c.campaignName || c.name || '';
    var email = c.aiSdrEmail ? String(c.aiSdrEmail) : '—';
    var env = c.environment ? String(c.environment) : '—';
    var iso = c.createdAt || '';
    var nameBlock = name
      ? '<span class="campaign-id-name">' + helpers.escapeHtml(name) + '</span><span class="campaign-id-sub">' + helpers.escapeHtml(cid) + '</span>'
      : '<span class="campaign-id-name">' + helpers.escapeHtml(cid) + '</span>';
    var idAttr = cid !== '—' ? helpers.escapeAttr(cid) : '';
    var monitorBtn = idAttr
      ? '<button type="button" class="btn-monitor" data-campaign-id="' + idAttr + '">Monitor</button>'
      : '<span class="campaign-monospace">—</span>';
    var rowCls = 'campaign-row--' + normalizeCampaignStatusLocal(c.status).toLowerCase();
    return '<tr class="' + rowCls + '">' +
      '<td data-label="Campaign">' + nameBlock + '</td>' +
      '<td data-label="AI SDR email"><span class="campaign-monospace">' + helpers.escapeHtml(email) + '</span></td>' +
      '<td data-label="Environment">' + helpers.escapeHtml(env) + '</td>' +
      '<td data-label="Status">' + helpers.statusBadgeHtml(c.status) + '</td>' +
      '<td data-label="Created">' + helpers.escapeHtml(helpers.formatCampaignCreatedAt(iso)) + '</td>' +
      '<td data-label="Actions">' + monitorBtn + '</td>' +
      '</tr>';
  }

  function monitorCampaign(campaignId, deps){
    if (campaignId == null || campaignId === '') return;
    deps.ensureCampaignsSeed();
    var raw = deps.loadAppStateRaw() || {};
    var list = Array.isArray(raw.campaigns) ? raw.campaigns : [];
    var row = list.find(function(c){ return c && String(c.campaignId) === String(campaignId); });
    if (!row) return;
    var st = normalizeCampaignStatusLocal(row.status);
    deps.saveAppState({
      activeCampaignId: String(row.campaignId),
      aiSdrEmail: row.aiSdrEmail || raw.aiSdrEmail || '',
      environment: row.environment || raw.environment || '',
      campaignStatus: st
    });
    deps.applyAppStateToHeaders();
    deps.showAppScreen('screen-dashboard');
    if (!deps.hasActivityChart()) {
      deps.bootChartsAndFailed();
    } else {
      deps.renderFailedActions();
      deps.resizeActivityChart();
    }
  }

  global.AppCampaignService = {
    getCampaignsSorted: getCampaignsSorted,
    statusBadgeHtml: statusBadgeHtml,
    filterCampaigns: filterCampaigns,
    buildCampaignRowHtml: buildCampaignRowHtml,
    monitorCampaign: monitorCampaign
  };
})(window);
