require({
    // Specify library locations.
    packages: [
        {
        	name: "jquery",
            location: "//ajax.googleapis.com/ajax/libs/jquery/1.9.0",
            main: "jquery.min"
        },
        {
            name: "d3",
            location: "//d3js.org",
            main: "d3.v3.min"
        }
    ]
});

define([
	'dojo/_base/declare',
	'd3',
	'framework/PluginBase',
	'dijit/layout/ContentPane',
	'esri/layers/ArcGISDynamicMapServiceLayer',
	'esri/geometry/Extent',
	'esri/SpatialReference',
	'esri/tasks/query',
    'esri/tasks/QueryTask',
    'dojo/dom',
    './State',
    'dojo/text!./region.json',
    'dojo/text!./template.html',
	], function(declare,
		d3,
		PluginBase,
		ContentPane,
		ArcGISDynamicMapServiceLayer,
		Extent,
		SpatialReference,
		Query,
        QueryTask,
		dom,
		State,
		RegionConfig,
		template
	) {

		return declare(PluginBase, {
			toolbarName: 'Recreation & Tourism',
			fullName: 'Recreation & Tourism',
			resizable: false,
			width: 425,
			size: 'custom',
			chart: {},

			initialize: function(frameworkParameters) {
				declare.safeMixin(this, frameworkParameters);
				this.state = new State();
				// This gets the defaults
				this.region = this.state.getRegion();
				this.stat = this.state.getStat();
				this.scaleLock = this.state.getScaleLock();

				var query = new Query();
				this.regionConfig = $.parseJSON(RegionConfig);
                var queryTask = new QueryTask(this.regionConfig.service + '/135');
				this.$el = $(this.container);

                query.where = '1=1';
                query.returnGeometry = false;
                query.outFields = ['*'];
                queryTask.execute(query, _.bind(this.processData, this));
			
				// Hack that affects all plugins in app until a framework change can be made
				$('.plugin-minimize').hide();
			},

			processData: function(data) {
				var transformedData = {};
				$.each(data.features, function(idx, datum) {
					transformedData[datum.attributes.region] = datum.attributes;
				});
				this.stats = transformedData;
			},

			createLayerList: function(service) {
				var list = {};
				_.chain(service.layer.layerInfos).filter(function(layer) {
					if (layer.subLayerIds) {
						return layer.subLayerIds.length === 5;
					}
					return false;
				}).each(function(layer) {
					list[layer.name.trim().replace(/\./g,'').toLowerCase()] = {
						"reef_value": layer.subLayerIds[0],
						"highest_value_reefs": layer.subLayerIds[1],
						"total_visitation": layer.subLayerIds[2],
						"on_reef": layer.subLayerIds[3],
						"adjacent_reef": layer.subLayerIds[4],
					};
				});
				this.layerList = list;
				this.changeRegion(this.region);
				if (this.stat === 'on_reef' || this.stat === 'adjacent_reef') {
					this.selectBarStat(this.stat);
				}
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
					self.changeRegion(region);
				});

				this.$el.find('#scale-data').on('change', _.bind(this.updateLayers, this));

			},

			changeRegion: function(region) {
				this.updateStats(region);
				this.updateChartData(region);
				this.updateLayers();

				this.state = this.state.setRegion(region);

				if (region === 'Global') {
					this.$el.find('.right-side .form-component').hide();
				} else {
					this.$el.find('.right-side .form-component').show();
				}
			},

			setState: function(data) {
                this.state = new State(data);
				this.region = data.region;
				this.stat = data.stat;
				this.scaleLock = data.scaleLock;
            },

            getState: function() {
                return {
                    region: this.state.getRegion(),
                    stat: this.state.getStat(),
                    scaleLock: this.state.getScaleLock()
                };
            },

			activate: function() {
				if (!this.layerGlobal) {
					this.render();

					// Adjust toolbar title position to make room for image button
					this.$el.prev('.sidebar-nav').find('.nav-title').css("margin-left", "25px");

					this.layerGlobal = new ArcGISDynamicMapServiceLayer(this.regionConfig.service, {
						id: 'global',
						maxScale: 500000
					});

					this.layerGlobal.on('load', _.bind(this.createLayerList,this));
					
					this.layerGlobal.setVisibleLayers([1]);
					this.map.addLayer(this.layerGlobal);

					$('#map-0').append('<div class="zoom-to-far-error">Data not available at this zoom.<br>Please zoom out.</div>');
				}
			},

			deactivate: function() {
				this.map.removeLayer(this.layerGlobal);
				this.layerGlobal = null;
				$('.zoom-to-far-error').remove();
			},

			hibernate: function() {

			},

			render: function() {
				var regions = Object.keys(this.stats).sort();

				this.$el.html(_.template(template)({
					regions: regions,
					region: this.region,
					stat: this.stat,
					scaleLock: this.scaleLock
                }));

                this.$el.find('#chosenRegion').chosen({
                	disable_search_threshold: 20,
                	width: '100%'
                });

                $(this.container).parent().find('.viewCrsInfoGraphicIcon').remove();
                $(this.container).parent().find('.sidebar-nav').prepend('<button title="View infographic" class="button button-default viewCrsInfoGraphicIcon ig-icon"><img src="plugins/recreation-tourism/InfographicIcon_v1_23x23.png" alt="show overview graphic"></button>');
				$(this.container).parent().find(".viewCrsInfoGraphicIcon").on('click',function(c){
					TINY.box.show({
						animate: true,
						url: 'plugins/recreation-tourism/infographic.html',
						fixed: true,
						width: 600,
						height: 499
					});
				}).tooltip();

                this.renderChart();

                this.bindEvents();

                this.$el.find(".stat-info span").tooltip();
			},

			updateLayers: function() {
				var layerid;
				var region = this.$el.find("#chosenRegion").val();
				var scaled = this.$el.find("#scale-data").is(":checked");
				var layer = this.$el.find('.stat.active').attr('data-layer');
				this.state = this.state.setStat(layer);
				this.state = this.state.setScaleLock(scaled);

				if (scaled) {
					layerid = this.layerList[region.toLowerCase()][layer];
				} else {
					layerid = this.layerList.global[layer];
				}

				this.layerGlobal.setVisibleLayers([layerid]);
			},

			updateStats: function(region) {
				var map = this.map;
				if (region === 'Global') {
					this.$el.find('.stats .header .region-label').html('the World');
					this.map.setExtent(new Extent(-135.175781,-36.244273,56.162109,58.355630, new SpatialReference({wkid: 4326})), false);
				} else {
					this.$el.find('.stats .header .region-label').html(region);

					var query = new Query();

                	var queryTask = new QueryTask(this.regionConfig.service + '/' + this.layerList[region.toLowerCase()].reef_value);
	                query.where = '1=1';
	                queryTask.executeForExtent(query, function(result) {
	                	if (result) {
	                		//TODO Check if overzoomed and zoom out
	                		map.setExtent(result.extent.expand(1.1), true);
	                	}
	                });
					/*this.$el.find('.reef_value .fa-info-circle').attr('title', this.config[region].TOOLTIPS.reef_value);
					this.$el.find('.total_visitation .fa-info-circle').attr('title', this.config[region].TOOLTIPS.total_visitation);
					this.$el.find('.highest_value_reefs .fa-info-circle').attr('title', this.config[region].TOOLTIPS.highest_value_reefs);
				*/
				}
				this.$el.find('.stat.reef_value .number .value').html(this.addCommas(this.stats[region].reef_value));
				this.$el.find('.stat.total_visitation .number .value').html(this.addCommas(this.stats[region].total_visitation_value));
				this.$el.find('.stat.highest_value_reefs .number .value').html(this.addCommas(this.stats[region].highest_value_reefs));
				this.$el.find('.stat.reef_area .number .value').html(this.addCommas(this.stats[region].total_reef_area.toFixed(0)));
				this.$el.find('.stat.reef_area_tourism .number .value').html(this.addCommas(this.stats[region].reefs_tourism_area.toFixed(0)));
				this.$el.find('.stat.reef_area_tourism .number .percentage').html((this.stats[region].reefs_tourism_area_percent * 100).toFixed(0));
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
							self.selectBarStat(d.x);
						});
			},

			selectBarStat: function(stat) {
				this.$el.find('.stats .stat.active').removeClass('active');
				d3.selectAll('.chart rect.bar.disabled').classed('disabled', false);
				d3.selectAll('.chart rect.bar.active').classed('active', false);
				if (stat === "on_reef" || stat === "On Reef") {
					d3.selectAll('.chart rect.bar.Adjacent-Reef').classed('disabled', true);
					d3.selectAll('.chart rect.bar.On-Reef').classed('active', true);
				} else if (stat === "adjacent_reef" || stat === "Adjacent Reef") {
					d3.selectAll('.chart rect.bar.On-Reef').classed('disabled', true);
					d3.selectAll('.chart rect.bar.Adjacent-Reef').classed('active', true);
				}
				this.updateLayers();
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
