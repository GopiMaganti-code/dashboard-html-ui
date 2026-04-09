;(function(global){
  function escapeHtml(value){
    if (global.AppUtilsEscape && typeof global.AppUtilsEscape.escapeHtml === 'function') {
      return global.AppUtilsEscape.escapeHtml(value);
    }
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderQueuedMessages(input){
    var table = document.getElementById('msg-queued-table');
    var tbody = document.getElementById('msg-queued-tbody');
    var empty = document.getElementById('msg-queued-empty');
    if (!table || !tbody || !empty) return;
    var rows = Array.isArray(input && input.rows) ? input.rows : [];
    if (!rows.length) {
      tbody.innerHTML = '';
      table.hidden = true;
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    table.hidden = false;
    tbody.innerHTML = rows.map(function(row){
      var aiSdr = row && row.aiSdr ? String(row.aiSdr) : '—';
      var leadUrl = row && row.leadUrl ? String(row.leadUrl) : '';
      var message = row && row.message ? String(row.message) : '—';
      var href = leadUrl ? (leadUrl.indexOf('http') === 0 ? leadUrl : 'https://' + leadUrl) : '#';
      return '<tr>' +
        '<td data-label="AI SDR"><span class="campaign-monospace clamp-1">' + escapeHtml(aiSdr) + '</span></td>' +
        '<td data-label="Lead URL"><a class="url-link clamp-1" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(leadUrl || '—') + '</a></td>' +
        '<td data-label="Message"><span class="msg-queued-message clamp-1" title="' + escapeHtml(message) + '">' + escapeHtml(message) + '</span></td>' +
      '</tr>';
    }).join('');
  }

  global.AppQueuedTable = {
    renderQueuedMessages: renderQueuedMessages
  };
})(window);
