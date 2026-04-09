;(function(global){
  var PREFIX = 'ff_';
  var DEFAULT_FLAGS = {
    useModularUtils: false,
    useModularHeader: false,
    useModularSetup: false,
    useModularDashboard: false,
    useModularDetail: false,
    useModularMessages: false,
    useSplitStyles: false
  };

  function normalizeBoolean(value){
    if (typeof value === 'boolean') return value;
    var v = String(value || '').trim().toLowerCase();
    return v === '1' || v === 'true' || v === 'yes' || v === 'on';
  }

  function hasOwn(obj, key){
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function getQueryOverride(flagName){
    try {
      var params = new URLSearchParams(global.location && global.location.search ? global.location.search : '');
      var key = PREFIX + flagName;
      if (!params.has(key)) return null;
      return normalizeBoolean(params.get(key));
    } catch (e) {
      return null;
    }
  }

  function getStorageOverride(flagName){
    try {
      if (!global.localStorage) return null;
      var raw = global.localStorage.getItem(PREFIX + flagName);
      if (raw == null) return null;
      return normalizeBoolean(raw);
    } catch (e) {
      return null;
    }
  }

  function resolveFlag(flagName){
    if (!hasOwn(DEFAULT_FLAGS, flagName)) return false;
    var q = getQueryOverride(flagName);
    if (q !== null) return q;
    var s = getStorageOverride(flagName);
    if (s !== null) return s;
    return DEFAULT_FLAGS[flagName];
  }

  function getAll(){
    var out = {};
    Object.keys(DEFAULT_FLAGS).forEach(function(k){
      out[k] = resolveFlag(k);
    });
    return out;
  }

  function setStorageOverride(flagName, enabled){
    if (!hasOwn(DEFAULT_FLAGS, flagName)) return false;
    try {
      if (!global.localStorage) return false;
      global.localStorage.setItem(PREFIX + flagName, enabled ? '1' : '0');
      return true;
    } catch (e) {
      return false;
    }
  }

  function clearStorageOverride(flagName){
    if (!hasOwn(DEFAULT_FLAGS, flagName)) return false;
    try {
      if (!global.localStorage) return false;
      global.localStorage.removeItem(PREFIX + flagName);
      return true;
    } catch (e) {
      return false;
    }
  }

  global.AppFeatureFlags = {
    defaults: Object.assign({}, DEFAULT_FLAGS),
    list: function(){ return getAll(); },
    isEnabled: function(flagName){ return resolveFlag(flagName); },
    setOverride: function(flagName, enabled){ return setStorageOverride(flagName, !!enabled); },
    clearOverride: function(flagName){ return clearStorageOverride(flagName); }
  };
})(window);
