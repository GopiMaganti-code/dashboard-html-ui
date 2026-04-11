;(function(global){
  function getLogger(){
    return global.AppLogger && typeof global.AppLogger.info === 'function' ? global.AppLogger : null;
  }

  function useApiEnabled(){
    try {
      return !!(global.AppConfig && global.AppConfig.useApi);
    } catch (e) {
      return false;
    }
  }

  function hasIntegration(){
    return global.AppApiIntegration &&
      typeof global.AppApiIntegration.postRun === 'function' &&
      typeof global.AppApiIntegration.getRuns === 'function';
  }

  /**
   * POST /api/v1/runs — persist a single run (acceptance or messages check).
   * @param {{ type: string, campaign_id: string, payload: object }} envelope
   */
  function persistRun(envelope){
    if (!useApiEnabled() || !hasIntegration()) {
      if (getLogger()) getLogger().debug('RUN_TRACKING_SKIP_API', { reason: 'api_disabled_or_client_missing', type: envelope && envelope.type });
      return Promise.resolve(null);
    }
    var body = {
      type: envelope.type,
      campaign_id: envelope.campaign_id,
      occurred_at: new Date().toISOString(),
      payload: envelope.payload || {}
    };
    return global.AppApiIntegration.postRun(body).then(function(res){
      if (getLogger()) getLogger().info('RUN_PERSIST_OK', { type: body.type, campaign_id: body.campaign_id });
      return res;
    }).catch(function(err){
      if (global.AppLogger && typeof global.AppLogger.warn === 'function') {
        global.AppLogger.warn('RUN_PERSIST_ERR', { message: err && err.message ? err.message : String(err) });
      }
      return null;
    });
  }

  /**
   * GET /api/v1/runs — optional hydration for dashboard (merges with local state by caller).
   */
  function fetchRuns(params){
    if (!useApiEnabled() || !hasIntegration()) return Promise.resolve(null);
    return global.AppApiIntegration.getRuns(params || {}).catch(function(){
      return null;
    });
  }

  global.AppRunTrackingService = {
    persistRun: persistRun,
    fetchRuns: fetchRuns
  };
})(window);
