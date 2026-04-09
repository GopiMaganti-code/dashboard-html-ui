;(function(global){
  var FAILED_ACTIONS = [
    {
      lead: 'angela-game-257158301',
      reason: 'Connection limit reached',
      timestamp: '6/4/2026 · 6:22 PM',
      screenshot_url: 'https://picsum.photos/seed/healing-fail1/960/540',
      logs: '[2026-04-06T12:52:01.102Z] INFO  runId=rn_8k3m session=campaign_69cf8f action=like_post\n[2026-04-06T12:52:01.889Z] DEBUG nav https://www.linkedin.com/feed\n[2026-04-06T12:52:03.441Z] DEBUG selector resolved primary=.feed-identity-module\n[2026-04-06T12:52:05.201Z] WARN  rateGuard: slotWait 420ms (tier=standard)\n[2026-04-06T12:52:06.003Z] INFO  graphql POST /voyager/api/graphql (200) 184ms\n[2026-04-06T12:52:07.771Z] ERROR action blocked: CONNECTION_LIMIT_REACHED\n    at assertBudget (healing/budget.js:112)\n    at beforeInvoke (runner/step.js:45)\n    at runStep (runner/step.js:80)\n[2026-04-06T12:52:07.772Z] INFO  teardown: screenshots[1] traceId=tr_91fa2bff\n[2026-04-06T12:52:07.900Z] INFO  run finished status=FAILED reason=connection_limit'
    },
    {
      lead: 'joe-prince-bartachano',
      reason: 'Profile not accessible',
      timestamp: '6/4/2026 · 6:05 PM',
      screenshot_url: 'https://picsum.photos/seed/healing-fail2/960/540',
      logs: '[2026-04-06T12:35:10.001Z] INFO  runId=rn_2p9q action=view_profile target=joe-prince-bartachano\n{\n  "profile": "urn:li:fsd_profile:JoePrince",\n  "visibility": "NETWORK"\n}\n[2026-04-06T12:35:11.554Z] DEBUG GET /in/joe-prince-bartachano-530b5115a/ → 403\n[2026-04-06T12:35:11.555Z] ERROR PROFILE_NOT_ACCESSIBLE\n    Response: Private profile or blocked viewer context.\n[2026-04-06T12:35:11.600Z] WARN  HealingEngine: fallback selectors skipped (policy=strict)'
    },
    {
      lead: 'andrea-glindenew-368',
      reason: 'Rate limit — skipped',
      timestamp: '6/4/2026 · 6:04 PM',
      screenshot_url: '',
      logs: ''
    },
    {
      lead: 'jonathan-capucci-ccm',
      reason: 'Message delivery failed',
      timestamp: '6/4/2026 · 5:13 PM',
      screenshot_url: 'https://picsum.photos/seed/healing-fail4/960/540',
      logs: '(this line would load from the server in production)',
      logsSimulateFetchError: true
    }
  ];

  function getFailedActions(){
    return FAILED_ACTIONS;
  }

  function failedActionLogsAvailable(item){
    if (!item) return false;
    if (item.logsSimulateFetchError) return true;
    return !!(item.logs && String(item.logs).trim());
  }

  function fetchFailedActionLogs(item){
    return new Promise(function(resolve, reject){
      var delay = 480 + Math.floor(Math.random() * 380);
      setTimeout(function(){
        if (item.logsSimulateFetchError){
          reject(new Error('Unable to load execution logs from the server.'));
          return;
        }
        var text = item.logs != null ? String(item.logs) : '';
        if (!text.trim()) reject(new Error('No logs available for this action.'));
        else resolve(text);
      }, delay);
    });
  }

  global.AppFailedActionsService = {
    getFailedActions: getFailedActions,
    failedActionLogsAvailable: failedActionLogsAvailable,
    fetchFailedActionLogs: fetchFailedActionLogs
  };
})(window);
