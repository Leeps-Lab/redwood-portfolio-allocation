/*
  Plot Directive
*/
portfolioAllocation.directive("paPlot", ["RedwoodSubject", function(rs) {
  return {
    scope: {
      marketValues: "=", // The set of sequences of market values
      currentMarketValues: "=", // The current sequence of market values
      preSimulatedValues: "=", // The set of sequences of existing market values
      portfolioValues: "=", // The current sequence of total portfolio return
      config: "=", // the experiment configuration
      needsRedraw: "=", // when set, the directive will attempt to redraw the plot
    },
    link: function(scope, element, attrs) {

      var xOffset = 30;
      var yOffset = 25;
      var width = $(element).width();
      var height = $(element).height();
      var plotWidth = width - xOffset;
      var plotHeight = height - yOffset;
      var xScale;
      var yScale;
      var lineFunction;

      var svg = d3.select(".pa-plot")
        .attr("width", width)
        .attr("height", height);
      var plot = svg.append("g")
        .attr("transform", "translate(" + xOffset + ",0)")

      plot.append("rect")
        .classed("plot-background", true)
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", plotWidth)
        .attr("height", plotHeight);

      var makeRedrawSeries = function(classname, dataname) {
        return function() {
          if (scope.marketValues && rs.is_realtime) {
            var selection = plot.selectAll("." + classname).data(scope[dataname]);
            selection.enter()
              .append("path")
              .classed("series " + classname, true);
            selection.attr("d", lineFunction);
            selection.exit().remove();
          }
        }
      }

      var makeRedrawLine = function(classname, datumname) {
        return function() {
          if (scope.marketValues && rs.is_realtime) {
            var path = plot.select("." + classname);
            if (path.empty()) {
              plot.append("path")
                .datum(scope[datumname])
                .classed("series " + classname, true)
                .attr("d", lineFunction);
            } else {
              path.datum(scope[datumname]).attr("d", lineFunction);
            }
          }
        }
      }

      var redrawMarketValues = makeRedrawSeries("market-old", "marketValues");
      var redrawCurrentMarketValues = makeRedrawLine("market", "currentMarketValues");
      var redrawPortfolioValues = makeRedrawLine("portfolio", "portfolioValues");
      var redrawPreSimulatedValues = makeRedrawSeries("market-existing", "preSimulatedValues");

      scope.$watch("needsRedraw", function() {
        redrawMarketValues();
        redrawCurrentMarketValues();
        redrawPortfolioValues();
        redrawPreSimulatedValues();
        scope.needsRedraw = false;
      });
      
      scope.$watch("marketValues", function() {
        redrawMarketValues();
        // hack to make sure that the current market value stays on top
        d3.select(".market").remove();
        redrawCurrentMarketValues();
      }, true);

      scope.$watch("currentMarketValues", redrawCurrentMarketValues, true);
      scope.$watch("portfolioValues", redrawPortfolioValues, true);
      scope.$watch("preSimulatedValues", redrawPreSimulatedValues, true);

      scope.$watch("config", function() {
        if (scope.config) {

          xScale = d3.scale.linear()
            .domain([0, scope.config.daysPerRound-1])
            .range([0, plotWidth]);
          yScale = d3.scale.linear()
            .domain([scope.config.plotMinY, scope.config.plotMaxY])
            .range([plotHeight, 0]);

          lineFunction = d3.svg.line()
            .x(function(datum) {
              return xScale(datum[0]);
            })
            .y(function(datum) {
              return yScale(datum[1] - 1.0);
          });

          var xAxis = d3.svg.axis()
            .ticks(5)
            .tickSize(-plotHeight)
            .scale(xScale)
            .orient("bottom");
          var yAxis = d3.svg.axis()
            .ticks(5)
            .tickSize(-plotWidth)
            .scale(yScale)
            .orient("left");

          svg.select("g.x.axis").remove();
          svg.select("g.y.axis").remove();

          svg.append("g")
            .classed("x axis", true)
            .attr("transform", "translate(" + xOffset + ", " + (plotHeight) + ")")
            .call(xAxis);

          svg.append("g")
            .classed("y axis", true)
            .attr("transform", "translate(" + xOffset + ",0)")
            .call(yAxis)
        }
      });
    }
  }
}]);