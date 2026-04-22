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

  /**
   * Campaign setup APIs.
   * Unified endpoint:
   * - Empty email: POST /orch/campaign/list?env=...
   * - With email:  POST /orch/campaign/list?env=...  (email in body)
   * Environment is sent as query `env` and header `X-Environment`.
   */
  function normalizeCampaignListStatus(st){
    var allowed = { all: 1, paused: 1, completed: 1, closed: 1, active: 1 };
    var k = String(st || '').trim().toLowerCase();
    return allowed[k] ? k : 'all';
  }

  function getSetupCampaigns(params){
    var p = params || {};
    var email = typeof p.email === 'string' ? p.email.trim() : '';
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var status = normalizeCampaignListStatus(p.status);
    var path = '/orch/campaign/list';
    var qs = env ? ('?env=' + encodeURIComponent(env)) : '';
    var url = path + qs;
    var payload = {
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : '',
      status: status,
      limit: 200
    };
    if (email) payload.email = email;
    var headers = env ? { 'X-Environment': env } : {};
    if (global.AppConfig && global.AppConfig.useApi && typeof console !== 'undefined' && typeof console.log === 'function') {
      var urlForLog = (global.AppApiClient && typeof global.AppApiClient.resolveUrl === 'function')
        ? global.AppApiClient.resolveUrl(url, env)
        : url;
      console.log('[API] Fetching campaigns:', { email: email, env: env, status: status, url: urlForLog, method: 'POST' });
    }
    return global.AppApiClient.post(url, payload, { headers: headers, environment: env });
  }

  function normalizeLeadsCampaignStatus(st){
    var allowed = { all: 1, paused: 1, completed: 1, closed: 1, active: 1 };
    var k = String(st || '').trim().toLowerCase();
    return allowed[k] ? k : 'all';
  }

  /**
   * Leads listing for setup leads tab (paginated).
   * POST /orch/campaign/leads-all
   */
  function getCampaignLeadsAll(params){
    var p = params || {};
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var status = normalizeLeadsCampaignStatus(p.campaign_status);
    var runStatus = typeof p.run_status === 'string' ? String(p.run_status).trim().toLowerCase() : '';
    if (runStatus !== 'pending' && runStatus !== 'waiting' && runStatus !== 'connected') runStatus = '';
    var search = typeof p.search === 'string' ? p.search.trim() : '';
    var limit = Number.isFinite(p.limit) ? Math.max(1, Math.min(200, Math.floor(p.limit))) : 50;
    var offset = Number.isFinite(p.offset) ? Math.max(0, Math.floor(p.offset)) : 0;
    var path = '/orch/campaign/leads-all';
    var qs = env ? ('?env=' + encodeURIComponent(env)) : '';
    var url = path + qs;
    var payload = {
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : '',
      campaign_status: status,
      limit: limit,
      offset: offset
    };
    if (runStatus) payload.run_status = runStatus;
    if (search) payload.search = search;
    var headers = env ? { 'X-Environment': env } : {};
    if (global.AppConfig && global.AppConfig.useApi && typeof console !== 'undefined' && typeof console.log === 'function') {
      var urlForLog = (global.AppApiClient && typeof global.AppApiClient.resolveUrl === 'function')
        ? global.AppApiClient.resolveUrl(url, env)
        : url;
      console.log('[API] Fetching leads-all:', {
        env: env,
        campaign_status: status,
        run_status: runStatus || '(none)',
        search: search || '(none)',
        limit: limit,
        offset: offset,
        url: urlForLog,
        method: 'POST'
      });
    }
    return global.AppApiClient.post(url, payload, { headers: headers, environment: env });
  }

  /**
   * Campaign detail metrics for dashboard top cards.
   * POST /orch/campaign/detail?env=...
   */
  function getCampaignDetail(params){
    var p = params || {};
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var email = typeof p.email === 'string' ? p.email.trim() : '';
    var campaignId = p.campaign_id != null ? String(p.campaign_id).trim() : '';
    var path = '/orch/campaign/detail';
    var qs = env ? ('?env=' + encodeURIComponent(env)) : '';
    var url = path + qs;
    var payload = {
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : '',
      campaign_id: campaignId
    };
    if (email) payload.email = email;
    var headers = env ? { 'X-Environment': env } : {};
    return global.AppApiClient.post(url, payload, { headers: headers, environment: env });
  }

  /**
   * Profile health monitoring summary for dashboard health section.
   * POST /orch/profile-health?env=...
   */
  function getProfileHealth(params){
    var p = params || {};
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var email = typeof p.email === 'string' ? p.email.trim() : '';
    var campaignId = p.campaign_id != null ? String(p.campaign_id).trim() : '';
    var path = '/orch/profile-health';
    var qs = env ? ('?env=' + encodeURIComponent(env)) : '';
    var url = path + qs;
    var payload = {
      email: email,
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : '',
      probe_live_session: false,
      include_action_breakdown: true
    };
    if (campaignId) payload.campaign_id = campaignId;
    var headers = env ? { 'X-Environment': env } : {};
    return global.AppApiClient.post(url, payload, { headers: headers, environment: env });
  }

  /**
   * Campaign IP monitoring feed for admin dashboard.
   * POST /admin/network/campaign-ips?env=...
   */
  function getCampaignIps(params){
    var p = params || {};
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var email = typeof p.email === 'string' ? p.email.trim() : '';
    var limit = Number.isFinite(p.limit) ? Math.max(1, Math.min(500, Math.floor(p.limit))) : null;
    var offset = Number.isFinite(p.offset) ? Math.max(0, Math.floor(p.offset)) : null;
    var path = '/admin/network/campaign-ips';
    var qs = env ? ('?env=' + encodeURIComponent(env)) : '';
    var url = path + qs;
    var payload = {
      email: email,
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : ''
    };
    if (limit != null) payload.limit = limit;
    if (offset != null) payload.offset = offset;
    var headers = env ? { 'X-Environment': env } : {};
    return global.AppApiClient.post(url, payload, { headers: headers, environment: env });
  }

  /**
   * Campaign activity feed for engagement drill-down.
   * POST /orch/campaign/activity-all?env=...
   */
  function getCampaignActivityAll(params){
    var p = params || {};
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var email = typeof p.email === 'string' ? p.email.trim() : '';
    var action = typeof p.action === 'string' ? p.action.trim() : '';
    var campaignId = p.campaign_id != null ? String(p.campaign_id).trim() : '';
    var limit = Number.isFinite(p.limit) ? Math.max(1, Math.min(500, Math.floor(p.limit))) : 100;
    var offset = Number.isFinite(p.offset) ? Math.max(0, Math.floor(p.offset)) : 0;
    var includeTimeline = p.include_timeline === true;
    var includeDebug = p.include_debug === true;
    var path = '/orch/campaign/activity-all';
    var qs = env ? ('?env=' + encodeURIComponent(env)) : '';
    var url = path + qs;
    var payload = {
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : '',
      email: email,
      action: action,
      campaign_id: campaignId,
      limit: limit,
      offset: offset,
      include_timeline: includeTimeline,
      include_debug: includeDebug
    };
    var headers = env ? { 'X-Environment': env } : {};
    return global.AppApiClient.post(url, payload, { headers: headers, environment: env });
  }

  /**
   * Acceptance secondary action run check.
   * POST /admin/campaign/secondary-actions/run-acceptance-check?env=...
   */
  function runAcceptanceCheck(params){
    var p = params || {};
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var email = typeof p.email === 'string' ? p.email.trim() : '';
    var campaignId = p.campaign_id != null ? String(p.campaign_id).trim() : '';
    var path = '/admin/campaign/secondary-actions/run-acceptance-check';
    var qs = env ? ('?env=' + encodeURIComponent(env)) : '';
    var url = path + qs;
    var payload = {
      email: email,
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : '',
      campaign_id: campaignId
    };
    var headers = env ? { 'X-Environment': env } : {};
    return global.AppApiClient.post(url, payload, { headers: headers, environment: env });
  }

  /**
   * Messages secondary action run check.
   * POST /admin/campaign/secondary-actions/run-messages-check?env=...
   */
  function runMessagesCheck(params){
    var p = params || {};
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var email = typeof p.email === 'string' ? p.email.trim() : '';
    var campaignId = p.campaign_id != null ? String(p.campaign_id).trim() : '';
    var path = '/admin/campaign/secondary-actions/run-messages-check';
    var qs = env ? ('?env=' + encodeURIComponent(env)) : '';
    var url = path + qs;
    var payload = {
      email: email,
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : '',
      campaign_id: campaignId
    };
    var headers = env ? { 'X-Environment': env } : {};
    return global.AppApiClient.post(url, payload, { headers: headers, environment: env });
  }

  /**
   * Failed action screenshots DB feed for monitoring panel.
   * GET /admin/screenshots/db?token=...&limit=...&user_id=...&campaign_id=...
   */
  function getFailedActionsScreenshotsDb(params){
    var p = params || {};
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var email = typeof p.email === 'string' ? p.email.trim() : '';
    var campaignId = p.campaign_id != null ? String(p.campaign_id).trim() : '';
    var limit = Number.isFinite(p.limit) ? Math.max(1, Math.min(200, Math.floor(p.limit))) : 100;
    var path = '/admin/screenshots/db';
    var query = {
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : '',
      limit: limit,
      user_id: email
    };
    if (campaignId) query.campaign_id = campaignId;
    var headers = env ? { 'X-Environment': env } : {};
    return global.AppApiClient.get(path, query, { headers: headers, environment: env });
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

  /**
   * Inbox messages feed for Communication -> Messages section.
   * POST /orch/inbox-messages?env=...
   */
  function getInboxMessages(params){
    var p = params || {};
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var email = typeof p.email === 'string' ? p.email.trim() : '';
    var campaignId = p.campaign_id != null ? String(p.campaign_id).trim() : '';
    var page = Number.isFinite(p.page) ? Math.max(1, Math.floor(p.page)) : 1;
    var pageSize = Number.isFinite(p.page_size) ? Math.max(1, Math.min(200, Math.floor(p.page_size))) : 20;
    var path = '/orch/inbox-messages';
    var qs = env ? ('?env=' + encodeURIComponent(env)) : '';
    var url = path + qs;
    var payload = {
      email: email,
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : '',
      page: page,
      page_size: pageSize
    };
    if (campaignId) payload.campaign_id = campaignId;
    var headers = env ? { 'X-Environment': env } : {};
    return global.AppApiClient.post(url, payload, { headers: headers, environment: env });
  }

  /**
   * Queued messages for Communication -> Messages section.
   * POST /orch/campaign/queued-messages?env=...
   */
  function getCampaignQueuedMessages(params){
    var p = params || {};
    var env = typeof p.env === 'string' ? p.env.trim() : '';
    var email = typeof p.email === 'string' ? p.email.trim() : '';
    var campaignId = p.campaign_id != null ? String(p.campaign_id).trim() : '';
    var page = Number.isFinite(p.page) ? Math.max(1, Math.floor(p.page)) : 1;
    var pageSize = Number.isFinite(p.page_size) ? Math.max(1, Math.min(200, Math.floor(p.page_size))) : 20;
    var path = '/orch/campaign/queued-messages';
    var qs = env ? ('?env=' + encodeURIComponent(env)) : '';
    var url = path + qs;
    var payload = {
      email: email,
      token: (global.AppConfig && global.AppConfig.campaignListToken) ? global.AppConfig.campaignListToken : '',
      page: page,
      page_size: pageSize
    };
    if (campaignId) payload.campaign_id = campaignId;
    var headers = env ? { 'X-Environment': env } : {};
    return global.AppApiClient.post(url, payload, { headers: headers, environment: env });
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
    getSetupCampaigns: getSetupCampaigns,
    getOverview: safe(getOverview),
    getDetail: safe(getDetail),
    getConversations: safe(getConversations),
    getInboxMessages: getInboxMessages,
    getCampaignQueuedMessages: getCampaignQueuedMessages,
    sendMessage: safe(sendMessage),
    getCampaignLeadsAll: getCampaignLeadsAll,
    getCampaignDetail: getCampaignDetail,
    getProfileHealth: getProfileHealth,
    getCampaignIps: getCampaignIps,
    getCampaignActivityAll: getCampaignActivityAll,
    runAcceptanceCheck: runAcceptanceCheck,
    runMessagesCheck: runMessagesCheck,
    getFailedActionsScreenshotsDb: getFailedActionsScreenshotsDb,
    getFailedActionDetail: safe(getFailedActionDetail),
    postRun: safe(postRun),
    getRuns: safe(getRuns),
    getSessionInfo: safe(getSessionInfo)
  };
})(window);
