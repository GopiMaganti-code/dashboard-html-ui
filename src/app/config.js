;(function(global){
  var APP_STORAGE_KEY = 'linkedinCampaignSetup_v1';
  var DEFAULTS = {
    useApi: false,
    apiBaseUrl: '/api/v1',
    apiOrigin: 'https://dev-heyr-api.wyra.ai',
    campaignListToken: 'uB8GxrXyWqTgJHqLQeXjJxXHqJ5pV2y6Yp7WfQ9mTqA',
    apiOriginsByEnvironment: {
      Dev: 'https://dev-heyr-api.wyra.ai',
      QA: 'https://qa-heyr-api.wyra.ai',
      Stage: 'https://stage-heyr-api.wyra.ai',
      Prod: 'https://heyr-v2.wyra.ai'
    }
  };

  function normalizeBoolean(value){
    if (typeof value === 'boolean') return value;
    var v = String(value || '').trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes' || v === 'on') return true;
    if (v === 'false' || v === '0' || v === 'no' || v === 'off') return false;
    return null;
  }

  function getQueryOverride(){
    try {
      var params = new URLSearchParams(global.location && global.location.search ? global.location.search : '');
      if (!params.has('useApi')) return null;
      var parsed = normalizeBoolean(params.get('useApi'));
      if (parsed === null) return null;
      return { value: parsed, source: 'query' };
    } catch (e) {
      return null;
    }
  }

  function getStorageOverride(){
    try {
      if (!global.localStorage) return null;
      var raw = global.localStorage.getItem('useApi');
      if (raw == null) return null;
      var parsed = normalizeBoolean(raw);
      if (parsed === null) return null;
      return { value: parsed, source: 'localStorage' };
    } catch (e) {
      return null;
    }
  }

  function resolveUseApi(){
    var q = getQueryOverride();
    if (q) return q;
    var s = getStorageOverride();
    if (s) return s;
    return { value: DEFAULTS.useApi, source: 'default' };
  }

  var resolved = resolveUseApi();

  function normalizeEnvironment(value){
    var v = String(value || '').trim().toLowerCase();
    if (v === 'dev') return 'Dev';
    if (v === 'qa') return 'QA';
    if (v === 'stage') return 'Stage';
    if (v === 'prod' || v === 'production') return 'Prod';
    return '';
  }

  function getStoredEnvironment(){
    try {
      if (!global.localStorage) return '';
      var raw = global.localStorage.getItem(APP_STORAGE_KEY);
      if (!raw) return '';
      var parsed = JSON.parse(raw);
      return normalizeEnvironment(parsed && parsed.environment);
    } catch (e) {
      return '';
    }
  }

  function resolveApiOrigin(env){
    var key = normalizeEnvironment(env) || getStoredEnvironment();
    if (key && DEFAULTS.apiOriginsByEnvironment[key]) return DEFAULTS.apiOriginsByEnvironment[key];
    return DEFAULTS.apiOrigin;
  }

  global.AppConfig = {
    useApi: !!resolved.value,
    apiBaseUrl: DEFAULTS.apiBaseUrl,
    apiOrigin: DEFAULTS.apiOrigin,
    campaignListToken: DEFAULTS.campaignListToken,
    apiOriginsByEnvironment: DEFAULTS.apiOriginsByEnvironment,
    resolveApiOrigin: resolveApiOrigin,
    source: resolved.source
  };
})(window);
