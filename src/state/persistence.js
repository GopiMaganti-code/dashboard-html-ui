;(function(global){
  function loadAppStateRaw(storageKey){
    try {
      var raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  function saveAppState(storageKey, patch){
    var base = loadAppStateRaw(storageKey);
    if (!base || typeof base !== 'object') base = {};
    var merged = Object.assign({}, base, patch);
    localStorage.setItem(storageKey, JSON.stringify(merged));
  }

  function ensureCampaignsSeed(storageKey, seedCampaigns){
    var raw = loadAppStateRaw(storageKey) || {};
    if (!Array.isArray(raw.campaigns) || raw.campaigns.length === 0) {
      saveAppState(storageKey, { campaigns: seedCampaigns.slice() });
    }
  }

  function getAppState(storageKey, normalizeCampaignStatusFn){
    var s = loadAppStateRaw(storageKey);
    if (!s || typeof s !== 'object') {
      return { aiSdrEmail: '', environment: '', campaignStatus: 'Active', activeCampaignId: '', campaignDisplayLabel: '' };
    }
    var base = {
      aiSdrEmail: s.aiSdrEmail || '',
      environment: s.environment || '',
      campaignStatus: normalizeCampaignStatusFn(s.campaignStatus),
      activeCampaignId: s.activeCampaignId || '',
      campaignDisplayLabel: ''
    };
    if (base.activeCampaignId && Array.isArray(s.campaigns)) {
      var row = s.campaigns.find(function(c){ return c && c.campaignId === base.activeCampaignId; });
      if (row) {
        base.aiSdrEmail = row.aiSdrEmail || base.aiSdrEmail;
        base.environment = row.environment || base.environment;
        base.campaignStatus = normalizeCampaignStatusFn(row.status);
        base.campaignDisplayLabel = row.campaignName || row.name || '';
      }
    }
    return base;
  }

  global.AppStatePersistence = {
    loadAppStateRaw: loadAppStateRaw,
    saveAppState: saveAppState,
    ensureCampaignsSeed: ensureCampaignsSeed,
    getAppState: getAppState
  };
})(window);
