/**
 * Collection: Forms
 *
 */
var
  Form = require('./Form'),
  BaseCollection = require('./BaseCollection');

var Forms = module.exports = BaseCollection.extend({

  model: Form,

  idAttribute: "_id",

  comparators: {
    title: function(a){ return a.get('title'); },
    created_at: function(a){ return -a.get('created_at'); },
  },

  url: function() {
    if (this.domain){
      return hackdash.apiURL + '/dashboards/' + this.domain + '/forms';
    }
    else if (this.group){
      return hackdash.apiURL + '/collections/' + this.group + '/forms';
    }
    else if (this.project){
      return hackdash.apiURL + '/projects/' + this.project + '/forms';
    }
    return hackdash.apiURL + '/forms'; // User forms
  },

  getActives: function() {
    var forms = new Forms(
      this.filter(function(forms) {
        return forms.get("open");
      })
    );
    return forms;
  },

  getForProject: function(project_id) {
    var forms = new Forms(
      this.filter(function(forms) {
        return _.findWhere(forms.get("projects"), {_id: project_id}) ? true : false;
      })
    );
    return forms;
  }

});

