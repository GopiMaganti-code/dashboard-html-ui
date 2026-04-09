;(function(global){
  function nowIso(){
    return new Date().toISOString();
  }

  function makeReferenceNode(campaignId){
    var seed = String(campaignId || 'campaign').replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    var ts = Date.now().toString(36);
    return 'ref_' + seed + '_' + ts;
  }

  function simulateAcceptanceRun(input){
    return new Promise(function(resolve){
      var startedAt = nowIso();
      var rows = Array.isArray(input && input.rows) ? input.rows : [];
      var acceptedRows = rows.filter(function(r){
        return String(r && r.status || '').toLowerCase() === 'accepted';
      });
      var delay = 650 + Math.floor(Math.random() * 350);
      setTimeout(function(){
        var run = {
          run_id: 'run_' + Date.now().toString(36),
          campaign_id: input && input.campaign_id ? String(input.campaign_id) : '',
          status: acceptedRows.length > 0 ? 'success' : 'failed',
          started_at: startedAt,
          completed_at: nowIso(),
          accepted_count: acceptedRows.length,
          accepted_profiles: acceptedRows.map(function(r){
            return {
              profile_url: r.url || '',
              accepted_at: r.time || '',
              name: r.name || ''
            };
          }),
          new_reference_node: acceptedRows.length > 0 ? makeReferenceNode(input && input.campaign_id) : '',
          error_message: acceptedRows.length > 0 ? '' : 'No accepted connections found in this run.'
        };
        resolve(run);
      }, delay);
    });
  }

  global.AppAcceptanceRunService = {
    simulateAcceptanceRun: simulateAcceptanceRun
  };
})(window);
