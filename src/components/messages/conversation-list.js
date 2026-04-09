;(function(global){
  function renderConversationList(deps){
    const el = document.getElementById('msg-conv-list');
    if (!el) return;
    const threads = deps.getThreads();
    const activeId = deps.getActiveConvId();
    el.innerHTML = threads.map(c => `
    <div class="msg-conv ${c.id === activeId ? 'active' : ''}" role="button" tabindex="0" onclick="selectConversation('${c.id}')" onkeydown="if(event.key==='Enter')selectConversation('${c.id}')">
      <div class="msg-conv-av" style="background:${c.color};color:${c.textColor};">${c.initials}</div>
      <div class="msg-conv-body">
        <div class="msg-conv-top">
          <span class="msg-conv-name">${deps.escapeHtml(c.name)}</span>
          <span class="msg-conv-time">${deps.escapeHtml(c.time)}</span>
        </div>
        <div class="msg-conv-preview">${deps.escapeHtml(c.preview)}</div>
      </div>
    </div>
  `).join('');
  }

  global.AppMessagesConversationList = {
    renderConversationList: renderConversationList
  };
})(window);
