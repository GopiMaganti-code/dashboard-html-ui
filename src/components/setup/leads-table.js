;(function(global){
  var PAGE_LIMIT = 50;
  var leadsState = {
    rows: [],
    offset: 0,
    hasMore: true,
    loading: false,
    error: '',
    initialized: false,
    queryKey: '',
    observer: null
  };

  function mapRunStatus(status){
    var raw = String(status || '').trim().toLowerCase();
    if (raw === 'pending') {
      return { label: 'Queued', cls: 'campaign-status-badge--queued', row: 'inactive' };
    }
    if (raw === 'waiting') {
      return { label: 'Waiting', cls: 'campaign-status-badge--contacted', row: 'contacted' };
    }
    if (raw === 'connected') {
      return { label: 'Completed', cls: 'campaign-status-badge--active', row: 'active' };
    }
    return { label: 'Waiting', cls: 'campaign-status-badge--contacted', row: 'contacted' };
  }

  function escapeHtml(s){
    if (global.AppUtilsEscape && typeof global.AppUtilsEscape.escapeHtml === 'function') {
      return global.AppUtilsEscape.escapeHtml(s);
    }
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(s){
    if (global.AppUtilsEscape && typeof global.AppUtilsEscape.escapeAttr === 'function') {
      return global.AppUtilsEscape.escapeAttr(s);
    }
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/\r|\n/g, ' ');
  }

  function normalizeProfileUrl(raw){
    var s = String(raw || '').trim();
    if (!s || s === '—') return '';
    if (/^https?:\/\//i.test(s)) return s;
    return 'https://' + s.replace(/^\/+/, '');
  }

  function getTrimmedLinkedInId(url){
    var full = String(url || '').trim();
    if (!full) return '—';
    var m = full.match(/^https?:\/\/(?:www\.)?linkedin\.com\/in\/([^/?#]+)\/?$/i);
    if (m && m[1]) return m[1];
    return full;
  }

  function mapLeadRowsFromCampaigns(campaigns){
    var out = [];
    (campaigns || []).forEach(function(campaign){
      var sourceLeads = Array.isArray(campaign && campaign.leads) ? campaign.leads : [];
      sourceLeads.forEach(function(lead){
        var statusMeta = mapRunStatus(lead && (lead.status || lead.leadStatus));
        out.push({
          campaignId: campaign && campaign.campaignId ? String(campaign.campaignId) : '',
          campaignName: campaign && (campaign.campaignName || campaign.name) ? String(campaign.campaignName || campaign.name) : '—',
          profileUrl: normalizeProfileUrl(lead && (lead.profileUrl || lead.profile_url || lead.linkedinUrl || lead.linkedin_url || lead.url)),
          aiSdr: lead && (lead.aiSdrEmail || lead.owner || campaign.aiSdrEmail) ? String(lead.aiSdrEmail || lead.owner || campaign.aiSdrEmail) : '—',
          statusLabel: statusMeta.label,
          statusClass: statusMeta.cls,
          rowClass: statusMeta.row,
          detailKey: 'connections-sent',
          rowKey: String((lead && (lead.run_id || lead.runId || lead.id)) || '') || [
            String(campaign && campaign.campaignId || ''),
            String(lead && (lead.profileUrl || lead.url || lead.name || '')),
            String(lead && (lead.created_at || lead.createdAt || ''))
          ].join('|')
        });
      });
    });
    return out;
  }

  function mapLeadRowsFromDataMap(dataMap, campaigns){
    var campaignByIndex = Array.isArray(campaigns) ? campaigns : [];
    var keys = ['connections-sent', 'messages-sent', 'accepted-profiles', 'recent-runs'];
    var seen = {};
    var rows = [];
    keys.forEach(function(key){
      var section = dataMap && dataMap[key];
      var source = section && Array.isArray(section.rows) ? section.rows : [];
      source.forEach(function(row, idx){
        var prospectName = row && row.name ? String(row.name) : 'Unknown Prospect';
        var dedupeKey = (prospectName + '|' + key).toLowerCase();
        if (seen[dedupeKey]) return;
        seen[dedupeKey] = true;
        var statusMeta = mapRunStatus(row && row.status);
        var campaign = campaignByIndex[idx % Math.max(campaignByIndex.length, 1)] || {};
        rows.push({
          campaignId: campaign.campaignId ? String(campaign.campaignId) : '',
          campaignName: campaign.campaignName || campaign.name || '—',
          profileUrl: normalizeProfileUrl(row && (row.url || row.profileUrl || row.profile_url || row.linkedinUrl || row.linkedin_url)),
          aiSdr: campaign.aiSdrEmail || '—',
          statusLabel: statusMeta.label,
          statusClass: statusMeta.cls,
          rowClass: statusMeta.row,
          detailKey: key,
          rowKey: String((row && (row.run_id || row.runId || row.id)) || '') || [
            String(campaign && campaign.campaignId || ''),
            String(row && (row.url || row.profileUrl || row.name || '')),
            String(row && (row.time || row.created_at || row.createdAt || ''))
          ].join('|')
        });
      });
    });
    return rows;
  }

  function mapLeadRowsFromApiResponse(resp){
    var list = Array.isArray(resp && resp.leads) ? resp.leads : [];
    return list.map(function(item, idx){
      var statusMeta = mapRunStatus(item && item.run_status);
      var fullUrl = normalizeProfileUrl(item && item.lead_url);
      return {
        campaignId: item && (item.campaign_id || item.campaignId) ? String(item.campaign_id || item.campaignId) : '—',
        campaignName: item && (item.campaign_name || item.campaignName || item.campaign_id || item.campaignId)
          ? String(item.campaign_name || item.campaignName || item.campaign_id || item.campaignId)
          : '—',
        profileUrl: fullUrl,
        aiSdr: item && (item.sender_email || item.senderEmail || item.ai_sdr_email || item.aiSdrEmail)
          ? String(item.sender_email || item.senderEmail || item.ai_sdr_email || item.aiSdrEmail)
          : '—',
        statusLabel: statusMeta.label,
        statusClass: statusMeta.cls,
        rowClass: statusMeta.row,
        detailKey: 'connections-sent',
        rowKey: String((item && (item.run_id || item.runId || item.id)) || '') || [
          String(item && (item.campaign_id || item.campaignId || '')),
          String(item && (item.lead_url || item.leadUrl || '')),
          String(item && (item.created_at || item.createdAt || idx))
        ].join('|')
      };
    });
  }

  function hasMoreFromApi(resp, fetchedCount){
    if (resp && typeof resp.has_more === 'boolean') return resp.has_more;
    if (resp && typeof resp.hasMore === 'boolean') return resp.hasMore;
    return fetchedCount >= PAGE_LIMIT;
  }

  function getControlsRoot(){
    var root = document.getElementById('leads-setup-controls');
    if (root) return root;
    var table = document.getElementById('leads-setup-table');
    if (!table || !table.parentElement) return null;
    root = document.createElement('div');
    root.id = 'leads-setup-controls';
    root.className = 'leads-controls';
    table.parentElement.insertAdjacentElement('afterend', root);
    return root;
  }

  function renderControls(){
    var root = getControlsRoot();
    if (!root) return;
    var show = leadsState.initialized;
    root.style.display = show ? '' : 'none';
    if (!show) return;
    var msg = '';
    if (leadsState.error) msg = '<span class="leads-controls-msg leads-controls-msg--error">' + escapeHtml(leadsState.error) + '</span>';
    else if (leadsState.loading) msg = '<span class="leads-controls-msg">Loading more leads...</span>';
    else if (!leadsState.hasMore) msg = '<span class="leads-controls-msg">No more leads</span>';
    root.innerHTML =
      '<div class="leads-controls-inner">' +
        msg +
        '<button type="button" class="btn leads-load-more" ' +
          (leadsState.loading || !leadsState.hasMore ? 'disabled' : '') +
          '>' + (leadsState.error ? 'Retry' : 'Load more') + '</button>' +
      '</div>' +
      '<div id="leads-load-sentinel" class="leads-load-sentinel" aria-hidden="true"></div>';

    var btn = root.querySelector('.leads-load-more');
    if (btn) {
      btn.addEventListener('click', function(){
        if (typeof root.__fetchMore === 'function') root.__fetchMore();
      });
    }
  }

  function attachObserver(fetchMore){
    var root = getControlsRoot();
    if (!root) return;
    root.__fetchMore = fetchMore;
    var sentinel = document.getElementById('leads-load-sentinel');
    var scrollWrap = document.querySelector('#setup-tabpanel-leads .campaign-table-scroll');
    if (!sentinel || !('IntersectionObserver' in global)) return;
    if (leadsState.observer) leadsState.observer.disconnect();
    leadsState.observer = new IntersectionObserver(function(entries){
      if (!entries || !entries[0] || !entries[0].isIntersecting) return;
      fetchMore();
    }, { root: scrollWrap || null, rootMargin: '120px 0px 120px 0px', threshold: 0.01 });
    leadsState.observer.observe(sentinel);
  }

  function renderLeadRows(rows){
    return rows.map(function(row){
      var campaignLabel = row.campaignName || '—';
      var campaignMeta = row.campaignId ? String(row.campaignId) : '—';
      var detailKey = row.detailKey || 'connections-sent';
      var rowCls = 'campaign-row--' + escapeAttr(row.rowClass || 'inactive') + ' lead-row';
      var fullUrl = normalizeProfileUrl(row.profileUrl);
      var trimmed = fullUrl ? getTrimmedLinkedInId(fullUrl) : '—';
      var prospectCell = fullUrl
        ? '<a class="lead-link clamp-1" href="' + escapeAttr(fullUrl) + '" target="_blank" rel="noopener noreferrer" title="' + escapeAttr(fullUrl) + '">' + escapeHtml(trimmed) + '</a>'
        : '<span class="lead-link--empty">—</span>';
      return '<tr class="' + rowCls + '" data-detail-key="' + escapeAttr(detailKey) + '" data-row-key="' + escapeAttr(row.rowKey || '') + '">' +
        '<td data-label="Campaign"><span class="campaign-id-name clamp-1">' + escapeHtml(campaignLabel) + '</span><span class="campaign-id-sub clamp-1">' + escapeHtml(campaignMeta) + '</span></td>' +
        '<td data-label="Prospect">' + prospectCell + '</td>' +
        '<td data-label="AI SDR"><span class="campaign-monospace clamp-1">' + escapeHtml(row.aiSdr || '—') + '</span></td>' +
        '<td data-label="Run Status"><span class="campaign-status-badge ' + escapeAttr(row.statusClass || 'campaign-status-badge--contacted') + '">' + escapeHtml(row.statusLabel || 'Waiting') + '</span></td>' +
      '</tr>';
    }).join('');
  }

  function filterRowsForSearch(rows, q){
    if (!q) return rows;
    var needle = String(q || '').trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(function(row){
      return (row.campaignName + ' ' + row.campaignId + ' ' + row.aiSdr + ' ' + row.statusLabel + ' ' + getTrimmedLinkedInId(row.profileUrl || ''))
        .toLowerCase().indexOf(needle) >= 0;
    });
  }

  function renderBodyRows(rows){
    var tbody = document.getElementById('leads-setup-tbody');
    if (!tbody) return;
    tbody.innerHTML = renderLeadRows(rows);
  }

  function renderEmptyOrRows(rows){
    var emptyEl = document.getElementById('leads-setup-empty');
    var emptyMsg = document.getElementById('leads-setup-empty-msg');
    var tableEl = document.getElementById('leads-setup-table');
    if (!emptyEl || !tableEl) return;
    if (!rows.length) {
      var msg = leadsState.error ? 'Failed to load leads. Click retry.' : 'No leads found.';
      if (emptyMsg) emptyMsg.textContent = msg;
      emptyEl.hidden = false;
      tableEl.setAttribute('aria-hidden', 'true');
      return;
    }
    emptyEl.hidden = true;
    tableEl.removeAttribute('aria-hidden');
    renderBodyRows(rows);
  }

  function renderLeadsTable(input){
    var tbody = document.getElementById('leads-setup-tbody');
    var emptyEl = document.getElementById('leads-setup-empty');
    if (!tbody || !emptyEl) return;

    var searchQuery = (input && typeof input.searchQuery === 'string') ? input.searchQuery : '';
    var apiFetcher = input && typeof input.apiLeadsFetcher === 'function' ? input.apiLeadsFetcher : null;
    var queryKey = [
      String(input && input.environment || ''),
      String(input && input.runStatusFilter || 'queued'),
      String(input && input.runStatusApi || 'pending'),
      String(searchQuery || '')
    ].join('|');

    if (apiFetcher) {
      if (leadsState.queryKey !== queryKey) {
        leadsState.rows = [];
        leadsState.offset = 0;
        leadsState.hasMore = true;
        leadsState.loading = false;
        leadsState.error = '';
        leadsState.initialized = false;
        leadsState.queryKey = queryKey;
      }

      function renderFromApiState(){
        var rows = filterRowsForSearch(leadsState.rows.slice(), searchQuery);
        renderEmptyOrRows(rows);
        renderControls();
      }

      function fetchMore(){
        if (leadsState.loading || !leadsState.hasMore) return Promise.resolve(false);
        leadsState.loading = true;
        leadsState.error = '';
        renderControls();
        return apiFetcher({ limit: PAGE_LIMIT, offset: leadsState.offset }).then(function(resp){
          if (!resp) throw new Error('Empty response');
          var mapped = mapLeadRowsFromApiResponse(resp);
          var existing = {};
          leadsState.rows.forEach(function(r){ existing[r.rowKey] = 1; });
          mapped.forEach(function(r){
            if (!existing[r.rowKey]) {
              existing[r.rowKey] = 1;
              leadsState.rows.push(r);
            }
          });
          leadsState.offset += PAGE_LIMIT;
          leadsState.hasMore = hasMoreFromApi(resp, mapped.length);
          leadsState.initialized = true;
          leadsState.loading = false;
          renderFromApiState();
          return true;
        }).catch(function(){
          leadsState.loading = false;
          leadsState.error = 'Could not load more leads.';
          leadsState.initialized = true;
          renderFromApiState();
          return false;
        });
      }

      renderFromApiState();
      renderControls();
      attachObserver(fetchMore);
      if (!leadsState.initialized) fetchMore();
      return;
    }

    // Fallback path (non-API)
    var campaigns = input && Array.isArray(input.campaigns) ? input.campaigns : [];
    var dataMap = input && input.dataMap ? input.dataMap : null;
    var rows = mapLeadRowsFromCampaigns(campaigns);
    if (!rows.length) rows = mapLeadRowsFromDataMap(dataMap, campaigns);
    rows = filterRowsForSearch(rows, searchQuery);
    var statusFilter = input && input.statusFilter ? String(input.statusFilter).toLowerCase() : 'all';
    if (statusFilter !== 'all') {
      rows = rows.filter(function(row){
        return String(row.statusLabel || '').toLowerCase() === statusFilter;
      });
    }
    leadsState.initialized = false;
    leadsState.error = '';
    renderEmptyOrRows(rows);
    var controls = getControlsRoot();
    if (controls) controls.style.display = 'none';
  }

  function bindLeadsTableClicks(deps){
    var tbody = document.getElementById('leads-setup-tbody');
    if (!tbody || tbody.getAttribute('data-delegate-bound') === '1') return;
    tbody.setAttribute('data-delegate-bound', '1');
    tbody.addEventListener('click', function(e){
      var link = e.target && e.target.closest && e.target.closest('a.lead-link');
      if (link && tbody.contains(link)) {
        e.stopPropagation();
        return;
      }
      var tr = e.target && e.target.closest && e.target.closest('tr[data-detail-key]');
      if (!tr || !tbody.contains(tr)) return;
      var key = tr.getAttribute('data-detail-key') || 'connections-sent';
      if (deps && typeof deps.showDetail === 'function') deps.showDetail(key);
    });
  }

  global.AppLeadsTable = {
    renderLeadsTable: renderLeadsTable,
    bindLeadsTableClicks: bindLeadsTableClicks
  };
})(window);
