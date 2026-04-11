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

  /** Normalize API or mixed input to ISO 8601 when possible. */
  function normalizeTimestampToIso(value){
    if (value == null || value === '') return '';
    var d = new Date(value);
    if (!isNaN(d.getTime())) return d.toISOString();
    return String(value);
  }

  /** Display ISO or parseable timestamps in locale form; pass through non-dates as-is. */
  function formatIsoForDisplay(iso){
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    try {
      return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return d.toISOString();
    }
  }

  global.AppUtilsFormatters = {
    normalizeCampaignStatus: normalizeCampaignStatus,
    formatCampaignCreatedAt: formatCampaignCreatedAt,
    normalizeTimestampToIso: normalizeTimestampToIso,
    formatIsoForDisplay: formatIsoForDisplay
  };
})(window);
