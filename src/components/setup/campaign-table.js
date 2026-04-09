;(function(global){
  function renderCampaignSetupTable(deps){
    var tbody = document.getElementById('campaign-setup-tbody');
    var emptyEl = document.getElementById('campaign-setup-empty');
    var emptyMsg = document.getElementById('campaign-setup-empty-msg');
    var tableEl = document.getElementById('campaign-setup-table');
    if (!tbody || !emptyEl) return;
    deps.ensureCampaignsSeed();
    var list = deps.getCampaignsSorted();
    var filtered = deps.filterCampaigns(list, global.__campaignSetupFilter, global.__campaignSetupSearchQuery);

    if (filtered.length === 0) {
      tbody.innerHTML = '';
      if (emptyMsg) emptyMsg.textContent = list.length === 0 ? 'No campaigns found.' : 'No campaigns match this filter.';
      emptyEl.hidden = false;
      if (tableEl) tableEl.setAttribute('aria-hidden', 'true');
      return;
    }
    emptyEl.hidden = true;
    if (tableEl) tableEl.removeAttribute('aria-hidden');

    tbody.innerHTML = filtered.map(function(c){
      return deps.buildCampaignRowHtml(c);
    }).join('');
  }

  function bindCampaignSetupTableClicks(deps){
    var tbody = document.getElementById('campaign-setup-tbody');
    if (!tbody || tbody.getAttribute('data-delegate-bound') === '1') return;
    tbody.setAttribute('data-delegate-bound', '1');
    tbody.addEventListener('click', function(e){
      var btn = e.target && e.target.closest && e.target.closest('.btn-monitor');
      if (!btn || !tbody.contains(btn)) return;
      var id = btn.getAttribute('data-campaign-id');
      if (id) deps.monitorCampaign(id);
    });
  }

  function bindCampaignFilterAndSearchListeners(deps){
    if (!global.__campaignFilterListenersBound){
      global.__campaignFilterListenersBound = true;
      document.querySelectorAll('#campaign-status-filters .campaign-filter-chip').forEach(function(chip){
        chip.addEventListener('click', function(){
          var f = chip.getAttribute('data-filter') || 'all';
          global.__campaignSetupFilter = f;
          document.querySelectorAll('#campaign-status-filters .campaign-filter-chip').forEach(function(c){
            c.classList.toggle('is-active', c === chip);
          });
          deps.renderCampaignSetupTable();
        });
      });
      var search = document.getElementById('campaign-search-input');
      if (search) {
        search.addEventListener('input', function(){
          global.__campaignSetupSearchQuery = (search.value || '').trim();
          deps.renderCampaignSetupTable();
        });
      }
    }
  }

  function resetCampaignFilterState(){
    global.__campaignSetupFilter = 'all';
    global.__campaignSetupSearchQuery = '';
    var searchInput = document.getElementById('campaign-search-input');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('#campaign-status-filters .campaign-filter-chip').forEach(function(c){
      var f = c.getAttribute('data-filter') || '';
      c.classList.toggle('is-active', f === 'all');
    });
  }

  global.AppSetupCampaignTable = {
    renderCampaignSetupTable: renderCampaignSetupTable,
    bindCampaignSetupTableClicks: bindCampaignSetupTableClicks,
    bindCampaignFilterAndSearchListeners: bindCampaignFilterAndSearchListeners,
    resetCampaignFilterState: resetCampaignFilterState
  };
})(window);
