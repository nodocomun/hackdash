/**
 * VIEW: Question List
 *
 */

var
    template = require('./templates/formRender.hbs')
  , doneTemplate = require('./templates/formSent.hbs')
  , QuestionList = require('./QuestionList')
  , ResponseItem = require('./ResponseItem')
  ;

var DoneView = Backbone.Marionette.ItemView.extend({
  template: doneTemplate
});

module.exports = Backbone.Marionette.LayoutView.extend({

  template: template,
  className: 'form-render',

  regions: {
    questionsList: ".questions-list",
    formContent: ".form-content",
    doneRegion: ".done",
  },

  ui: {
    formContent: ".form-content",
  },

  events: {
    'click .send-form': 'sendForm'
  },

  templateHelpers: function() {
    var self = this;
    return {
      showErrors: function() {
        return this.errors;
      },
      showMessages: function() {
        return this.messages;
      },
      isDummy: function() {
        return !!self.dummy;
      },
      readOnly: function() {
        return self.readOnly;
      }
    };
  },

  initialize: function(options) {
    this.dummy = options && options.dummy;
    this.readOnly = options && options.readOnly;
  },

  onRender: function() {
    var form = this.model;
    var self = this;
    if(form && form.get('done')) {
      hackdash.app.project = null;
      hackdash.app.type = 'forms_list';
      return self.formContent.show(new DoneView({
        model: self.model.get('project')
      }));
    }
    if(self.readOnly) {
      var project = hackdash.app.project.toJSON();
      var responses = _.findWhere(project.forms, {form: form.get('_id')}) || {responses:[]};
      var responded = 0;
      responses = _.map(form.get('questions'), function(q){
        var res = _.findWhere(responses.responses, {question: q._id}) || {};
        res.question = q;
        if(res.value) {
          responded++;
        }
        return res;
      });
      self.questionsList.show(new ResponseItem({
        model: new Backbone.Model({
          project: project,
          responses: responses,
          responded: responded/responses.length,
          opened: true
        })
      }));
    } else {
      self.questionsList.show(new QuestionList({
        model: form,
        collection: form.getQuestions() // Questions as a model
      }));
    }
  },

  sendForm: function() {
    if(this.dummy) {
      this.destroy();
      return;
    }
    var values = this.questionsList.currentView.getValues();
    var self = this;
    var res = {
        form: self.model.get('_id'),
        responses: values
      };

    self.model.sendResponse(res, function(err) {
      if(err) {
        return self.model.set({'errors': err});
      }
      self.model.set({done:true, 'messages': 'Data successfully saved!'});
    });
  }
});
