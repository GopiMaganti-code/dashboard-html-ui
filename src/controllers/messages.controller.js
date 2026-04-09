;(function(global){
  function normalizeTab(tab){
    var value = String(tab || 'sent').toLowerCase();
    if (value === 'replied' || value === 'no-reply' || value === 'queued') return value;
    return 'sent';
  }

  function isReplyThread(thread){
    var messages = Array.isArray(thread && thread.messages) ? thread.messages : [];
    return messages.some(function(message){ return message && message.dir === 'recv'; });
  }

  function getFilteredThreads(deps){
    var all = deps.getThreads();
    var tab = normalizeTab(deps.getActiveTab());
    if (tab === 'replied') {
      return all.filter(isReplyThread);
    }
    if (tab === 'no-reply') {
      return all.filter(function(thread){ return !isReplyThread(thread); });
    }
    return all;
  }

  function syncTabUi(activeTab){
    var tabs = document.querySelectorAll('#messages-tab-group .messages-tab');
    tabs.forEach(function(tab){
      var tabName = tab.getAttribute('data-tab') || 'sent';
      var isActive = tabName === activeTab;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    var chatPanel = document.getElementById('msg-chat-panel');
    var queuedPanel = document.getElementById('msg-queued-panel');
    if (chatPanel) chatPanel.hidden = activeTab === 'queued';
    if (queuedPanel) queuedPanel.hidden = activeTab !== 'queued';
  }

  function renderQueued(deps){
    if (!global.AppQueuedTable || typeof global.AppQueuedTable.renderQueuedMessages !== 'function') return Promise.resolve();
    if (typeof deps.clearGlobalError === 'function') deps.clearGlobalError();
    if (typeof deps.setGlobalLoading === 'function') deps.setGlobalLoading(true, 'Loading queued messages…');
    return deps.getQueuedMessages().then(function(payload){
      global.AppQueuedTable.renderQueuedMessages(payload || { rows: [] });
    }).catch(function(){
      if (typeof deps.showGlobalError === 'function') deps.showGlobalError('Unable to load queued messages. Showing fallback data.');
      return deps.getQueuedMessagesFallback().then(function(payload){
        global.AppQueuedTable.renderQueuedMessages(payload || { rows: [] });
      });
    }).finally(function(){
      if (typeof deps.setGlobalLoading === 'function') deps.setGlobalLoading(false);
    });
  }

  function ensureActiveConversation(deps, list){
    var activeId = deps.getActiveConvId();
    var hasActive = list.some(function(t){ return t.id === activeId; });
    if (!hasActive) deps.setActiveConvId(list[0] ? list[0].id : null);
  }

  function refreshByTab(deps){
    var activeTab = normalizeTab(deps.getActiveTab());
    syncTabUi(activeTab);
    if (activeTab === 'queued') return renderQueued(deps);
    var list = getFilteredThreads(deps);
    ensureActiveConversation(deps, list);
    renderConvList(deps);
    renderThread(deps);
    return Promise.resolve();
  }

  function bindMessageTabs(deps){
    if (global.__messagesTabListenersBound) return;
    global.__messagesTabListenersBound = true;
    var group = document.getElementById('messages-tab-group');
    if (!group) return;
    group.addEventListener('click', function(event){
      var tab = event.target && event.target.closest && event.target.closest('.messages-tab');
      if (!tab || !group.contains(tab)) return;
      var tabName = normalizeTab(tab.getAttribute('data-tab'));
      deps.setActiveTab(tabName);
      refreshByTab(deps);
    });
  }

  function renderConvList(deps){
    var activeTab = normalizeTab(deps.getActiveTab());
    if (activeTab === 'queued') return;
    var filtered = getFilteredThreads(deps);
    ensureActiveConversation(deps, filtered);
    if (global.AppMessagesConversationList && typeof global.AppMessagesConversationList.renderConversationList === 'function') {
      return global.AppMessagesConversationList.renderConversationList({
        getThreads: function(){ return filtered; },
        getActiveConvId: deps.getActiveConvId,
        escapeHtml: deps.escapeHtml
      });
    }
  }

  function renderThread(deps){
    var activeTab = normalizeTab(deps.getActiveTab());
    if (activeTab === 'queued') return;
    var filtered = getFilteredThreads(deps);
    ensureActiveConversation(deps, filtered);
    if (global.AppMessagesChatThread && typeof global.AppMessagesChatThread.renderChatThread === 'function') {
      return global.AppMessagesChatThread.renderChatThread({
        getThreads: function(){ return filtered; },
        getActiveConvId: deps.getActiveConvId,
        escapeHtml: deps.escapeHtml
      });
    }
  }

  function selectConversation(id, deps){
    deps.setActiveConvId(id);
    renderConvList(deps);
    renderThread(deps);
  }

  function sendDummyChatLine(deps){
    if (global.AppMessagesCompose && typeof global.AppMessagesCompose.sendMessage === 'function') {
      return global.AppMessagesCompose.sendMessage({
        getThreads: deps.getThreads,
        getActiveConvId: deps.getActiveConvId,
        renderConvList: function(){ renderConvList(deps); },
        renderThread: function(){ renderThread(deps); }
      });
    }
  }

  function initMessagesTabs(deps){
    bindMessageTabs(deps);
    return refreshByTab(deps);
  }

  global.AppMessagesController = {
    initMessagesTabs: initMessagesTabs,
    renderConvList: renderConvList,
    renderThread: renderThread,
    selectConversation: selectConversation,
    sendDummyChatLine: sendDummyChatLine
  };
})(window);
