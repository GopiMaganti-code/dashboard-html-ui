;(function(global){
  function escapeAttr(s){
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/\r|\n/g, ' ');
  }

  function escapeHtml(s){
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  global.AppUtilsEscape = {
    escapeAttr: escapeAttr,
    escapeHtml: escapeHtml
  };
})(window);
