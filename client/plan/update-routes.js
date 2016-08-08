var analytics = require('../analytics')
var haversine = require('../../components/trevorgerhardt/haversine/master')
var log = require('../log')('plan:update-routes')
var message = require('../messages')('plan:update-routes')
var otpProfileToTransitive = require('otp-profile-to-transitive')
var profileFilter = require('../profile-filter')
var profileFormatter = require('../profile-formatter')
var request = require('../request')
var Route = require('../route')

/**
 * Expose `updateRoutes`
 */

module.exports = updateRoutes

/**
 * Update routes
 */

function updateRoutes (plan, opts, callback) {
  opts = opts || {}

  var done = function (err, res) {
    if (err) {
      err = generateErrorMessage(plan, res)
      analytics.track('Failed to Find Route', {
        error: err,
        plan: plan.generateQuery()
      })
      plan.clear()
    }

    plan.emit('updating options complete', {
      err: err,
      res: res
    })

    plan.loading(false)
    plan.saveURL()

    if (callback) callback(err, res)
  }

  // Check for valid locations
  if (!plan.validCoordinates()) {
    return done(message('invalid-coordinates'))
  }

  // For event handlers
  plan.loading(true)
  plan.emit('updating options')

  var query = plan.generateQuery()
  var scorer = plan.scorer()

  log('-- see raw results here: %s', plan.generateURL())

  request.get('/plan', plan.generateOtpQuery(), function (err, res) {
    var results = res.body
    if (err) {
      done(err, res)
    } else if (!results || results.profile.length < 1) {
      done(message('no-options-found'), res)
    } else {
      var profile = profileFilter(results.profile, scorer)
      var journeys = otpProfileToTransitive({
        from: query.from,
        to: query.to,
        patterns: results.patterns,
        profile: {
          options: profile
        },
        routes: results.routes
      })

      // Track the commute
      analytics.track('Found Route', {
        distance: haversine(query.from.lat, query.from.lon, query.to.lat, query.to.lon),
        plan: plan.generateQuery(),
        results: profile.length,
        profile: summarizeProfile(profile)
      })

      // Get the car data
      var driveOption = window.driveOption = new Route(profile.filter(function (o) {
        return o.access[0].mode === 'CAR' && (!o.transit || o.transit.length < 1)
      })[0])

      if (driveOption) {
        driveOption.set({
          externalCarpoolMatches: results.externalMatches,
          hasRideshareMatches: (results.externalMatches > 0 || results.ridepoolMatches.length > 0),
          internalCarpoolMatches: {
            matches: results.ridepoolMatches
          },
          internalCarpoolMatchesCount: results.ridepoolMatches.length
        })
      }

      // Create a new Route object for each option
      for (var i = 0; i < profile.length; i++) {
        profile[i] = new Route(profile[i])

        if (plan.car() && profile[i].directCar()) {
          profile[i] = driveOption
        }

        profile[i].plan(plan)

        profile[i].setCarData({
          cost: driveOption.cost(),
          emissions: driveOption.emissions(),
          time: driveOption.average()
        })
      }

      // Store the results
      plan.set({
        matches: results.internalMatches,
        options: profile,
        journey: profileFormatter.journey(journeys)
      })

      log('<-- updated routes')
      done(null, results)
    }
  })
}

function generateErrorMessage (plan, response) {
  if (!plan.to() && !plan.from()) {
    return 'Please specify the from and to locations.'
  } else if (plan.to() && !plan.from()) {
    return 'Please specify the from location.'
  } else if (!plan.to() && plan.from()) {
    return 'Please specify the to location.'
  }

  var msg = 'No results! '
  var responseText = response ? response.text : ''

  if (responseText.indexOf('VertexNotFoundException') !== -1) {
    msg += 'The <strong>'
    msg += responseText.indexOf('[from]') !== -1 ? 'from' : 'to'
    msg += '</strong> address entered is outside the supported region.'
  } else if (!plan.validCoordinates()) {
    msg += plan.coordinateIsValid(plan.from_ll()) ? 'To' : 'From'
    msg += ' address could not be found. Please enter a valid address.'
  } else if (!plan.bus() || !plan.train()) {
    msg += 'Try turning all <strong>transit</strong> modes on.'
  } else if (!plan.bike()) {
    msg += 'Add biking to see bike-to-transit results.'
  } else if (!plan.car()) {
    msg += 'Unfortunately we were unable to find non-driving results. Try turning on driving.'
  } else if (plan.end_time() - plan.start_time() < 2) {
    msg += 'Make sure the hours you specified are large enough to encompass the length of the journey.'
  } else if (plan.days() !== 'M—F') {
    msg += 'Transit runs less often on the weekends. Try switching to a weekday.'
  }

  return msg
}

function summarizeProfile (profile) {
  var best = profile[0]
  return {
    allModes: profile.reduce(function (modes, option) {
      var newModes = option.modes.filter(function (m) { return typeof m === 'string' }).join(',')
      if (modes) return modes + ',' + newModes
      else return newModes
    }, ''),
    best: {
      modes: best.modes.join(','),
      time: best.time,
      timeInTransit: best.timeInTransit,
      calories: best.calories,
      cost: best.cost,
      bikeDistance: best.bikeDistance,
      driveDistance: best.driveDistance,
      emissions: best.emissions,
      walkDistance: best.walkDistance
    }
  }
}
