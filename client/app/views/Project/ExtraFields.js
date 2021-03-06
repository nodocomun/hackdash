/**
 * VIEW: Full Project view
 *
 */

var template = require("./templates/extrafields.hbs")
  // , Sharer = require("../Sharer")
  ;

module.exports = Backbone.Marionette.ItemView.extend({
  template: template,

  events: {
    "change .extra-field": "changeValue"
  },

  templateHelpers: function() {
    var self = this;
    return {
      fields: function() {
        return self.fields;
      },
      readOnly: function() {
        return self.readOnly;
      }
    };
  },

  initialize: function(options) {
    this.readOnly = !! options.readOnly;
    this.status = options.status || hackdash.statuses[0].status;
    this.fields = options.fields || [];
    var extra = this.model.get('extra') || {};
    if(extra && extra[this.status]) {
      extra = extra[this.status];
      this.fields = _.map(this.fields, function(val) {
          if(extra[val.id]) {
            val.value = extra[val.id];
          }
          return val;
        });
    }
  },

  changeValue: function(e) {
    var id = $(e.target).attr('id').substr(6); // remove "extra-"
    var val = $(e.target).val();
    var extra = this.model.get('extra') || {};
    extra[this.status] = extra[this.status] || {};
    extra[this.status][id] = val;
    this.model.set({extra: extra}, {patch:true, silent: true});
    console.log('defined extra',extra);
  }

});
