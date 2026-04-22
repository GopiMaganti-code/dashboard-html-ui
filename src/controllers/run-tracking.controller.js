(function (global) {
  function initDashboardRunTracking(deps) {
    if (
      !global.AppRunTrackingPanel ||
      typeof global.AppRunTrackingPanel.renderRunTrackingPanels !== "function"
    )
      return;
    var autoAcceptanceTriggered = false;
    var autoMessagesTriggered = false;

    function render() {
      global.AppRunTrackingPanel.renderRunTrackingPanels({
        getRecentRows: deps.getRecentRows,
        getAcceptanceRun: deps.getAcceptanceRun,
        getMessagesRun: deps.getMessagesRun,
        isAcceptanceRunning: deps.isAcceptanceRunning,
        isMessagesRunning: deps.isMessagesRunning,
        statusPill: deps.statusPill,
      });
      var aBtn = document.getElementById("dashboard-acceptance-run-btn");
      if (aBtn) aBtn.addEventListener("click", onRunAcceptance);
    }

    function onRunAcceptance() {
      if (deps.isAcceptanceRunning()) return;
      deps.setAcceptanceRunning(true);
      deps.log("ACCEPTANCE_RUN_START", { campaign_id: deps.getCampaignId() });
      render();
      deps
        .runAcceptance()
        .then(function (run) {
          deps.saveAcceptanceRun(run);
          if (
            global.AppRunTrackingService &&
            typeof global.AppRunTrackingService.persistRun === "function"
          ) {
            global.AppRunTrackingService.persistRun({
              type: "acceptance",
              campaign_id: deps.getCampaignId(),
              payload: run,
            });
          }
          if (run.status === "failed") deps.pushFailure("acceptance_run", run);
          deps.log("ACCEPTANCE_RUN_END", {
            campaign_id: run.campaign_id,
            status: run.status,
            accepted_count: run.accepted_count,
            new_reference_node: run.new_reference_node,
          });
        })
        .catch(function (err) {
          var run = deps.makeFailedAcceptanceRun(
            err && err.message ? err.message : "Acceptance run failed.",
          );
          deps.saveAcceptanceRun(run);
          deps.pushFailure("acceptance_run", run);
          deps.log("ACCEPTANCE_RUN_END", {
            campaign_id: run.campaign_id,
            status: run.status,
            accepted_count: run.accepted_count,
            new_reference_node: run.new_reference_node,
          });
        })
        .finally(function () {
          deps.setAcceptanceRunning(false);
          render();
        });
    }

    function triggerAcceptanceAutoSync() {
      if (autoAcceptanceTriggered) return;
      autoAcceptanceTriggered = true;
      if (
        typeof deps.shouldAutoRunAcceptance === "function" &&
        !deps.shouldAutoRunAcceptance()
      )
        return;
      onRunAcceptance();
    }

    function triggerMessagesAutoSync() {
      if (autoMessagesTriggered) return;
      autoMessagesTriggered = true;
      if (
        typeof deps.shouldAutoRunMessages === "function" &&
        !deps.shouldAutoRunMessages()
      )
        return;
      onRunMessages();
    }

    function onRunMessages() {
      if (deps.isMessagesRunning()) return;
      deps.setMessagesRunning(true);
      deps.log("MESSAGES_RUN_START", { campaign_id: deps.getCampaignId() });
      render();
      deps
        .runMessages()
        .then(function (run) {
          deps.saveMessagesRun(run);
          if (
            global.AppRunTrackingService &&
            typeof global.AppRunTrackingService.persistRun === "function"
          ) {
            global.AppRunTrackingService.persistRun({
              type: "messages",
              campaign_id: deps.getCampaignId(),
              payload: run,
            });
          }
          if (run.status === "failed") deps.pushFailure("messages_run", run);
          deps.log("MESSAGES_RUN_END", {
            campaign_id: run.campaign_id,
            status: run.status,
            leads_processed: run.leads_processed,
            replies_detected: run.replies_detected,
            failed_count: run.failed_count,
          });
        })
        .catch(function (err) {
          var run = deps.makeFailedMessagesRun(
            err && err.message ? err.message : "Messages run failed.",
          );
          deps.saveMessagesRun(run);
          deps.pushFailure("messages_run", run);
          deps.log("MESSAGES_RUN_END", {
            campaign_id: run.campaign_id,
            status: run.status,
            leads_processed: run.leads_processed,
            replies_detected: run.replies_detected,
            failed_count: run.failed_count,
          });
        })
        .finally(function () {
          deps.setMessagesRunning(false);
          render();
        });
    }

    render();
    triggerAcceptanceAutoSync();
    triggerMessagesAutoSync();
  }

  global.AppRunTrackingController = {
    initDashboardRunTracking: initDashboardRunTracking,
  };
})(window);
