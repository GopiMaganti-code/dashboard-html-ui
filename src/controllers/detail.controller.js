;(function(global){
  function renderNonMessageDetail(key, d, deps){
    const tableBlock = document.getElementById('detail-table-block');
    const inboxRoot = document.getElementById('detail-campaign-inbox');
    const fr = document.getElementById('filter-row');
    tableBlock.style.display = '';
    inboxRoot.style.display = 'none';
    inboxRoot.setAttribute('aria-hidden', 'true');
    fr.innerHTML = d.filters.map(f=>`<div class="filter-pill${f==='All'?' active':''}" onclick="setFilter('${f}',this)">${f}</div>`).join('');
    deps.renderTable(key,'All');
  }

  global.AppDetailController = {
    renderNonMessageDetail: renderNonMessageDetail
  };
})(window);
