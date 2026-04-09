;(function(global){
  function nowIso(){
    return new Date().toISOString();
  }

  function runMessagesCheck(input){
    return new Promise(function(resolve){
      var startedAt = nowIso();
      var rows = Array.isArray(input && input.rows) ? input.rows : [];
      var replies = rows.filter(function(r){
        return String(r && r.status || '').toLowerCase() === 'replied';
      });
      var failed = rows.filter(function(r){
        var s = String(r && r.status || '').toLowerCase();
        return s === 'failed' || s === 'no reply';
      });
      var delay = 700 + Math.floor(Math.random() * 350);
      setTimeout(function(){
        resolve({
          run_id: 'msg_run_' + Date.now().toString(36),
          campaign_id: input && input.campaign_id ? String(input.campaign_id) : '',
          type: 'messages_run',
          status: rows.length > 0 ? 'success' : 'failed',
          started_at: startedAt,
          completed_at: nowIso(),
          leads_processed: rows.length,
          replies_detected: replies.length,
          failed_count: failed.length,
          replies: replies.map(function(r){
            return {
              name: r.name || '',
              profile_url: r.url || '',
              last_reply_message: 'Reply detected from lead.',
              time: r.time || ''
            };
          }),
          error_message: rows.length > 0 ? '' : 'No message leads found for this run.'
        });
      }, delay);
    });
  }

  global.AppMessagesRunService = {
    runMessagesCheck: runMessagesCheck
  };
})(window);
