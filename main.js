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
			toolbarName: 'Recreation & Tourism',
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

				// Adjust toolbar title position to make room for image button
				$('.sidebar-nav .nav-title').css("margin-left", "25px");
			},

			deactivate: function() {

				// Reset toolbar title positioning
				$('.sidebar-nav .nav-title').css("margin-left", "0px");
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

                $(this.container).parent().append('<button id="viewCrsInfoGraphicIcon" class="button button-default ig-icon"><img src="plugins/recreation-tourism/InfographicIcon_v1_23x23.png" alt="show overview graphic"></button>');
				$(this.container).parent().find("#viewCrsInfoGraphicIcon").on('click',function(c){
					TINY.box.show({
						animate: true,
						url: 'plugins/recreation-tourism/infographic.html',
						fixed: true,
						width: 825,
						height: 638
					});
				});

                this.bindEvents();
			}

		});
	}
);