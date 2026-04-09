;(function(global){
  function renderChatThread(deps){
    const thread = document.getElementById('msg-thread');
    const headAv = document.getElementById('msg-head-av');
    const headName = document.getElementById('msg-head-name');
    const headStatus = document.getElementById('msg-head-status');
    const conv = deps.getThreads().find(x => x.id === deps.getActiveConvId());
    if (!conv || !thread) return;
    headAv.style.background = conv.color;
    headAv.style.color = conv.textColor;
    headAv.textContent = conv.initials;
    headName.textContent = conv.name;
    if (conv.online) {
      headStatus.textContent = 'Online';
      headStatus.className = 'msg-chat-head-status online';
    } else {
      headStatus.textContent = conv.lastSeen || 'Offline';
      headStatus.className = 'msg-chat-head-status';
    }
    thread.innerHTML = conv.messages.map(m => {
      const sent = m.dir === 'sent';
      return `<div class="msg-row ${sent ? 'msg-row--sent' : 'msg-row--recv'}">
      <div class="msg-bubble ${sent ? 'msg-bubble--sent' : 'msg-bubble--recv'}">
        <div>${deps.escapeHtml(m.text)}</div>
        <div class="msg-meta">${deps.escapeHtml(m.time)}</div>
      </div>
    </div>`;
    }).join('');
    requestAnimationFrame(() => { thread.scrollTop = thread.scrollHeight; });
  }

  global.AppMessagesChatThread = {
    renderChatThread: renderChatThread
  };
})(window);
