;(function(global){
  var DEFAULT_TIMEOUT_MS = 3000;

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

  function withTimeout(promise, ms){
    return new Promise(function(resolve, reject){
      var done = false;
      var timer = setTimeout(function(){
        if (done) return;
        done = true;
        reject(new Error('API timeout'));
      }, ms);
      promise.then(function(v){
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(v);
      }).catch(function(err){
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  function request(method, path, body, options){
    var opts = options || {};
    var timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;
    var headers = Object.assign({ 'Accept': 'application/json' }, opts.headers || {});
    var init = { method: method, headers: headers };
    if (body != null) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(body);
    }
    return withTimeout(fetch(path, init), timeoutMs).then(function(res){
      if (!res.ok) throw new Error('API ' + res.status + ' for ' + path);
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
    post: post
  };
})(window);
