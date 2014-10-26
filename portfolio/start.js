/*
  Portfolio Allocation: start.js
*/

/*
  Convenience functions, mostly for loading stochastic series data
*/
Redwood.factory("PortfolioAllocation", ["$q", "$http", function($q, $http) {
  var api = {};

  api.defaultStochasticFunction = function(x, round) {
    return Math.random() * 1000 + 500;
  };

  // returns a promise that passes a function to its then callback
  api.createStochasticFunction = function(configString) {
    var matchURL = configString.match(/http.*/);
    if (matchURL) {
      // get stochastic series csv file from URL
      var fullURL = configString;
      var deferred = $q.defer();

      $http({method: "GET", url: fullURL})
        .success(function(data, status, headers, config) {
          // build stochastic series (simple csv parsing with String.split)
          var rows = data.split("\n");

          // create series arrays
          var stochasticSeries = [];
          for (var i = 0; i < rows[0].split(",").length; i++) {
            stochasticSeries[i] = [];
          }

          // fill arrays with csv data
          for (var i = 0; i < rows.length; i++) {
            var cells = rows[i].split(",");
            for (var j = 0; j < cells.length; j++) {
              stochasticSeries[j][i] = parseFloat(cells[j]);
            }
          }
          console.log(stochasticSeries);

          var stochasticFunction = function(x, round) {
            // normalized to 0.5 to 1.5, for now
            return stochasticSeries[round % stochasticSeries.length][x] / 1000.0;
          };

          deferred.resolve(stochasticFunction);
        })
        .error(function(data, status, headers, config) {
          console.log("(;-;) " + data);
          deferred.resolve(status);
        });

      return deferred.promise;

    } else if (configString) {
      var deferred = $q.defer();
      deferred.resolve(new Function("x", "round", "return " + configString));
      return deferred.promise;

    } else {
      var deferred = $q.defer();
      deferred.resolve(api.defaultStochasticFunction);
      return deferred.promise;
    }
  };

  return api;
}]);

/*
  Application controller
*/
Redwood.controller("SubjectCtrl", ["$scope", "RedwoodSubject", "$timeout", "PortfolioAllocation", function($scope, rs, $timeout, experiment) {
  // Initialize some scope variables (the reset are initialized in on_load)

  $scope.isLoadingStochasticSeries = true;
  $scope.isSimulating = false;
  $scope.plotNeedsRedraw = false;

  $scope.round = 0;
  $scope.actualRound = 1;
  $scope.roundResults = [];

  // stores computed stochastic values like so:
  // [[[0, val], [1, val], [day, val], ...], [values for round], ...]
  // $scope.marketValues[i] is sequence of stochastic values for round i
  $scope.marketValues = [];

  $scope.portfolioReturns = [[]]; // only one needs to show at a time

  // Setup scope variable bindings

  $scope.$watch("allocation.stock", function() {
    $scope.allocation.bond = $scope.config.wealthPerRound - $scope.allocation.stock;
  });
  $scope.$watch("allocation.bond", function() {
    $scope.allocation.stock = $scope.config.wealthPerRound - $scope.allocation.bond;
  });

  $scope.$watch(function() {return rs.is_realtime}, function(is_realtime) {
    if (is_realtime) {

      if ($scope.isSimulating) {
        // hack to get day simulation "timeout chain" to resume.
        var lastSimulatedDay = $scope.marketValues[$scope.round].length - 1;
        $timeout(simulateDay(lastSimulatedDay + 1), $scope.config.secondsPerDay * 1000);
      } else {
        // force the plot to redraw
        console.log("forcing plot redraw");
        $scope.plotNeedsRedraw = true;
      }
    }
  })

  $scope.$watch("round", function(round) {
    $scope.actualRound = round + 1;
  });

  // Setup scope functions

  $scope.confirmAllocation = function() {
    isSimulating = true; // too make sure controls are disabled
    rs.trigger("startedRound", {
      round: $scope.round,
      allocation: $scope.allocation
    });
  };

  // Other functions

  var getMarketValue = function(round, day) {
    if (day < 0) return 1.0;
    return $scope.marketValues[round][day][1];
  }

  var firstMarketValueForRound = function(round) {
    return getMarketValue(round, 0);
  }

  var lastMarketValueForRound = function(round) {
    return getMarketValue(round, $scope.config.daysPerRound - 1);
  }

  var marketReturnPercentageForRound = function(round) {
    var valuesForRound = $scope.marketValues[round];
    var lastIndex = valuesForRound.length - 1;
    return valuesForRound[lastIndex][1] / valuesForRound[0][1] - 1.0;
  }

  var currentStockReturn = function() {
    return $scope.allocation.stock * lastMarketValueForRound($scope.round);
  }

  var currentBondReturn = function() {
    return $scope.allocation.bond * (1.0 + $scope.config.bondReturn);
  }

  var simulateDay = function(day) {
    return function() {
      if (day < $scope.config.daysPerRound) {

        var triggerNextDay = function() {          
          rs.trigger("simulatedDay", {
            round: $scope.round,
            day: day,
            value: $scope.config.stochasticFunction(day, $scope.round)
          });
        };

        // wait for the stochastic function to load if necessary
        // (If the stochastic function is a promise, then it hasn't loaded yet)
        if (typeof $scope.config.stochasticFunction.then === "function") {
          if (rs.is_realtime) {
            $scope.config.stochasticFunction.then(triggerNextDay);
          }
        } else {
          triggerNextDay();
        }

      } else {
        // compute round results
        rs.trigger("roundEnded", {
          round: $scope.round,
          allocation: $scope.allocation,
          returnFromBonds: currentBondReturn(),
          returnFromStocks: currentStockReturn(),
        });

      }
    }
  };

  // Experiment Initialization

  rs.on_load(function() {
    // Load configuration
    $scope.config = {
      rounds: rs.config.rounds                 || 20,
      daysPerRound: rs.config.daysPerRound     || 252,
      secondsPerDay: rs.config.secondsPerDay   || 0.01,
      startingWealth: rs.config.startingWealth || 1000,
      wealthPerRound: rs.config.wealthPerRound || 1000,
      minimumWealth: rs.config.minimumWealth   || 200,
      bondReturn: rs.config.bondReturn         || 0.2,
      plotMinY: rs.config.plotMinY             || 0.0,
      plotMaxY: rs.config.plotMaxY             || 2.0,
      stochasticFunction: null,
    };

    // Load stochastic function (may be a dropbox URL)
    // Don't allow allocation confirmation until the stochastic function has been loaded.
    // Set the value of the stochastic function to the promise so that other things
    // that need to use it an schedule a then handler on the promise.
    $scope.config.stochasticFunction = experiment.createStochasticFunction(rs.config.stochasticFunction)
      .then(function(stochasticFunction) {
        $scope.isLoadingStochasticSeries = false;
        $scope.config.stochasticFunction = stochasticFunction;
      });

    $scope.allocation = {
      stock: $scope.config.wealthPerRound/2,
      bond: $scope.config.wealthPerRound/2
    };

    $scope.bank = $scope.config.startingWealth;
    $scope.realizedGain = 0;
  });

  // Message Response Handlers

  rs.on("startedRound", function(data) {
    // for recovery
    $scope.allocation = data.allocation;

    $scope.marketValues.push([]);
    $scope.portfolioReturns[0] = [];
    $scope.isSimulating = true;
    simulateDay(0)();
  });

  rs.on("simulatedDay", function(data) {
    var round = data.round;
    var day = data.day;
    var value = data.value;
    // add today's results to the stochastic series
    $scope.marketValues[round].push([day, value]);

    // Cumulative return over time
    var stockReturn = value / $scope.marketValues[round][0][1];
    var bondReturnValue = (($scope.config.bondReturn * (day + 1) / $scope.config.daysPerRound) + 1.0) * $scope.allocation.bond;
    var stockReturnValue = stockReturn * $scope.allocation.stock;
    var portfolioReturn = (bondReturnValue + stockReturnValue) / $scope.config.startingWealth;
    
    /* Daily return over time */
    /*var previousValue = getMarketValue(round, day - 1);
    var stockReturn = value / previousValue;
    var bondReturnValue = (($scope.config.bondReturn / $scope.config.daysPerRound) + 1.0) * $scope.allocation.bond;
    var stockReturnValue = stockReturn * $scope.allocation.stock;
    var portfolioReturn = (bondReturnValue + stockReturnValue) / $scope.config.startingWealth;*/

    $scope.portfolioReturns[0].push([day, portfolioReturn]);
    // simulate the next day
    if (rs.is_realtime) {
      $timeout(simulateDay(day + 1), $scope.config.secondsPerDay * 1000);
    }
  });

  rs.on("roundEnded", function(data) {

    var marketReturnPercentage = marketReturnPercentageForRound(data.round);
    
    var totalReturn = data.returnFromStocks + data.returnFromBonds;
    var realizedReturnPercentage = (totalReturn / $scope.config.wealthPerRound) - 1.0;

    // add entry to round results
    $scope.roundResults.push({
      allocation: data.allocation,
      marketReturn: marketReturnPercentage,
      realizedReturn: realizedReturnPercentage,
    });

    // MONEY IN THE BANK
    $scope.bank += totalReturn - $scope.config.wealthPerRound;

    // if the subject is broke, end this guy's whole career
    if ($scope.bank <= $scope.config.minimumWealth) {
      $scope.bank = $scope.config.minimumWealth;
      rs.set_points($scope.bank);
      rs.send("__set_conversion_rate__", {conversion_rate: 0.01});
      rs.next_period(5);
    }

    $scope.round = data.round + 1;
    $scope.isSimulating = false;

    // if all rounds are finished, finish it up
    if ($scope.round >= $scope.config.rounds) {
      rs.set_points($scope.bank);
      rs.send("__set_conversion_rate__", {conversion_rate: 0.01});
      rs.next_period(5);
    }
  });

}]);

/*
  Plot Directive
*/
Redwood.directive("paPlot", ["RedwoodSubject", function(rs) {
  return {
    scope: {
      paPlot: "=", // The set of sequences of market values
      portfolioReturns: "=", // The set of sequences of total portfolio return
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

      var redrawPlot = function(marketValues, portfolioReturns) {
        if (marketValues && rs.is_realtime) {
          // convert raw data into formatted data series
          var flotData = [];
          for (var i = 0; i < marketValues.length; i++) {
            flotData[i] = {
              data: marketValues[i],
              color: i == marketValues.length - 1 ? "#6666ff" : "#c8c8e0" 
            };
          }
          for (var i = 0; i < portfolioReturns.length; i++) {
            flotData.push({
              data: portfolioReturns[i],
              color: i == portfolioReturns.length - 1 ? "#66ff66" : "#c8e0c8"
            });
          }

          // plot the data!
          /*$.plot(element, flotData, {
            xaxis: {
              min: 0,
              max: scope.config.daysPerRound + 1
            },
            yaxis: {
              min: scope.config.plotMinY,
              max: scope.config.plotMaxY
            }
          });*/

          var xScale = d3.scale.linear()
            .domain([0, scope.config.daysPerRound + 1])
            .range([0, width]);
          var yScale = d3.scale.linear()
            .domain([scope.config.plotMinY, scope.config.plotMaxY])
            .range([height, 0]);

          var line = d3.svg.line()
            .x(function(datum) {
              return xScale(datum[0]);
            })
            .y(function(datum) {
              return yScale(datum[1]);
          });

          var dataset = plot.selectAll(".series").data(flotData);

          dataset.enter()
            .append("path")
            .attr("class", "series")
            .attr("stroke-width", 2)
            .attr("fill", "none");

          dataset
            .attr("stroke", function(series) {
              return series.color;
            })
            .datum(function(series) {
              return series.data;
            })
            .attr("d", line)

          dataset.exit()
            .remove();

          scope.needsRedraw = false;
        }
      }

      scope.$watch(function() {return scope.needsRedraw}, function() {
        redrawPlot(scope.paPlot, scope.portfolioReturns);
      });
      scope.$watch(function() {return scope.paPlot}, function() {
        redrawPlot(scope.paPlot, scope.portfolioReturns);
      }, true);
      scope.$watch(function() {return scope.portfolioReturns}, function() {
        redrawPlot(scope.paPlot, scope.portfolioReturns);
      }, true);
      scope.$watch(function() {return scope.config}, function() {
        if (scope.config) {
          var xScale = d3.scale.linear()
            .domain([0, scope.config.daysPerRound-1])
            .range([0, plotWidth]);
          var yScale = d3.scale.linear()
            .domain([scope.config.plotMinY, scope.config.plotMaxY])
            .range([plotHeight, 0]);

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

          // 0th tick is more prominent
          svg.selectAll("g.y.axis .tick").filter(function(d) {
            console.log(d)
            return d == 1;
          }).classed("center-tick", true);
        }
      });
    }
  }
}]);

/*
  Percentage Input Directive
*/
Redwood.directive("paPercentage", ["RedwoodSubject", "$filter", function(rs, $filter) {
  return {
    require: "ngModel",
    scope: {
      max: "="
    },
    link: function(scope, element, attrs, controller) {
      controller.$parsers.push(
          function(viewValue){
              return parseFloat(viewValue * scope.max) / 100;
          }
      );
      controller.$formatters.push(
          function(modelValue){
              return $filter('number')(modelValue / scope.max * 100, 1) + "%";
          }
      );
    }
  }
}]);