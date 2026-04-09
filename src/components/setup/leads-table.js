;(function(global){
  function normalizeLeadStatus(status){
    var raw = String(status || '').trim().toLowerCase();
    if (!raw) return { label: 'Pending', cls: 'campaign-status-badge--inactive', row: 'inactive' };
    if (raw === 'connected' || raw === 'active' || raw === 'accepted') {
      return { label: 'Connected', cls: 'campaign-status-badge--active', row: 'active' };
    }
    if (raw === 'replied' || raw === 'contacted' || raw === 'responded') {
      return { label: 'Replied', cls: 'campaign-status-badge--contacted', row: 'contacted' };
    }
    if (raw === 'failed' || raw === 'error' || raw === 'stopped') {
      return { label: 'Failed', cls: 'campaign-status-badge--stopped', row: 'stopped' };
    }
    return { label: 'Pending', cls: 'campaign-status-badge--inactive', row: 'inactive' };
  }

  function getInitials(name){
    var safe = String(name || '').trim();
    if (!safe) return 'NA';
    var parts = safe.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
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

  function mapLeadRowsFromCampaigns(campaigns){
    var out = [];
    (campaigns || []).forEach(function(campaign){
      var sourceLeads = Array.isArray(campaign && campaign.leads) ? campaign.leads : [];
      sourceLeads.forEach(function(lead){
        var statusMeta = normalizeLeadStatus(lead && (lead.status || lead.leadStatus));
        out.push({
          campaignId: campaign && campaign.campaignId ? String(campaign.campaignId) : '',
          campaignName: campaign && (campaign.campaignName || campaign.name) ? String(campaign.campaignName || campaign.name) : '—',
          organization: lead && (lead.organization || lead.company || campaign.organization || campaign.companyName) ? String(lead.organization || lead.company || campaign.organization || campaign.companyName) : '—',
          prospectName: lead && (lead.name || lead.prospectName || lead.leadName) ? String(lead.name || lead.prospectName || lead.leadName) : 'Unknown Prospect',
          company: lead && (lead.company || lead.companyName || campaign.companyName) ? String(lead.company || lead.companyName || campaign.companyName) : '—',
          aiSdr: lead && (lead.aiSdrEmail || lead.owner || campaign.aiSdrEmail) ? String(lead.aiSdrEmail || lead.owner || campaign.aiSdrEmail) : '—',
          statusLabel: statusMeta.label,
          statusClass: statusMeta.cls,
          rowClass: statusMeta.row,
          detailKey: 'connections-sent'
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
        var statusMeta = normalizeLeadStatus(row && row.status);
        var campaign = campaignByIndex[idx % Math.max(campaignByIndex.length, 1)] || {};
        rows.push({
          campaignId: campaign.campaignId ? String(campaign.campaignId) : '',
          campaignName: campaign.campaignName || campaign.name || '—',
          organization: row && row.company ? String(row.company) : (campaign.companyName || campaign.organization || '—'),
          prospectName: prospectName,
          company: row && row.company ? String(row.company) : (campaign.companyName || '—'),
          aiSdr: campaign.aiSdrEmail || '—',
          statusLabel: statusMeta.label,
          statusClass: statusMeta.cls,
          rowClass: statusMeta.row,
          detailKey: key
        });
      });
    });
    return rows;
  }

  function renderLeadRows(rows){
    return rows.map(function(row){
      var campaignLabel = row.campaignName || '—';
      var campaignMeta = row.campaignId ? String(row.campaignId) : '—';
      var initials = getInitials(row.prospectName);
      var detailKey = row.detailKey || 'connections-sent';
      var rowCls = 'campaign-row--' + escapeAttr(row.rowClass || 'inactive') + ' lead-row';
      return '<tr class="' + rowCls + '" data-detail-key="' + escapeAttr(detailKey) + '">' +
        '<td data-label="Campaign"><span class="campaign-id-name clamp-1">' + escapeHtml(campaignLabel) + '</span><span class="campaign-id-sub clamp-1">' + escapeHtml(campaignMeta) + '</span></td>' +
        '<td data-label="Organization"><span class="clamp-1">' + escapeHtml(row.organization || '—') + '</span></td>' +
        '<td data-label="Prospect"><div class="lead-name-cell"><div class="avatar lead-avatar" aria-hidden="true">' + escapeHtml(initials) + '</div><span class="clamp-1">' + escapeHtml(row.prospectName || '—') + '</span></div></td>' +
        '<td data-label="Company"><span class="clamp-1">' + escapeHtml(row.company || '—') + '</span></td>' +
        '<td data-label="AI SDR"><span class="campaign-monospace clamp-1">' + escapeHtml(row.aiSdr || '—') + '</span></td>' +
        '<td data-label="Status"><span class="campaign-status-badge ' + escapeAttr(row.statusClass || 'campaign-status-badge--inactive') + '">' + escapeHtml(row.statusLabel || 'Pending') + '</span></td>' +
      '</tr>';
    }).join('');
  }

  function renderLeadsTable(input){
    var tbody = document.getElementById('leads-setup-tbody');
    var emptyEl = document.getElementById('leads-setup-empty');
    var emptyMsg = document.getElementById('leads-setup-empty-msg');
    var tableEl = document.getElementById('leads-setup-table');
    if (!tbody || !emptyEl) return;

    var campaigns = input && Array.isArray(input.campaigns) ? input.campaigns : [];
    var dataMap = input && input.dataMap ? input.dataMap : null;
    var rows = mapLeadRowsFromCampaigns(campaigns);
    if (!rows.length) rows = mapLeadRowsFromDataMap(dataMap, campaigns);

    var q = (input && input.searchQuery ? String(input.searchQuery) : '').trim().toLowerCase();
    if (q) {
      rows = rows.filter(function(row){
        return (row.campaignName + ' ' + row.campaignId + ' ' + row.organization + ' ' + row.prospectName + ' ' + row.company + ' ' + row.aiSdr + ' ' + row.statusLabel)
          .toLowerCase().indexOf(q) >= 0;
      });
    }
    var statusFilter = input && input.statusFilter ? String(input.statusFilter).toLowerCase() : 'all';
    if (statusFilter !== 'all') {
      rows = rows.filter(function(row){
        return String(row.statusLabel || '').toLowerCase() === statusFilter;
      });
    }

    if (!rows.length) {
      tbody.innerHTML = '';
      if (emptyMsg) emptyMsg.textContent = 'No leads found.';
      emptyEl.hidden = false;
      if (tableEl) tableEl.setAttribute('aria-hidden', 'true');
      return;
    }

    emptyEl.hidden = true;
    if (tableEl) tableEl.removeAttribute('aria-hidden');
    tbody.innerHTML = renderLeadRows(rows);
  }

  function bindLeadsTableClicks(deps){
    var tbody = document.getElementById('leads-setup-tbody');
    if (!tbody || tbody.getAttribute('data-delegate-bound') === '1') return;
    tbody.setAttribute('data-delegate-bound', '1');
    tbody.addEventListener('click', function(e){
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
