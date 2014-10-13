var config = require('config');
var debug = require('debug')(config.name() + ':request');
var superagent = require('superagent');

/**
 * Base URL
 */

var base = config.api_url();

/**
 * Expose `get`
 */

module.exports.get = function(url, params, callback) {
  if (arguments.length === 2) {
    callback = params;
    params = null;
  }

  var href = base + url;
  var name = 'GET ' + href;
  debug('--> %s', name);
  return superagent
    .get(href)
    .query(params)
    .end(response(name, callback));
};

/**
 * Expose `post`
 */

module.exports.post = function(url, data, callback) {
  var href = base + url;
  var name = 'POST ' + href;
  debug('--> %s', name);
  return superagent
    .post(href)
    .send(data)
    .end(response(name, callback));
};

/**
 * Expose `del`
 */

module.exports.del = function(url, callback) {
  var href = base + url;
  var name = 'DELETE ' + href;
  debug('--> %s', name);
  return superagent
    .del(href)
    .end(response(name, callback));
};

/**
 * Response
 */

function response(name, callback) {
  var called = false;
  callback = callback || function() {};
  return function(err, res) {
    if (!called) {
      called = true;
      debug('<-- %s > %s', name, err || res.error || res.status);
      callback(err || res.error, res);
    } else {
      debug('<-- %s called more than once > %s', name, err || res.error ||
        res.status);
    }
  };
}
