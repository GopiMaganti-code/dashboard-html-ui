;(function(global){
  function getLogger(){
    if (global.AppLogger && typeof global.AppLogger.info === 'function') return global.AppLogger;
    return null;
  }

  function hasClient(){
    return global.AppApiClient && typeof global.AppApiClient.get === 'function' && typeof global.AppApiClient.post === 'function';
  }

  function useApiEnabled(){
    try {
      if (!global.AppConfig) return false;
      return !!global.AppConfig.useApi;
    } catch (e) {
      return false;
    }
  }

  function baseUrl(){
    if (global.AppConfig && typeof global.AppConfig.apiBaseUrl === 'string' && global.AppConfig.apiBaseUrl.trim()) {
      return global.AppConfig.apiBaseUrl.replace(/\/+$/, '');
    }
    return '/api/v1';
  }

  function safe(fn){
    return function(){
      var logger = getLogger();
      if (!useApiEnabled()) {
        if (logger) logger.info('API_TOGGLE', { message: 'API disabled, using dummy fallback' });
        return Promise.resolve(null);
      }
      if (!hasClient()) return Promise.resolve(null);
      return fn.apply(null, arguments).catch(function(){
        return null;
      });
    };
  }

  function getCampaigns(params){
    return global.AppApiClient.get(baseUrl() + '/campaigns', params || {});
  }

  function getOverview(params){
    return global.AppApiClient.get(baseUrl() + '/overview', params || {});
  }

  function getDetail(metricKey, params){
    return global.AppApiClient.get(baseUrl() + '/details/' + encodeURIComponent(metricKey), params || {});
  }

  function getConversations(params){
    return global.AppApiClient.get(baseUrl() + '/conversations', params || {});
  }

  function sendMessage(conversationId, payload){
    return global.AppApiClient.post(baseUrl() + '/conversations/' + encodeURIComponent(conversationId) + '/messages', payload || {});
  }

  function getFailedActionDetail(id){
    return global.AppApiClient.get(baseUrl() + '/failed-actions/' + encodeURIComponent(id), {});
  }

  function postRun(body){
    return global.AppApiClient.post(baseUrl() + '/runs', body || {});
  }

  function getRuns(params){
    return global.AppApiClient.get(baseUrl() + '/runs', params || {});
  }

  /**
   * Session & network telemetry (LinkedIn automation monitoring).
   * GET /api/v1/session-info?campaign_id=...
   *
   * Expected JSON (all fields optional; frontend normalizes snake_case and camelCase):
   * {
   *   connection_ip, current_ip, previous_ip, ip_changed,
   *   connection_at | first_connection_at | initial_login_at,
   *   location: { city, country },
   *   connection_location: { city, country },
   *   country_changed,
   *   isp_type | asn_type,
   *   ip_history: [{ at, ip, city, country, isp_type }]
   * }
   */
  function getSessionInfo(params){
    return global.AppApiClient.get(baseUrl() + '/session-info', params || {});
  }

  global.AppApiIntegration = {
    getCampaigns: safe(getCampaigns),
    getOverview: safe(getOverview),
    getDetail: safe(getDetail),
    getConversations: safe(getConversations),
    sendMessage: safe(sendMessage),
    getFailedActionDetail: safe(getFailedActionDetail),
    postRun: safe(postRun),
    getRuns: safe(getRuns),
    getSessionInfo: safe(getSessionInfo)
  };
})(window);
