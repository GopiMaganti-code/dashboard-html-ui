;(function(global){
  function isValidEmail(str){
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(str).trim());
  }

  function initialsFromEmail(email){
    var local = String(email || '').split('@')[0] || '';
    var alnum = local.replace(/[^a-zA-Z0-9]/g, ' ').trim();
    var parts = alnum.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    if (local.length >= 2) return local.slice(0, 2).toUpperCase();
    return 'SD';
  }

  global.AppUtilsValidators = {
    isValidEmail: isValidEmail,
    initialsFromEmail: initialsFromEmail
  };
})(window);
