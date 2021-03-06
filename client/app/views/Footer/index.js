var
    template = require('Footer/templates/footer.hbs')
  , AdminFooter = require('./AdminFooter');

module.exports = Backbone.Marionette.LayoutView.extend({

  //--------------------------------------
  //+ PUBLIC PROPERTIES / CONSTANTS
  //--------------------------------------

  className: "footer",
  template: template,

  ui: {
    "up": ".up-button"
  },

  regions: {
    'adminRegion': '.admin-footer'
  },

  events: {
    "click @ui.up": "goTop"
  },

  templateHelpers: function() {
    return {
      isAdmin: this.isAnyAdmin.apply(this)
    };
  },

  //--------------------------------------
  //+ INHERITED / OVERRIDES
  //--------------------------------------

  onRender: function(){
    this.setStatics();
    if(this.isAnyAdmin()) {
      this.adminRegion.show(new AdminFooter({
        model: this.model
      }));
    }
/*
    if (hackdash.app.type !== "dashboard"){
      this.$el.addClass('unlocked');
    }
*/
  },

  //--------------------------------------
  //+ PUBLIC METHODS / GETTERS / SETTERS
  //--------------------------------------

  //--------------------------------------
  //+ EVENT HANDLERS
  //--------------------------------------

  upBlocked: false,
  goTop: function(){

    if (!this.upBlocked){
      this.upBlocked = true;

      var body = $("html, body"), self = this;
      body.animate({ scrollTop:0 }, 1500, 'swing', function() {
        self.upBlocked = false;
      });
    }
  },

  //--------------------------------------
  //+ PRIVATE AND PROTECTED METHODS
  //--------------------------------------

  isAnyAdmin: function() {
    var user = hackdash.user;

    if(user && this.model) {
      var domain = this.model.get('domain');
      if(domain) {
        return user.admin_in.indexOf(domain) >= 0;
      }
      return user.group_admin_in && user.group_admin_in.indexOf(this.model.get('_id')) >= 0;
    }
    return false;
  },

  setStatics: function(){
    var statics = ['project', 'profile'];

    if (statics.indexOf(hackdash.app.type) > -1){
      this.$el.addClass('static');
      return;
    }

    function isAdmin(domain){
      var user = hackdash.user;
      return user && user.admin_in.indexOf(domain) >= 0 || false;
    }

    if (hackdash.app.type === 'dashboard' && !isAdmin(this.model.get('domain')) ){
      this.$el.addClass('static');
    }
  }

});
