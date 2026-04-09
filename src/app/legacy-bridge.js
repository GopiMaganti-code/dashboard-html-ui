;(function(global){
  function getLogger(){
    if (global.AppLogger && typeof global.AppLogger.debug === 'function') return global.AppLogger;
    return {
      debug: function(){},
      info: function(){},
      warn: function(){},
      error: function(){}
    };
  }

  function isEnabled(flagName){
    if (!global.AppFeatureFlags || typeof global.AppFeatureFlags.isEnabled !== 'function') return false;
    return !!global.AppFeatureFlags.isEnabled(flagName);
  }

  function getFlagForRoute(routeName){
    var map = {
      openSetupScreen: 'useModularSetup',
      showDetail: 'useModularDetail',
      goBack: 'useModularDetail',
      showMessages: 'useModularMessages',
      backFromMessages: 'useModularMessages',
      showAppScreen: 'useModularDashboard'
    };
    return map[routeName] || '';
  }

  function createSafeRoute(routeName, legacyFn, modularFn){
    return function(){
      var logger = getLogger();
      var flagName = getFlagForRoute(routeName);
      var useModular = flagName ? isEnabled(flagName) : false;
      var targetFn = useModular && typeof modularFn === 'function' ? modularFn : legacyFn;
      var path = (targetFn === modularFn) ? 'modular' : 'legacy';
      logger.debug('ROUTE_CALL', { route: routeName, flag: flagName, path: path });
      try {
        return targetFn.apply(this, arguments);
      } catch (err) {
        logger.error('ROUTE_FAIL', { route: routeName, path: path, message: err && err.message ? err.message : String(err) });
        if (targetFn !== legacyFn && typeof legacyFn === 'function') {
          logger.warn('ROUTE_FALLBACK', { route: routeName, to: 'legacy' });
          return legacyFn.apply(this, arguments);
        }
        throw err;
      }
    };
  }

  function install(routes){
    var logger = getLogger();
    if (!routes || typeof routes !== 'object') {
      logger.warn('BRIDGE_SKIP', { reason: 'invalid-routes' });
      return;
    }
    Object.keys(routes).forEach(function(routeName){
      var entry = routes[routeName] || {};
      var legacyFn = entry.legacy;
      var modularFn = entry.modular;
      if (typeof legacyFn !== 'function') {
        logger.warn('BRIDGE_SKIP_ROUTE', { route: routeName, reason: 'missing-legacy' });
        return;
      }
      global[routeName] = createSafeRoute(routeName, legacyFn, modularFn);
    });
    logger.info('BRIDGE_INSTALLED', { routes: Object.keys(routes) });
  }

  global.AppLegacyBridge = {
    install: install
  };
})(window);
