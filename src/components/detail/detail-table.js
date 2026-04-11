;(function(global){
  function formatDisplayTime(t){
    if (t == null || t === '') return '—';
    var s = String(t);
    if (global.AppUtilsFormatters && typeof global.AppUtilsFormatters.formatIsoForDisplay === 'function' && /^\d{4}-\d{2}-\d{2}T/.test(s)) {
      return global.AppUtilsFormatters.formatIsoForDisplay(s);
    }
    return s;
  }

  function renderTable(key, filter, deps){
    const d = deps.dataMap[key];
    const rows = filter === 'All' ? d.rows : d.rows.filter(r => r.status.toLowerCase() === filter.toLowerCase());
    const thead = document.getElementById('lead-thead');
    const tbody = document.getElementById('lead-tbody');
    thead.innerHTML = '<tr>' + d.cols.map(c=>`<th>${c}</th>`).join('') + '</tr>';
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td class="empty-state" colspan="' + d.cols.length + '"><div class="empty-state-inner"><div class="empty-state-icon" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>No rows match this filter. Try another pill above.</div></td></tr>';
      return;
    }
    tbody.innerHTML = rows.map(r => {
      const nameCell = `<div class="lead-name-cell"><div class="avatar" style="background:${r.color};color:${r.textColor};">${r.initials}</div><span>${r.name}</span></div>`;
      const urlCell = `<a class="url-link" href="https://${r.url}" target="_blank" rel="noopener noreferrer">${r.url}</a>`;
      let extra = '';
      if(d.cols.length === 5) extra = `<td>${r.action}</td><td>${deps.statusPill(r.status)}</td><td style="color:var(--color-text-secondary)">${formatDisplayTime(r.time)}</td>`;
      else if(d.cols.length === 4 && d.cols[2]==='Sent at') extra = `<td style="color:var(--color-text-secondary)">${formatDisplayTime(r.time)}</td><td>${deps.statusPill(r.status)}</td>`;
      else if(d.cols.length === 4 && d.cols[2]==='Viewed at') extra = `<td style="color:var(--color-text-secondary)">${formatDisplayTime(r.time)}</td><td>${deps.statusPill(r.status)}</td>`;
      else if(d.cols.length === 4 && d.cols[2]==='Post liked at') extra = `<td style="color:var(--color-text-secondary)">${formatDisplayTime(r.time)}</td><td>${deps.statusPill(r.status)}</td>`;
      else if(d.cols.length === 4 && d.cols[3]==='Reply') extra = `<td style="color:var(--color-text-secondary)">${formatDisplayTime(r.time)}</td><td>${deps.statusPill(r.status)}</td>`;
      else if(d.cols.length === 4 && d.cols[3]==='Next action') extra = `<td style="color:var(--color-text-secondary)">${formatDisplayTime(r.time)}</td><td><span style="font-weight:500;color:var(--color-text-primary)">${r.action || '—'}</span></td>`;
      else extra = `<td style="color:var(--color-text-secondary)">${formatDisplayTime(r.time)}</td><td>${deps.statusPill(r.status)}</td>`;
      return `<tr><td>${nameCell}</td><td>${urlCell}</td>${extra}</tr>`;
    }).join('');
  }

  function setFilter(f, el, deps){
    if (deps.getCurrentKey() === 'messages-sent') return;
    deps.setActiveFilter(f);
    document.querySelectorAll('.filter-pill').forEach(p=>p.classList.remove('active'));
    el.classList.add('active');
    deps.renderTable(deps.getCurrentKey(), f);
  }

  global.AppDetailTable = {
    renderTable: renderTable,
    setFilter: setFilter
  };
})(window);
