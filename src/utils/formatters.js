;(function(global){
  function normalizeCampaignStatus(st){
    var u = String(st || '').trim();
    if (u === 'Inactive') return 'Inactive';
    if (u === 'Stopped') return 'Stopped';
    return 'Active';
  }

  function formatCampaignCreatedAt(iso){
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    try {
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return d.toISOString();
    }
  }

  global.AppUtilsFormatters = {
    normalizeCampaignStatus: normalizeCampaignStatus,
    formatCampaignCreatedAt: formatCampaignCreatedAt
  };
})(window);
