;(function(global){
  function sendMessage(deps){
    const input = document.getElementById('msg-input');
    if (!input || !deps.getActiveConvId()) return;
    const t = (input.value || '').trim();
    if (!t) return;
    const conv = deps.getThreads().find(x => x.id === deps.getActiveConvId());
    if (!conv) return;
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    conv.messages.push({ dir: 'sent', text: t, time: time });
    conv.preview = t.length > 60 ? t.slice(0, 57) + '…' : t;
    conv.time = 'Just now';
    input.value = '';
    deps.renderConvList();
    deps.renderThread();
  }

  global.AppMessagesCompose = {
    sendMessage: sendMessage
  };
})(window);
