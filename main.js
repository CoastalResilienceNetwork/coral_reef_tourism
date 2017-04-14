require({
    // Specify library locations.
    packages: [
        {
            name: "d3",
            location: "//d3js.org",
            main: "d3.v3.min"
        }
    ]
});

define([
	"dojo/_base/declare",
	"d3",
	"framework/PluginBase",
	"dijit/layout/ContentPane",
	"esri/layers/ArcGISDynamicMapServiceLayer",
    "dojo/dom",
    "dojo/text!./stats.json",
    "dojo/text!./template.html",
	], function(declare,
		d3,
		PluginBase,
		ContentPane,
		ArcGISDynamicMapServiceLayer,
		dom,
		Stats,
		template
	) {

		return declare(PluginBase, {
			toolbarName: 'Recreation & Tourism',
			resizable: false,
			width: 425,
			size: 'custom',
			chart: {},

			initialize: function(frameworkParameters) {
				declare.safeMixin(this, frameworkParameters);
				this.$el = $(this.container);
				this.stats = $.parseJSON(Stats);
				console.log(this.stats);
			},

			bindEvents: function() {
				var self = this;
				this.$el.find('.stat').not('.non-interactive').on('click', function(e) {
					$('.stats .stat.active').removeClass('active');
					$(e.currentTarget).addClass('active');
					self.layerGlobal.setVisibleLayers([$(e.currentTarget).data('layer')])
				});
			},

			activate: function() {
				this.render();

				// Adjust toolbar title position to make room for image button
				$('.sidebar-nav .nav-title').css("margin-left", "25px");

				if (!this.layerGlobal) {
					this.layerGlobal = new ArcGISDynamicMapServiceLayer("http://dev.services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Recreation_and_Tourism/MapServer", {
						id: 'global'
					});
					this.layerGlobal.setVisibleLayers([1]);
					this.map.addLayer(this.layerGlobal);
				} else {
					this.layerGlobal.setVisibleLayers([1]);
				}
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

                this.renderChart();

                this.bindEvents();

                this.$el.find(".stat-info span").tooltip();
			},

			renderChart: function() {
				console.log(this);
				this.chart.svg = d3.selectAll(".chart")
	                .append("svg")
	                    .attr("width", 350)
	                    .attr("height", 235)
	                .append("g")
	                    .attr("transform", "translate(" + 20 + "," + 20 + ")");

			}

		});
	}
);