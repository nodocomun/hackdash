/**
 * VIEW: Form Editor List (Admin)
 *
 */

var FormItem = require('./EditFormItem');

var EmptyView = Backbone.Marionette.ItemView.extend({
  template: _.template('<p class="text-danger">No forms yet!</p>')
});

module.exports = Backbone.Marionette.CollectionView.extend({

  tagName: 'div',
  className: 'panel-group',

  childView: FormItem,

  emptyView: EmptyView,

  initialize: function(options) {
    this.openedForm = options && options.openedForm;
  },

  childViewOptions: function (model) {
    return {
      index: this.collection.indexOf(model) + 1,
      total: this.collection.length,
      openedForm: this.openedForm
    };
  },


});
