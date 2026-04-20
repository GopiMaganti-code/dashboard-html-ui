;(function(global){
  var ENV_CONFIG = {
    dev: 'https://dev-heyr-api.wyra.ai',
    qa: 'https://qa-heyr-api.wyra.ai',
    stage: 'https://stage-heyr-api.wyra.ai',
    prod: 'https://heyr-v2.wyra.ai'
  };
  var DEFAULT_ENV = 'dev';
  var BASE_URL = ENV_CONFIG[DEFAULT_ENV];

  function buildQuery(params){
    if (!params || typeof params !== 'object') return '';
    var qs = new URLSearchParams();
    Object.keys(params).forEach(function(k){
      var v = params[k];
      if (v === undefined || v === null || v === '') return;
      qs.set(k, String(v));
    });
    var s = qs.toString();
    return s ? ('?' + s) : '';
  }

  function trimTrailingSlash(url){
    return String(url || '').replace(/\/+$/, '');
  }

  function resolveBaseUrl(env){
    if (global.AppConfig && typeof global.AppConfig.resolveApiOrigin === 'function') {
      var resolved = global.AppConfig.resolveApiOrigin(env);
      if (resolved) return trimTrailingSlash(resolved);
    }
    if (global.AppConfig && typeof global.AppConfig.apiOrigin === 'string' && global.AppConfig.apiOrigin.trim()) {
      return trimTrailingSlash(global.AppConfig.apiOrigin);
    }
    if (global.AppConfig && typeof global.AppConfig.apiHost === 'string' && global.AppConfig.apiHost.trim()) {
      return trimTrailingSlash(global.AppConfig.apiHost);
    }
    return trimTrailingSlash(BASE_URL);
  }

  function resolveUrl(path, env){
    var p = String(path || '');
    if (/^https?:\/\//i.test(p)) return p;
    if (!p) return resolveBaseUrl(env);
    if (p.charAt(0) !== '/') p = '/' + p;
    return resolveBaseUrl(env) + p;
  }

  function request(method, path, body, options){
    var opts = options || {};
    var headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
    var init = { method: method, headers: headers };
    if (body != null) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    var url = resolveUrl(path, opts.environment);
    return fetch(url, init).then(function(res){
      if (!res.ok) throw new Error('API Error: ' + res.status);
      return res.json();
    });
  }

  function get(path, params, options){
    return request('GET', path + buildQuery(params), null, options);
  }

  function post(path, body, options){
    return request('POST', path, body, options);
  }

  global.AppApiClient = {
    get: get,
    post: post,
    resolveUrl: resolveUrl,
    getBaseUrl: resolveBaseUrl,
    ENV_CONFIG: ENV_CONFIG
  };
})(window);
