;(function(global){
  function initAcceptanceRun(deps){
    if (!global.AppAcceptanceRunPanel || typeof global.AppAcceptanceRunPanel.renderAcceptanceRunPanel !== 'function') return;

    function render(){
      global.AppAcceptanceRunPanel.renderAcceptanceRunPanel({
        getState: function(){
          return {
            lastRun: deps.getLastRun(),
            running: deps.isRunning()
          };
        }
      });
      var btn = document.getElementById('acceptance-run-btn');
      if (btn) btn.addEventListener('click', onRunClick);
    }

    function onRunClick(){
      if (deps.isRunning()) return;
      deps.setRunning(true);
      deps.log('ACCEPTANCE_RUN_START', { campaign_id: deps.getCampaignId() });
      render();
      deps.runCheck().then(function(run){
        deps.saveRun(run);
        deps.log('ACCEPTANCE_RUN_END', {
          campaign_id: run.campaign_id,
          status: run.status,
          accepted_count: run.accepted_count,
          new_reference_node: run.new_reference_node
        });
        if (run.status === 'failed') deps.pushFailure(run);
      }).catch(function(err){
        var failedRun = deps.makeFailedRun(err && err.message ? err.message : 'Acceptance run failed.');
        deps.saveRun(failedRun);
        deps.pushFailure(failedRun);
        deps.log('ACCEPTANCE_RUN_END', {
          campaign_id: failedRun.campaign_id,
          status: failedRun.status,
          accepted_count: failedRun.accepted_count,
          new_reference_node: failedRun.new_reference_node
        });
      }).finally(function(){
        deps.setRunning(false);
        render();
      });
    }

    render();
  }

  global.AppAcceptanceRunController = {
    initAcceptanceRun: initAcceptanceRun
  };
})(window);
