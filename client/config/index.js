var each = require('each');

/**
 * Expose `getters` for config vars
 */

each(window.modeify.config, function(key, val) {
  module.exports[key] = module.exports[key.toLowerCase()] = function() {
    return val;
  };
});
