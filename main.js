define([
	"dojo/_base/declare",
	"framework/PluginBase",
	"dijit/layout/ContentPane",
    "dojo/dom",
    "dojo/text!./template.html",
	], function(declare,
		PluginBase,
		ContentPane,
		dom,
		template
	) {

		return declare(PluginBase, {
			toolbarName: 'Coral Reef Tourism',
			resizable: false,
			width: 425,
			size: 'custom',

			initialize: function(frameworkParameters) {
				declare.safeMixin(this, frameworkParameters);
				this.$el = $(this.container);
			},

			bindEvents: function() {
				this.$el.find('.stat').not('.non-interactive').on('click', function(e) {
					$('.stats .stat.active').removeClass('active');
					$(e.currentTarget).addClass('active');
				});
			},

			activate: function() {
				this.render();
			},

			deactivate: function() {

			},

			hibernate: function() {

			},

			render: function() {
				this.$el.html(_.template(template, {

                }));

                this.$el.find('#chosenRegion').chosen({
                	disable_search_threshold: 20,
                	width: '100%'
                });

                this.bindEvents();
			}

		});
	}
);