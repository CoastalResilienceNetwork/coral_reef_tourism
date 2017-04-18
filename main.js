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
	"esri/geometry/Extent",
	"esri/SpatialReference",
    "dojo/dom",
    "dojo/text!./country-config.json",
    "dojo/text!./stats.json",
    "dojo/text!./template.html",
	], function(declare,
		d3,
		PluginBase,
		ContentPane,
		ArcGISDynamicMapServiceLayer,
		Extent,
		SpatialReference,
		dom,
		Config,
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
				this.config = $.parseJSON(Config);
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
					var region = e.target.value;
					self.updateStats(region);
					self.updateChartData(region);
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

				var regions = Object.keys(this.stats).sort();

				this.$el.html(_.template(template)({
					regions: regions
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

				this.updateStats('Global');

                this.renderChart();

                this.updateChartData('Global');

                this.bindEvents();

                this.$el.find(".stat-info span").tooltip();
			},

			updateStats: function(region) {
				if (region === "Global") {
					this.$el.find('.stats .header .region-label').html('the World');
				} else {
					this.$el.find('.stats .header .region-label').html(region);
				}

				this.$el.find('.stat.reef_value .number .value').html(this.addCommas(this.stats[region].reef_value));
				this.$el.find('.stat.total_visitation .number .value').html(this.addCommas(this.stats[region].total_visitation_value));
				this.$el.find('.stat.reef_highest_value .number .value').html(this.addCommas(this.stats[region].higest_value_reefs));
				this.$el.find('.stat.reef_area .number .value').html(this.addCommas(this.stats[region].total_reef_area.toFixed(0)));
				this.$el.find('.stat.reef_area_tourism .number .value').html(this.addCommas(this.stats[region].reefs_tourism_area.toFixed(0)));
				this.$el.find('.stat.reef_area_tourism .number .percentage').html((this.stats[region].reefs_tourism_area_percent * 100).toFixed(0));

				this.map.setExtent(this.getExtent.apply(this, this.config[region].EXTENT), true);
			},

			getExtent: function(xmin, ymin, xmax, ymax) {
				return new Extent(xmin, ymin, xmax, ymax, new SpatialReference({wkid: 102100})).expand(1.1);
			},

			renderChart: function() {
				var self = this;

				var margin = {
					top: 20,
					right: 20, 
					bottom: 30,
					left: 60
				};
			    var width = this.chart.width = 382 - margin.left - margin.right;
			    var height = this.chart.height = 300 - margin.top - margin.bottom;

			    var x = this.chart.x = d3.scale.ordinal().rangeRoundBands([0, width], 0.1);
    			var y = this.chart.y = d3.scale.linear().range([height, 0]);

    			var data = [
					{x: "On Reef", y: this.stats.Global.onreef_value},
					{x: "Adjacent Reef", y: this.stats.Global.adjacent_value}
				];

				this.chart.svg = d3.selectAll(".chart")
	                .append("svg")
	                    .attr("width", width + margin.left + margin.right)
	                    .attr("height", height + margin.bottom + margin.top);

	            var g = this.chart.svg.append("g")
    				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    			x.domain(["On Reef", "Adjacent Reef"]);
  				y.domain([0, d3.max(data, function(d) { return d.y; })]);

  				var xAxis = this.chart.xAxis = d3.svg.axis().scale(x).orient("bottom");
  				var yAxis = this.chart.yAxis = d3.svg.axis().scale(y).orient("left").ticks(6).tickFormat(function(d) {
					return self.addCommas(d / 1000000);
				});

  				g.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis);

			    g.append("g")
					.attr("class", "y axis")
					.call(yAxis);

				g.append("text")
                    .attr("class", "yaxis-label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 0 - margin.left + 10)
                    .attr("x", 0 - (height / 2))
                    .attr("text-anchor", "middle")
                    .text("Thousands USD");

                g.selectAll(".bar-label")
                	.data(data)
                	.enter().append("text")
                	.text(function(d) {
                		return '$' + self.addCommas(d.y) + ' (' + d.per + '%)';
                	})
                	.attr('class', 'bar-label')
                	.attr("x", function(d) { return x(d.x); })
                	.attr("y", function(d) { return y(d.y) - 5; });

  				g.selectAll(".bar")
				    .data(data)
				    .enter().append("rect")
						.attr("class", function(d) {
							return "bar " + d.x.replace(' ', '-');
						})
						.attr("title", function(d) {
							return parseInt(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						})
						.attr("x", function(d) { return x(d.x); })
						.attr("y", function(d) { return y(d.y); })
						.attr("width", x.rangeBand())
						.attr("height", function(d) { return height - y(d.y); });

				/*$('.chart rect.bar').tooltip({
					track: true
				});*/

			},

			updateChartData: function(region) {
				var self = this;
				var sum = this.stats[region].onreef_value + this.stats[region].adjacent_value;
				var data = [
					{
						x: "On Reef",
						y: this.stats[region].onreef_value,
						per: parseInt((this.stats[region].onreef_value / sum) * 100)
					},
					{
						x: "Adjacent Reef",
						y: this.stats[region].adjacent_value,
						per: parseInt((this.stats[region].adjacent_value / sum) * 100)
					}
				];

				this.chart.y.domain([0, d3.max([data[0].y, data[1].y])]);
				this.chart.svg.select(".y.axis")
                    .transition().duration(1200).ease("linear")
                    .call(this.chart.yAxis);

                this.chart.svg.selectAll(".bar-label")
                	.data(data)
                	.transition().duration(1200).ease("sin-in-out")
                	.text(function(d) {
                		return '$' + self.addCommas(d.y) + ' (' + d.per + '%)';
                	})
                	.attr('class', 'bar-label')
                	.attr("x", function(d) { return self.chart.x(d.x); })
                	.attr("y", function(d) { return self.chart.y(d.y) - 5; });

				this.chart.svg.selectAll(".bar")
				    .data(data)
				    .transition().duration(1200).ease("sin-in-out")
			      	.attr("class", function(d) {
						return "bar " + d.x.replace(' ', '-');
					})
					.attr("title", function(d) {
					    return parseInt(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
					})
					.attr("y", function(d) { return self.chart.y(d.y); })
					.attr("height", function(d) { return self.chart.height - self.chart.y(d.y); });


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