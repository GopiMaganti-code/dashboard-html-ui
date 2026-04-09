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

  global.AppApiIntegration = {
    getCampaigns: safe(getCampaigns),
    getOverview: safe(getOverview),
    getDetail: safe(getDetail),
    getConversations: safe(getConversations),
    sendMessage: safe(sendMessage),
    getFailedActionDetail: safe(getFailedActionDetail)
  };
})(window);
