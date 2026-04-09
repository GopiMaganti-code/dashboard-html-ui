;(function(global){
  function initSetupForm(deps){
    var email = document.getElementById('setup-email');
    var err = document.getElementById('setup-email-error');
    var hint = document.getElementById('setup-env-hint');
    var btn = document.getElementById('setup-continue');
    var segments = document.querySelectorAll('#env-selector .env-segment');
    if (!email || !btn || !err || !hint) return;
    deps.ensureCampaignsSeed();
    var session = deps.getAppState();
    var partial = deps.loadAppStateRaw() || {};
    email.value = session.aiSdrEmail || partial.aiSdrEmail || '';
    var envPref = session.environment || partial.environment || '';
    global.setupSelectedEnv = (envPref && deps.envOptions.indexOf(envPref) >= 0) ? envPref : '';
    segments.forEach(function(seg){
      var on = seg.getAttribute('data-env') === global.setupSelectedEnv;
      seg.classList.toggle('is-selected', on);
      seg.setAttribute('aria-checked', on ? 'true' : 'false');
    });
    function validateEmailField(){
      var v = (email.value || '').trim();
      if (!v) { err.textContent = 'Email is required.'; return false; }
      if (!deps.isValidEmail(v)) { err.textContent = 'Enter a valid email address.'; return false; }
      err.textContent = '';
      return true;
    }
    function updateContinueState(){
      var v = (email.value || '').trim();
      var okEmail = v && deps.isValidEmail(v);
      hint.textContent = global.setupSelectedEnv ? '' : 'Please select an environment.';
      if (v && !deps.isValidEmail(v)) { err.textContent = 'Enter a valid email address.'; }
      else if (!v) { err.textContent = ''; }
      else if (deps.isValidEmail(v)) { err.textContent = ''; }
      btn.disabled = global.__setupContinueInFlight || !(okEmail && global.setupSelectedEnv);
    }

    // Step 3A: rendering extraction with legacy fallback.
    function renderCampaignTable(){
      if (global.AppSetupCampaignTable && typeof global.AppSetupCampaignTable.renderCampaignSetupTable === 'function') {
        return global.AppSetupCampaignTable.renderCampaignSetupTable({
          ensureCampaignsSeed: deps.ensureCampaignsSeed,
          getCampaignsSorted: deps.getCampaignsSorted,
          filterCampaigns: deps.filterCampaigns,
          buildCampaignRowHtml: deps.buildCampaignRowHtml
        });
      }
      return deps.renderCampaignSetupTable();
    }

    function readTabState(){
      return global.__setupActiveTab === 'leads' ? 'leads' : 'campaigns';
    }

    function setSetupTab(tabName){
      var tab = tabName === 'leads' ? 'leads' : 'campaigns';
      global.__setupActiveTab = tab;
      var campaignsBtn = document.getElementById('setup-tab-campaigns');
      var leadsBtn = document.getElementById('setup-tab-leads');
      var campaignsPanel = document.getElementById('setup-tabpanel-campaigns');
      var leadsPanel = document.getElementById('setup-tabpanel-leads');
      if (campaignsBtn) {
        campaignsBtn.classList.toggle('is-active', tab === 'campaigns');
        campaignsBtn.setAttribute('aria-selected', tab === 'campaigns' ? 'true' : 'false');
      }
      if (leadsBtn) {
        leadsBtn.classList.toggle('is-active', tab === 'leads');
        leadsBtn.setAttribute('aria-selected', tab === 'leads' ? 'true' : 'false');
      }
      if (campaignsPanel) campaignsPanel.hidden = tab !== 'campaigns';
      if (leadsPanel) leadsPanel.hidden = tab !== 'leads';
      if (tab === 'campaigns') renderCampaignTable();
      else renderLeadsTable();
    }

    function renderLeadsTable(){
      if (!global.AppLeadsTable || typeof global.AppLeadsTable.renderLeadsTable !== 'function') return Promise.resolve();
      var status = global.__setupLeadsStatusFilter || 'all';
      var search = global.__campaignSetupSearchQuery || '';
      return deps.getLeadTableData().then(function(payload){
        global.AppLeadsTable.renderLeadsTable({
          campaigns: payload && Array.isArray(payload.campaigns) ? payload.campaigns : [],
          dataMap: payload && payload.dataMap ? payload.dataMap : null,
          searchQuery: search,
          statusFilter: status
        });
      }).catch(function(){
        if (typeof deps.showGlobalError === 'function') deps.showGlobalError('Failed to load leads from API. Showing fallback data.');
        global.AppLeadsTable.renderLeadsTable({
          campaigns: deps.getCampaignsSorted(),
          dataMap: global.DATA || null,
          searchQuery: search,
          statusFilter: status
        });
      });
    }

    // Step 3B: click binding extraction with legacy fallback.
    function bindCampaignTableClicks(){
      if (global.AppSetupCampaignTable && typeof global.AppSetupCampaignTable.bindCampaignSetupTableClicks === 'function') {
        return global.AppSetupCampaignTable.bindCampaignSetupTableClicks({
          monitorCampaign: deps.monitorCampaign
        });
      }
      return deps.bindCampaignSetupTableClicks();
    }

    function bindLeadsTableClicks(){
      if (!global.AppLeadsTable || typeof global.AppLeadsTable.bindLeadsTableClicks !== 'function') return;
      global.AppLeadsTable.bindLeadsTableClicks({
        showDetail: deps.showDetail
      });
    }

    function bindSetupTabs(){
      if (global.__setupTabsBound) return;
      global.__setupTabsBound = true;
      var campaignsBtn = document.getElementById('setup-tab-campaigns');
      var leadsBtn = document.getElementById('setup-tab-leads');
      if (campaignsBtn) campaignsBtn.addEventListener('click', function(){ setSetupTab('campaigns'); });
      if (leadsBtn) leadsBtn.addEventListener('click', function(){ setSetupTab('leads'); });
    }

    // Step 3C: filter/search binding extraction with legacy fallback.
    function bindFilterAndSearchListeners(){
      if (!global.__campaignFilterListenersBound){
        global.__campaignFilterListenersBound = true;
        document.querySelectorAll('#campaign-status-filters .campaign-filter-chip').forEach(function(chip){
          chip.addEventListener('click', function(){
            var f = chip.getAttribute('data-filter') || 'all';
            global.__campaignSetupFilter = f;
            global.__setupLeadsStatusFilter = String(f || '').toLowerCase();
            document.querySelectorAll('#campaign-status-filters .campaign-filter-chip').forEach(function(c){
              c.classList.toggle('is-active', c === chip);
            });
            if (readTabState() === 'leads') renderLeadsTable();
            else renderCampaignTable();
          });
        });
        var search = document.getElementById('campaign-search-input');
        if (search) {
          search.addEventListener('input', function(){
            global.__campaignSetupSearchQuery = (search.value || '').trim();
            if (readTabState() === 'leads') renderLeadsTable();
            else renderCampaignTable();
          });
        }
      }
    }

    function resetFilterState(){
      if (global.AppSetupCampaignTable && typeof global.AppSetupCampaignTable.resetCampaignFilterState === 'function') {
        return global.AppSetupCampaignTable.resetCampaignFilterState();
      }
      global.__campaignSetupFilter = 'all';
      global.__campaignSetupSearchQuery = '';
      var searchInput = document.getElementById('campaign-search-input');
      if (searchInput) searchInput.value = '';
      document.querySelectorAll('#campaign-status-filters .campaign-filter-chip').forEach(function(c){
        var f = c.getAttribute('data-filter') || '';
        c.classList.toggle('is-active', f === 'all');
      });
    }
    if (!global.__setupListenersBound){
      global.__setupListenersBound = true;
      segments.forEach(function(seg){
        seg.addEventListener('click', function(){
          global.setupSelectedEnv = seg.getAttribute('data-env') || '';
          segments.forEach(function(s){
            var on = s === seg;
            s.classList.toggle('is-selected', on);
            s.setAttribute('aria-checked', on ? 'true' : 'false');
          });
          updateContinueState();
        });
      });
      email.addEventListener('input', function(){
        if ((email.value || '').trim() && !deps.isValidEmail((email.value || '').trim())) {
          err.textContent = 'Enter a valid email address.';
        } else { err.textContent = ''; }
        updateContinueState();
      });
      email.addEventListener('blur', validateEmailField);
      btn.addEventListener('click', function(){
        if (btn.disabled) return;
        if (!validateEmailField() || !global.setupSelectedEnv) return;
        global.__setupContinueInFlight = true;
        btn.classList.add('is-loading');
        btn.setAttribute('aria-busy', 'true');
        updateContinueState();
        var existing = deps.getAppState();
        var nextStatus = 'Active';
        if (existing.campaignStatus === 'Inactive') nextStatus = 'Inactive';
        setTimeout(function(){
          deps.saveAppState({
            aiSdrEmail: email.value.trim(),
            environment: global.setupSelectedEnv,
            campaignStatus: nextStatus,
            activeCampaignId: ''
          });
          deps.applyAppStateToHeaders();
          deps.showAppScreen('screen-dashboard');
          if (!deps.hasActivityChart()) {
            deps.bootChartsAndFailed();
          } else {
            deps.renderFailedActions();
            deps.resizeActivityChart();
          }
          global.__setupContinueInFlight = false;
          btn.classList.remove('is-loading');
          btn.setAttribute('aria-busy', 'false');
          updateContinueState();
        }, 420);
      });
    }
    bindFilterAndSearchListeners();
    bindSetupTabs();
    resetFilterState();
    bindCampaignTableClicks();
    bindLeadsTableClicks();
    setSetupTab(readTabState());
    updateContinueState();
  }

  global.AppSetupController = {
    initSetupForm: initSetupForm
  };
})(window);
