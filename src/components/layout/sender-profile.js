;(function(global){
  function shortenPlan(plan){
    var p = String(plan || '').trim();
    if (!p) return 'Premium';
    if (/sales\s+navigator/i.test(p)) return 'Sales Nav';
    if (/premium\s+career/i.test(p)) return 'Premium Career';
    return p.length > 14 ? (p.slice(0, 13) + '...') : p;
  }

  function renderPremiumStatus(status){
    var safe = status || {};
    var isPremium = safe.isPremium === true || safe.isPremium === 'true' || safe.isPremium === 1;
    var fullPlan = String(safe.plan || '').trim();
    var displayPlan = shortenPlan(fullPlan);
    document.querySelectorAll('.app-premium-badge').forEach(function(el){
      if (!isPremium) {
        el.classList.add('hidden');
        el.textContent = '';
        el.removeAttribute('title');
        return;
      }
      el.textContent = '🚀 ' + (displayPlan || 'Premium');
      el.classList.remove('hidden');
      el.title = fullPlan || 'Premium';
    });
  }

  function renderSenderProfile(state, initialsFromEmailFn){
    document.querySelectorAll('.app-sdr-email').forEach(function(el){
      el.textContent = state.aiSdrEmail || '—';
    });
    document.querySelectorAll('.app-sdr-initials').forEach(function(el){
      el.textContent = state.aiSdrEmail ? initialsFromEmailFn(state.aiSdrEmail) : '—';
    });
  }

  global.AppSenderProfile = {
    renderSenderProfile: renderSenderProfile,
    renderPremiumStatus: renderPremiumStatus
  };
})(window);
