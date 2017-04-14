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
					self.layerGlobal.setVisibleLayers([$(e.currentTarget).data('layer')]);
				});

				this.$el.find('#chosenRegion').on('change', function(e) {
					//self.zoomToRegion(e.target.value);
					var region = e.target.value.toUpperCase();

					if (region === "GLOBAL") {
						self.$el.find('.stats .header .region-label').html('the World');
					} else {
						self.$el.find('.stats .header .region-label').html(region);
					}

					self.$el.find('.stat.reef_value .number .value').html(self.addCommas(self.stats[region].reef_value));
					self.$el.find('.stat.reef_area_tourism .number .value').html(self.addCommas(self.stats[region].reefs_area));
					self.$el.find('.stat.reef_area_tourism .number .percentage').html((self.stats[region].reefs_used_percent * 100).toFixed(1));
					

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

			},

			// http://stackoverflow.com/questions/2646385/add-a-thousands-separator-to-a-total-with-javascript-or-jquery
			addCommas: function(nStr) {
			    nStr += '';
			    var x = nStr.split('.');
			    var x1 = x[0];
			    var x2 = x.length > 1 ? '.' + x[1] : '';
			    var rgx = /(\d+)(\d{3})/;
			    while (rgx.test(x1)) {
			        x1 = x1.replace(rgx, '$1' + ',' + '$2');
			    }
			    return x1 + x2;
			}

		});
	}
);