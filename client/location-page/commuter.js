var CommuterLocation = require('../commuter-location')
var ConfirmModal = require('../confirm-modal')
var view = require('../view')

var View = module.exports = view(require('./commuter.html'))

View.prototype.organizationId = function () {
  return this.model._commuter._organization()
}

View.prototype.locationId = function () {
  return this.model._location._id()
}

View.prototype.commuterId = function () {
  return this.model._commuter._id()
}

View.prototype.status = function () {
  var commuter = this.model._commuter
  var status = commuter.status() || ' '
  var label = commuter.statusLabel() || 'default'
  return '<span class="label label-' + label + '">' + status + '</span>'
}

View.prototype.name = function () {
  if (!this.model._commuter.givenName() && !this.model._commuter.surname()) return '(Unnamed Commuter)'
  return this.model._commuter.givenName() + ' ' + this.model._commuter.surname()
}

View.prototype.email = function () {
  return this.model._commuter.email() || '(none)'
}

View.prototype.internalId = function () {
  return this.model._commuter.internalId() || '(none)'
}

View.prototype.profileCount = function () {
  return (this.model.profile && this.model.profile.options) ? this.model.profile.options.length : '(none)'
}

View.prototype.matchCount = function () {
  return this.model.matches ? this.model.matches.length : '(none)'
}

View.prototype.location = function () {
  var commuter = this.model._commuter
  if (commuter) return commuter.city() + ', ' + commuter.state() + ' ' + commuter.zip()
  return ''
}

View.prototype.remove = function () {
  var self = this
  ConfirmModal({
    text: 'Are you sure want to remove this commuter from this location?'
  }, function () {
    CommuterLocation.remove(self.model._id, function (err) {
      if (err) {
        console.error(err)
        window.alert(err)
      } else {
        self.el.remove()
      }
    })
  })
}

View.prototype.sendProfileAndMatches = function () {
  var name = this.model._commuter.givenName || this.model._commuter.email
  CommuterLocation.sendProfileAndMatches(this.model._id, function (err) {
    if (err) {
      console.error(err)
      window.alert(err)
    } else {
      ConfirmModal({
        text: 'Commute profile and plans have been sent to ' + name + '!',
        showCancel: false
      })
    }
  })
}
