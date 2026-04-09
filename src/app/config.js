;(function(global){
  var DEFAULTS = {
    useApi: false,
    apiBaseUrl: '/api/v1'
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

  global.AppConfig = {
    useApi: !!resolved.value,
    apiBaseUrl: DEFAULTS.apiBaseUrl,
    source: resolved.source
  };
})(window);
