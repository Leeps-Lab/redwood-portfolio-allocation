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
  $scope.roundResults = [];
  $scope.stochasticValues = [];

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
        var lastSimulatedDay = $scope.stochasticValues[$scope.round].length - 1;
        $timeout(simulateDay(lastSimulatedDay + 1), $scope.config.secondsPerDay * 1000);
      } else {
        // force the plot to redraw
        console.log("forcing plot redraw");
        $scope.plotNeedsRedraw = true;
      }
    }
  })

  // Setup scope functions

  $scope.confirmAllocation = function() {
    isSimulating = true; // too make sure controls are disabled
    rs.trigger("startedRound", {
      round: $scope.round,
      allocation: $scope.allocation
    });
  };

  // Other functions

  // use rs.is_realtime to buffer draws

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
        var valuesForRound = $scope.stochasticValues[$scope.round];
        var lastValue = valuesForRound[valuesForRound.length - 1][1];
        var returnFromStocks = $scope.allocation.stock * lastValue;
        var returnFromBonds = $scope.allocation.bond * (1.0 + $scope.config.bondReturn);
        var totalReturn = returnFromStocks + returnFromBonds;

        rs.trigger("roundEnded", {
          round: $scope.round,
          allocation: $scope.allocation,
          returnFromBonds: returnFromBonds,
          returnFromStocks: returnFromStocks,
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
      plotMinY: rs.config.plotMinY             || 0.5,
      plotMaxY: rs.config.plotMaxY             || 1.5,
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

    $scope.stochasticValues.push([]);
    $scope.isSimulating = true;
    simulateDay(0)();
  });

  rs.on("simulatedDay", function(data) {
    var round = data.round;
    var day = data.day;
    var value = data.value;

    // add today's results to the stochastic series
    $scope.stochasticValues[round].push([day, value]);

    // simulate the next day
    if (rs.is_realtime) {
      $timeout(simulateDay(day + 1), $scope.config.secondsPerDay * 1000);
    }
  });

  rs.on("roundEnded", function(data) {

    var totalReturn = data.returnFromStocks + data.returnFromBonds;
    var expectedReturnPercentage = (data.allocation.bond / $scope.config.wealthPerRound) * $scope.config.bondReturn; // ask what to do here
    var realizedReturnPercentage = (totalReturn - $scope.config.wealthPerRound) / $scope.config.wealthPerRound;

    // add entry to round results
    $scope.roundResults.push({
      allocation: data.allocation,
      diff: realizedReturnPercentage - expectedReturnPercentage,
      expected: expectedReturnPercentage,
      realized: realizedReturnPercentage,
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
Redwood.directive("raPlot", ["RedwoodSubject", function(rs) {
  return {
    scope: {
      raPlot: "=",
      config: "=",
      needsRedraw: "=",
    },
    link: function(scope, element, attrs) {

      var redrawPlot = function(plotData) {
        if (plotData && rs.is_realtime) {
          // convert raw data into formatted data series
          var flotData = [];
          for (var i = 0; i < plotData.length; i++) {
            flotData[i] = {
              data: plotData[i],
              color: i == plotData.length - 1 ? "#6666ff" : "#c8c8c8" 
            };
          }
          // plot the data!
          $.plot(element, flotData, {
            xaxis: {
              min: 0,
              max: scope.config.daysPerRound + 1
            },
            yaxis: {
              min: scope.config.plotMinY,
              max: scope.config.plotMaxY
            }
          });
          scope.needsRedraw = false;
        }
      }

      scope.$watch(function() {return scope.needsRedraw}, function() {
        redrawPlot(scope.raPlot);
      });
      scope.$watch(function() {return scope.raPlot}, redrawPlot, true);

    }
  }
}]);
