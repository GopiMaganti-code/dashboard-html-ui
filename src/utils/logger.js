;(function(global){
  var LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
  var state = {
    enabled: true,
    minLevel: 'debug',
    prefix: '[LN_UI]'
  };

  function nowIso(){
    try { return new Date().toISOString(); } catch (e) { return ''; }
  }

  function shouldLog(level){
    var current = LEVELS[state.minLevel] || LEVELS.debug;
    var next = LEVELS[level] || LEVELS.debug;
    return state.enabled && next >= current;
  }

  function write(level, eventName, payload){
    if (!shouldLog(level)) return;
    var consoleMethod = console[level] ? level : 'log';
    var eventLabel = eventName ? String(eventName) : 'event';
    var line = state.prefix + ' ' + nowIso() + ' ' + level.toUpperCase() + ' ' + eventLabel;
    if (payload === undefined) console[consoleMethod](line);
    else console[consoleMethod](line, payload);
  }

  global.AppLogger = {
    config: function(next){
      if (!next || typeof next !== 'object') return;
      if (typeof next.enabled === 'boolean') state.enabled = next.enabled;
      if (typeof next.minLevel === 'string' && LEVELS[next.minLevel]) state.minLevel = next.minLevel;
      if (typeof next.prefix === 'string' && next.prefix.trim()) state.prefix = next.prefix.trim();
    },
    debug: function(eventName, payload){ write('debug', eventName, payload); },
    info: function(eventName, payload){ write('info', eventName, payload); },
    warn: function(eventName, payload){ write('warn', eventName, payload); },
    error: function(eventName, payload){ write('error', eventName, payload); },
    event: function(eventName, payload){ write('info', eventName, payload); }
  };
})(window);
