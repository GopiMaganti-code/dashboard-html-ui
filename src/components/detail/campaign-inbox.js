;(function(global){
  function renderCampaignInboxList(deps){
    if (global.console && typeof global.console.log === 'function') {
      global.console.log('[RENDER_SOURCE_B] AppCampaignInbox.renderCampaignInboxList');
    }
    var el = document.getElementById('campaign-conv-list');
    if (!el) return;
    var threads = deps.getThreads();
    var activeId = deps.getActiveId();
    el.innerHTML = threads.map(function(c){
      var isReply = (c.replyStatus || '').toLowerCase() === 'replied';
      var pill = isReply
        ? '<span class="campaign-reply-pill campaign-reply-pill--yes">Replied</span>'
        : '<span class="campaign-reply-pill campaign-reply-pill--no">No reply</span>';
      var active = c.id === activeId ? ' active' : '';
      return '<div class="campaign-conv-item' + active + '" role="button" tabindex="0" onclick="selectCampaignInboxConv(\'' + c.id + '\')" onkeydown="if(event.key===\'Enter\')selectCampaignInboxConv(\'' + c.id + '\')">' +
        '<div class="campaign-conv-av" style="background:' + c.color + ';color:' + c.textColor + '">' + deps.escapeHtml(c.initials) + '</div>' +
        '<div class="campaign-conv-body"><div class="campaign-conv-top">' +
        '<span class="campaign-conv-name">' + deps.escapeHtml(c.name) + '</span>' +
        '<span class="campaign-conv-time">' + deps.escapeHtml(c.time) + '</span></div>' +
        '<div class="campaign-conv-preview">' + deps.escapeHtml(c.preview) + '</div>' +
        '<div class="campaign-conv-meta">' + pill + '</div></div></div>';
    }).join('');
  }

  function renderCampaignChatThread(deps){
    var conv = deps.getThreads().find(function(x){ return x.id === deps.getActiveId(); });
    var thread = document.getElementById('campaign-thread');
    if (!conv || !thread) return;
    thread.innerHTML = conv.messages.map(function(m){
      var sent = m.dir === 'sent';
      return '<div class="campaign-bubble-row ' + (sent ? 'campaign-bubble-row--sent' : 'campaign-bubble-row--recv') + '">' +
        '<div class="campaign-bubble ' + (sent ? 'campaign-bubble--sent' : 'campaign-bubble--recv') + '">' +
        '<div>' + deps.escapeHtml(m.text) + '</div>' +
        '<div class="campaign-bubble-meta">' + deps.escapeHtml(m.time) + '</div></div></div>';
    }).join('');
    requestAnimationFrame(function(){ thread.scrollTop = thread.scrollHeight; });
  }

  function selectCampaignInboxConv(id, deps){
    if (global.console && typeof global.console.log === 'function') {
      global.console.log('[RENDER_SOURCE_B] AppCampaignInbox.selectCampaignInboxConv', id);
    }
    deps.setActiveId(id);
    document.getElementById('campaign-chat-empty').style.display = 'none';
    document.getElementById('campaign-chat-active').style.display = '';
    renderCampaignInboxList(deps);
    var conv = deps.getThreads().find(function(x){ return x.id === id; });
    if (!conv) return;
    var av = document.getElementById('campaign-head-av');
    av.textContent = conv.initials;
    av.style.background = conv.color;
    av.style.color = conv.textColor;
    document.getElementById('campaign-head-name').textContent = conv.name;
    var link = document.getElementById('campaign-head-url');
    link.href = 'https://' + conv.url;
    link.textContent = conv.url;
    var badge = document.getElementById('campaign-head-badge');
    var isReply = (conv.replyStatus || '').toLowerCase() === 'replied';
    badge.textContent = isReply ? 'Replied' : 'No reply';
    badge.className = 'campaign-reply-badge ' + (isReply ? 'campaign-reply-badge--yes' : 'campaign-reply-badge--no');
    renderCampaignChatThread(deps);
    if (window.matchMedia('(max-width:900px)').matches){
      document.getElementById('detail-campaign-inbox').classList.add('campaign-inbox--chat');
    }
  }

  function sendCampaignInboxLine(deps){
    var input = document.getElementById('campaign-input');
    if (!input || !deps.getActiveId()) return;
    var t = (input.value || '').trim();
    if (!t) return;
    var conv = deps.getThreads().find(function(x){ return x.id === deps.getActiveId(); });
    if (!conv) return;
    var time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    conv.messages.push({ dir: 'sent', text: t, time: time });
    conv.preview = t.length > 52 ? t.slice(0, 49) + '…' : t;
    conv.time = 'Now';
    input.value = '';
    renderCampaignInboxList(deps);
    renderCampaignChatThread(deps);
  }

  global.AppCampaignInbox = {
    renderCampaignInboxList: renderCampaignInboxList,
    renderCampaignChatThread: renderCampaignChatThread,
    selectCampaignInboxConv: selectCampaignInboxConv,
    sendCampaignInboxLine: sendCampaignInboxLine
  };
})(window);
