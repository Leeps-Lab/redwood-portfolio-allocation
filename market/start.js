Redwood.factory("PortfolioAllocation", function() {
  return {

    defaultStochasticFunction: function(x) {
      return Math.random() * 1.0 + 0.5;
    },
  }
});

Redwood.controller("SubjectCtrl", ["$scope", "RedwoodSubject", "$timeout", "PortfolioAllocation", function($scope, rs, $timeout, experiment) {
  // Initialize scope variables

  $scope.isSimulating = false;
  $scope.plotNeedsRedraw = false;

  $scope.round = 0;
  $scope.bank = 0;
  $scope.realizedGain = 0;
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
        console.log("resuming simulation timeout chain");
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
      allocation: $scope.allocation
    });
  };

  // Other functions

  // use rs.is_realtime to buffer draws

  var simulateDay = function(day) {
    return function() {
      if (day < $scope.config.daysPerRound) {

        rs.trigger("simulatedDay", {
          round: $scope.round,
          day: day,
          value: $scope.config.stochasticFunction(day)
        });

      } else {

        rs.trigger("roundEnded", {
          round: $scope.round
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
      secondsPerDay: rs.config.secondsPerDay   || 0.05,
      startingWealth: rs.config.startingWealth || 1000,
      wealthPerRound: rs.config.wealthPerRound || 1000,
      minimumWealth: rs.config.minimumWealth   || 200,
      bondReturn: rs.config.bondReturn         || 0.2,
      plotMinY: rs.config.plotMinY             || 0.5,
      plotMaxY: rs.config.plotMaxY             || 1.5,
      stochasticFunction: new Function("x", "return " + rs.config.stochasticFunction) || experiment.defaultStochasticFunction,
    };

    $scope.allocation = {
      stock: $scope.config.wealthPerRound/2,
      bond: $scope.config.wealthPerRound/2
    };
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
    $scope.round = data.round + 1;
    $scope.isSimulating = false;
  })

}]);

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
          $.plot(element, plotData, {
            xaxis: {
              min: 0,
              max: scope.config.daysPerRound
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
