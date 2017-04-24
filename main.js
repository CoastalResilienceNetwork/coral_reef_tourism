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

				// This hack removes a mismatch jquery-ui stylesheet.
				// Hack needs to be removed when framework is upgraded
				$('link[rel=stylesheet][href~="http://code.jquery.com/ui/1.11.2/themes/smoothness/jquery-ui.css"]').remove();
			},

			bindEvents: function() {
				var self = this;
				this.$el.find('.stats .stat').not('.non-interactive').on('click', function(e) {
					self.$el.find('.stats .stat.active').removeClass('active');
					d3.selectAll('.chart rect.bar.disabled').classed('disabled', false);
					d3.selectAll('.chart rect.bar.active').classed('active', false);
					$(e.currentTarget).addClass('active');
					self.updateLayers();
				});

				this.$el.find('#chosenRegion').on('change', function(e) {
					var region = e.target.value;
					self.updateStats(region);
					self.updateChartData(region);
					self.updateLayers();

					if (region === 'Global') {
						self.$el.find('.right-side .form-component').hide();
					} else {
						self.$el.find('.right-side .form-component').show();
					}

				});

				this.$el.find('#scale-data').on('change', _.bind(this.updateLayers, this));

			},

			activate: function() {
				this.render();

				// Adjust toolbar title position to make room for image button
				this.$el.prev('.sidebar-nav').find('.nav-title').css("margin-left", "25px");

				if (!this.layerGlobal) {
					this.layerGlobal = new ArcGISDynamicMapServiceLayer("http://dev.services2.coastalresilience.org/arcgis/rest/services/OceanWealth/Recreation_and_Tourism/MapServer", {
						id: 'global',
						maxScale: 500000
					});
					this.layerGlobal.setVisibleLayers([1]);
					this.map.addLayer(this.layerGlobal);
				} else {
					this.updateLayers();
				}

				$('#map-0').append('<div class="zoom-to-far-error">Data not available at this zoom.<br>Please zoom out.</div>');
			
			},

			deactivate: function() {

				// Reset toolbar title positioning
				$('.sidebar-nav .nav-title').css("margin-left", "0px");
				$('.zoom-to-far-error').remove();
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

                $(this.container).parent().append('<button title="View infographic" class="button button-default viewCrsInfoGraphicIcon ig-icon"><img src="plugins/recreation-tourism/InfographicIcon_v1_23x23.png" alt="show overview graphic"></button>');
				$(this.container).parent().find(".viewCrsInfoGraphicIcon").on('click',function(c){
					TINY.box.show({
						animate: true,
						url: 'plugins/recreation-tourism/infographic.html',
						fixed: true,
						width: 600,
						height: 499
					});
				}).tooltip();

				this.updateStats('Global');

                this.renderChart();

                this.updateChartData('Global');

                this.bindEvents();

                this.$el.find(".stat-info span").tooltip();
			},

			updateLayers: function() {
				var layerid;
				var region = this.$el.find("#chosenRegion").val();
				var scaled = this.$el.find("#scale-data").is(":checked");
				var layer = this.$el.find('.stat.active').attr('data-layer');

				if (scaled) {
					layerid = this.config[region].LAYERS[layer];
				} else {
					layerid = this.config.Global.LAYERS[layer];
				}

				this.layerGlobal.setVisibleLayers([layerid]);
			},

			updateStats: function(region) {
				if (region === "Global") {
					this.$el.find('.stats .header .region-label').html('the World');
					this.map.setExtent(this.getExtent.apply(this, this.config[region].EXTENT), false);
				} else {
					this.$el.find('.stats .header .region-label').html(region);
					this.map.setExtent(this.getExtent.apply(this, this.config[region].EXTENT), true);

					this.$el.find('.reef_value .fa-info-circle').attr('title', this.config[region].TOOLTIPS.reef_value);
					this.$el.find('.total_visitation .fa-info-circle').attr('title', this.config[region].TOOLTIPS.total_visitation);
					this.$el.find('.reef_highest_value .fa-info-circle').attr('title', this.config[region].TOOLTIPS.reef_highest_value);


				}

				this.$el.find('.stat.reef_value .number .value').html(this.addCommas(this.stats[region].reef_value));
				this.$el.find('.stat.total_visitation .number .value').html(this.addCommas(this.stats[region].total_visitation_value));
				this.$el.find('.stat.reef_highest_value .number .value').html(this.addCommas(this.stats[region].higest_value_reefs));
				this.$el.find('.stat.reef_area .number .value').html(this.addCommas(this.stats[region].total_reef_area.toFixed(0)));
				this.$el.find('.stat.reef_area_tourism .number .value').html(this.addCommas(this.stats[region].reefs_tourism_area.toFixed(0)));
				this.$el.find('.stat.reef_area_tourism .number .percentage').html((this.stats[region].reefs_tourism_area_percent * 100).toFixed(0));

			},

			getExtent: function(xmin, ymin, xmax, ymax) {
				return new Extent(xmin, ymin, xmax, ymax, new SpatialReference({wkid: 4326})).expand(1.1);
			},

			renderChart: function() {
				var self = this;

				var margin = {
					top: 30,
					right: 20, 
					bottom: 50,
					left: 70
				};
			    var width = this.chart.width = 382 - margin.left - margin.right;
			    var height = this.chart.height = 300 - margin.top - margin.bottom;

			    var x = this.chart.x = d3.scale.ordinal().rangeRoundBands([0, width], 0.1);
    			var y = this.chart.y = d3.scale.linear().range([height, 0]);

    			var sum = this.stats.Global.onreef_value + this.stats.Global.adjacent_value;
    			var data = [
					{
						x: "On Reef",
						y: this.stats.Global.onreef_value,
						per: parseInt((this.stats.Global.onreef_value / sum) * 100)},
					{
						x: "Adjacent Reef",
						y: this.stats.Global.adjacent_value,
						per: parseInt((this.stats.Global.adjacent_value / sum) * 100)
					}
				];

				this.chart.svg = d3.selectAll(".chart")
	                .append("svg")
	                    .attr("width", width + margin.left + margin.right)
	                    .attr("height", height + margin.bottom + margin.top);

	            var g = this.chart.svg.append("g")
    				.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    			x.domain(["On Reef", "Adjacent Reef"]);
  				y.domain([0, d3.max(data, function(d) { return d.y; })]);

  				var xAxis = this.chart.xAxis = d3.svg.axis().scale(x).orient("bottom").tickFormat(function(d) {
  					if (d === 'On Reef') {
  						return d + ' Tourism\n(diving, snorkelling,\nglass-bottom boats)';
  					} else {
  						return d + ' Tourism\n(beaches, calm seas,\nviews, seafood)';
  					}
					
				});

  				var yAxis = this.chart.yAxis = d3.svg.axis().scale(y).orient("left").ticks(6).tickFormat(function(d) {
					return self.addCommas(d / 1000000);
				});

  				g.append("g")
					.attr("class", "x axis")
					.attr("transform", "translate(0," + height + ")")
					.call(xAxis)
					.selectAll('.x .tick text')
					.call(function(t) {
						t.each(function(d) {
							var tx = d3.select(this);
							var str = tx.text().split('\n');
							tx.text('');
							tx.append('tspan')
								.attr("x", 0)
                				.attr("dy",".9em")
								.text(str[0]);
							tx.append('tspan')
								.attr("x", 0)
                				.attr("dy","1.3em")
                				.attr("font-size",".85em")
								.text(str[1]);
							tx.append('tspan')
								.attr("x", 0)
                				.attr("dy","1.2em")
                				.attr("font-size",".85em")
								.text(str[2]);
						});
					});

			    g.append("g")
					.attr("class", "y axis")
					.call(yAxis);

				g.append("text")
                    .attr("class", "yaxis-label")
                    .attr("transform", "rotate(-90)")
                    .attr("y", 0 - margin.left + 10)
                    .attr("x", 0 - (height / 2))
                    .attr("text-anchor", "middle")
                    .text("Millions USD");

                g.selectAll(".bar-label")
                	.data(data)
                	.enter().append("text")
                	.text(function(d) {
                		return '$' + self.addCommas(d.y);
                	})
                	.attr('class', 'bar-label')
                	.attr("x", function(d) { return (x(d.x) + (x.rangeBand() / 2)) - (this.getBBox().width / 2); })
                	.attr("y", function(d) { return y(d.y) - 18; });

                g.selectAll(".bar-label-per")
                	.data(data)
                	.enter().append("text")
                	.text(function(d) {
                		return d.per + '%';
                	})
                	.attr('class', 'bar-label-per')
                	.attr("x", function(d) { return (x(d.x) + (x.rangeBand() / 2)) - (this.getBBox().width / 2); })
                	.attr("y", function(d) { return y(d.y) - 5; });

  				g.selectAll(".bar")
				    .data(data)
				    .enter().append("rect")
						.attr("class", function(d) {
							return "stat bar " + d.x.replace(' ', '-');
						})
						.attr("title", function(d) {
							return parseInt(d.y).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
						})
						.attr("data-layer", function(d) {
							return d.x.replace(' ', '_').toLowerCase();
						})
						.attr("x", function(d) { return x(d.x); })
						.attr("y", function(d) { return y(d.y); })
						.attr("width", x.rangeBand())
						.attr("height", function(d) { return height - y(d.y); })
						.on('click', function(d) {
							self.$el.find('.stats .stat.active').removeClass('active');
							d3.selectAll('.chart rect.bar.disabled').classed('disabled', false);
							d3.selectAll('.chart rect.bar.active').classed('active', false);
							if (d.x === "On Reef") {
								d3.selectAll('.chart rect.bar.Adjacent-Reef').classed('disabled', true);
								d3.selectAll('.chart rect.bar.On-Reef').classed('active', true);
							} else { // Adjacent
								d3.selectAll('.chart rect.bar.On-Reef').classed('disabled', true);
								d3.selectAll('.chart rect.bar.Adjacent-Reef').classed('active', true);
							}
							self.updateLayers();
						});

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
                	.text(function(d) {
                		return '$' + self.addCommas(d.y);
                	})
                	.attr("x", function(d) { return (self.chart.x(d.x) + (self.chart.x.rangeBand() / 2)) - (this.getBBox().width / 2); })
                	.transition().duration(1200).ease("sin-in-out")
                	.attr('class', 'bar-label')
                	.attr("y", function(d) { return self.chart.y(d.y) - 18; });

                this.chart.svg.selectAll(".bar-label-per")
                	.data(data)
                	.text(function(d) {
                		return d.per + '%';
                	})
                	.attr("x", function(d) { return (self.chart.x(d.x) + (self.chart.x.rangeBand() / 2)) - (this.getBBox().width / 2); })
                	.transition().duration(1200).ease("sin-in-out")
                	.attr('class', 'bar-label-per')
                	.attr("y", function(d) { return self.chart.y(d.y) - 5; });

				this.chart.svg.selectAll(".bar")
				    .data(data)
				    .classed('stat', true)
				    .classed('bar', true)
				    .transition().duration(1200).ease("sin-in-out")
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