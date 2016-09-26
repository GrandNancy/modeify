var config = require('../config')
var log = require('../log')('location')
var map = require('../map')
var model = require('component-model')
var request = require('../request')

/**
 * Expose `Location`
 */

var Location = module.exports = model('Location')
  .use(require('../model-geo'))
  .route(config.api_url() + '/locations')
  .attr('_id')
  .attr('category')
  .attr('created_by')
  .attr('name')
  .attr('rideshare_manager')
  .attr('commuter_count')
  .attr('match_radius')
  .attr('last_matched')
  .attr('last_profiled')
  .attr('commuters_profiled')

Location.load = function (ctx, next) {
  log('loading %s', ctx.params.location)
  if (ctx.params.location === 'new') return next()

  Location.get(ctx.params.location, function (err, location) {
    if (err) {
      next(err)
    } else {
      ctx.location = location
      next()
    }
  })
}

Location.prototype.mapMarker = function () {
  var c = this.coordinate()
  return map.createMarker({
    title: '<a href="/manager/organizations/' + this.created_by() + '/locations/' + this._id() + 'show">' + this.name() + '</a>',
    description: this.fullAddress(),
    color: '#428bca',
    coordinate: [c.lng, c.lat],
    icon: 'building'
  })
}

Location.loadOrg = function (ctx, next) {
  request
    .get('/locations/created_by/' + ctx.params.organization, function (err, res) {
      if (err) {
        next(err)
      } else {
        log('load org found %s location(s)', res.body.length)
        ctx.locations = res.body.map(function (l) {
          return new Location(l)
        })
        next()
      }
    })
}

Location.prototype.profile = function (callback) {
  request.get('/commuter-locations/profile', {
    _location: this._id()
  }, function (err, res) {
    if (err) {
      callback(err)
    } else {
      callback(null, res.text)
    }
  })
}

Location.prototype.match = function (callback) {
  request.get('/commuter-locations/match', {
    _location: this._id()
  }, function (err, res) {
    if (err) {
      callback(err)
    } else {
      callback(null, res.text)
    }
  })
}

Location.prototype.profileAndMatch = function (callback) {
  request.get('/commuter-locations/profile-and-match', {
    _location: this._id()
  }, function (err, res) {
    if (err) {
      callback(err)
    } else {
      callback(null, res.text)
    }
  })
}

Location.prototype.sendProfilesAndMatches = function (callback) {
  request.get('/commuter-locations/send-profiles-and-matches', {
    _location: this._id()
  }, function (err, res) {
    if (err) {
      callback(err)
    } else {
      callback(null, res.text)
    }
  })
}

Location.prototype.copyCommuters = function (sources, callback) {
  request.get('/commuter-locations/copy-commuters', {
    _location: this._id(),
    sources: sources
  }, function (err, res) {
    if (err) {
      console.log('CC err', err);
      callback(err)
    } else {
      console.log('CC OK!');
      callback(null, res.text)
    }
  })
}
