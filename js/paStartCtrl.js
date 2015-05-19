/*
  Application controller
*/
portfolioAllocation.controller("paStartCtrl", [
  "$scope",
  "RedwoodSubject",
  "$timeout",
  "paStochasticSeriesLoader",
  "ConfigManager", 
  function($scope, rs, $timeout, seriesLoader, configManager) {
  // Initialize some scope variables (the reset are initialized in on_load)

  $scope.isLoadingStochasticSeries = true;
  $scope.isSimulating = false;
  $scope.plotNeedsRedraw = false;

  $scope.round = 0;
  $scope.actualRound = 1;
  $scope.statusMessage = "";
  $scope.roundResults = [];

  // stores computed stochastic values like so:
  // [[[0, val], [1, val], [day, val], ...], [values for round], ...]
  // $scope.marketValues[i] is sequence of stochastic values for round i
  $scope.marketValues = [];
  $scope.currentMarketValues = [];
  $scope.preSimulatedValues = [];
  $scope.portfolioValues = [];

  // some nice functions
  var marketReturnPercentageForRound = function(round) {
    var valuesForRound = $scope.marketValues[round];
    var lastIndex = valuesForRound.length - 1;
    return valuesForRound[lastIndex][1] / valuesForRound[0][1] - 1.0;
  }

  var currentStockReturn = function() {
    return $scope.allocation.stock * $scope.currentMarketValues[$scope.config.daysPerRound - 1][1];
  }

  var currentBondReturn = function() {
    return $scope.allocation.bond * (1.0 + $scope.config.bondReturn);
  }

  var deferUntilFinishedLoading = function(deferred) {
    if ($scope.isLoadingStochasticSeries) {
      $scope.config.stochasticFunction.then(deferred);
    } else {
      deferred();
    }
  }

  // Setup scope variable bindings

  $scope.$watch("allocation.stock", function() {
    $scope.allocation.bond = $scope.config.wealthPerRound - $scope.allocation.stock;
  });
  $scope.$watch("allocation.bond", function() {
    $scope.allocation.stock = $scope.config.wealthPerRound - $scope.allocation.bond;
  });

  $scope.$watch(function() {return rs.is_realtime}, function(is_realtime) {
    if (is_realtime) {
      deferUntilFinishedLoading(function() {
        if ($scope.isSimulating) {
          // The previous round simulation did not finish because the page was refreshed
          simulateRoundRealtime($scope.round, $scope.allocation);
        } else {
          // force the plot to redraw
          $scope.plotNeedsRedraw = true;
        }
      });
    }
  });

  $scope.$watch("round", function(round) {
    $scope.actualRound = round + 1;
  });

  // Setup scope functions

  $scope.confirmAllocation = function() {
    $scope.isSimulating = true; // make sure controls are disabled
    $scope.statusMessage = "Waiting for other subjects...";
    rs.synchronizationBarrier("pa.confirm_" + $scope.round).then(function() {
      rs.trigger("pa.roundStarted", {
        round: $scope.round,
        allocation: $scope.allocation
      });
    });
  };

  // Other functions

  var simulateDay = function(day, round, allocation) {
    var value = $scope.config.stochasticFunction(day, round);

    // add today's market results to the stochastic series
    //$scope.marketValues[round].push([day, value]);
    $scope.currentMarketValues.push([day, value]);

    // Cumulative return over time
    var stockReturn = value / $scope.currentMarketValues[0][1];
    var bondReturnValue = (($scope.config.bondReturn * (day + 1) / $scope.config.daysPerRound) + 1.0) * $scope.allocation.bond;
    var stockReturnValue = stockReturn * $scope.allocation.stock;
    var portfolioReturn = (bondReturnValue + stockReturnValue) / $scope.config.startingWealth;

    // add today's portfolio results to the portfolio series
    $scope.portfolioValues.push([day, portfolioReturn]);
  };

  var simulateRoundRealtime = function(round, allocation) {
    var simulatorForDay = function(day) {
      return function() {
        if (day < $scope.config.daysPerRound) {
          simulateDay(day, round, allocation);
          $timeout(simulatorForDay(day + 1), $scope.config.secondsPerDay * 1000);
        } else {
          rs.trigger("pa.roundEnded", {
            period: rs.period,
            round: $scope.round,
            allocation: $scope.allocation,
            returnFromBonds: currentBondReturn(),
            returnFromStocks: currentStockReturn(),
            isPracticeRound: round < $scope.config.practiceRounds
          });
        }
      }
    };
    simulatorForDay(0)();
  };

  var simulateRoundSync = function(round, allocation) {
    for (var day = 0; day < $scope.config.daysPerRound; day++) {
      simulateDay(day, round, allocation);
    }
  };

  // Experiment Initialization

  rs.on_load(function() {
    // Load configuration
    $scope.config = configManager.loadPerSubject(rs, {
      "rounds"             : 20,
      "preSimulatedRounds" : 5,
      "practiceRounds"     : 5,
      "daysPerRound"       : 252,
      "secondsPerDay"      : 0.01,
      "startingWealth"     : 1000,
      "wealthPerRound"     : 1000,
      "bondReturn"         : 0.2,
      "plotMinY"           : 0.0,
      "plotMaxY"           : 2.0,
      "stochasticFunction" : null,
    });

    // Load stochastic function (may be a dropbox URL)
    // Don't allow allocation confirmation until the stochastic function has been loaded.
    // Set the value of the stochastic function to the promise so that other things
    // that need to use it an schedule a then handler on the promise.
    $scope.config.stochasticFunction = seriesLoader.createStochasticFunction($scope.config.stochasticFunction)
      .then(function(stochasticFunction) {
        $scope.isLoadingStochasticSeries = false;

        // Add specified number of "previous" market series,
        for (var round = 0; round < $scope.config.preSimulatedRounds; round++) {
          $scope.preSimulatedValues.push([]);

          for (var day = 0; day < $scope.config.daysPerRound; day++) {
            var value = stochasticFunction(day, round);
            $scope.preSimulatedValues[round].push([day, value]);
          }
        }

        // Swizzle $scope.config.stochasticFunction with a new function
        // to make up for the pre-simulated rounds
        $scope.config.stochasticFunction = function(day, round) {
          return stochasticFunction(day, $scope.config.preSimulatedRounds + round);
        };
      });

    $scope.allocation = {
      stock: $scope.config.wealthPerRound/2,
      bond: $scope.config.wealthPerRound/2
    };

    $scope.realizedGain = 0;
  });

  // Message Response Handlers

  rs.on("pa.roundStarted", function(data) {
    var is_realtime = rs.is_realtime;

    deferUntilFinishedLoading(function() {
      $scope.statusMessage = "Simulating round...";
      $scope.allocation = data.allocation;

      //$scope.marketValues.push([]);
      $scope.currentMarketValues = [];
      $scope.portfolioValues = [];
      $scope.isSimulating = true;

      // if this is a sync message, don't simulate this round
      if (is_realtime) {
        simulateRoundRealtime(data.round, data.allocation);
      }
    });
  });

  rs.on("pa.roundEnded", function(data) {
    var is_realtime = rs.is_realtime;
    deferUntilFinishedLoading(function() {
      // if this is a sync message, recover the simulation for this round
      if (!is_realtime) {
        simulateRoundSync(data.round, data.allocation);
      }

      // set result data
      rs.set("pa.results", data);
      
      $scope.marketValues.push($scope.currentMarketValues);

      $scope.statusMessage = "";
      var marketReturnPercentage = marketReturnPercentageForRound(data.round);
      
      var totalReturn = data.returnFromStocks + data.returnFromBonds;
      var realizedReturnPercentage = (totalReturn / $scope.config.wealthPerRound) - 1.0;

      // add entry to round results
      $scope.roundResults.push({
        allocation: data.allocation,
        marketReturn: marketReturnPercentage,
        realizedReturn: realizedReturnPercentage,
        isPracticeResult: data.isPracticeRound
      });

      $scope.round = data.round + 1;
      $scope.isSimulating = false;

      // if all rounds are finished, finish it up
      if ($scope.round >= $scope.config.rounds) {
        rs.next_period(5);
        $scope.statusMessage = "Experiment completed. Loading payouts...";
        $scope.isSimulating = true;
      }
    });
  });

}]);
