Redwood.factory("PortfolioAllocation", function() {
  return {

    defaultStochasticFunction: function(x) {
      return Math.random() * 1.0 + 0.5;
    },
  }
});

Redwood.controller("SubjectCtrl", ["$scope", "RedwoodSubject", "$interval", "PortfolioAllocation", function($scope, rs, $interval, experiment) {
  $scope.round = 0;
  $scope.budget = 1000;
  $scope.bank = 0;
  $scope.realizedGain = 0;
  $scope.roundResults = [];
  $scope.stochasticValues = [[]];
  $scope.bondReturn = 0.2;

  $scope.allocation = {
    stock: $scope.budget/2,
    bond: $scope.budget/2
  };

  $scope.confirmAllocation = function() {
    rs.trigger("confirmAllocation", {
      stochasticValue: Math.random() * 2.0,
      allocation: $scope.allocation
    });
  };

  $scope.$watch("allocation.stock", function() {
    $scope.allocation.bond = $scope.budget - $scope.allocation.stock;
  });
  $scope.$watch("allocation.bond", function() {
    $scope.allocation.stock = $scope.budget - $scope.allocation.bond;
  });

  rs.on_load(function() {
    // Load configuration
    $scope.config = {
      startingWealth: rs.config.startingWealth || 1000,
      stochasticFunction: new Function("x", "return " + rs.config.stochasticFunction) || experiment.defaultStochasticFunction,
    };
  });

  rs.on("confirmAllocation", function(data) {
    var stochasticValue = data.stochasticValue;
    var allocation = data.allocation;

    var expectedReturn = ((1.0 - 1.0) * allocation.stock + $scope.bondReturn * allocation.bond) / $scope.budget;
    var realizedReturn = ((stochasticValue - 1.0) * allocation.stock + $scope.bondReturn * allocation.bond) / $scope.budget;

    $scope.stochasticValues[0].push([$scope.round++, stochasticValue]);
    $scope.roundResults.push({
      allocation: data.allocation,
      diff: realizedReturn - expectedReturn,
      expected: expectedReturn,
      realized: realizedReturn
    });

    $scope.bank += realizedReturn * $scope.budget;

  });

}]);

Redwood.directive("raPlot", ["RedwoodSubject", function(rs) {
  return {
    link: function(scope, element, attrs) {      
      // register listeners, intervals, etc here
      scope.$watch(attrs.raPlot, function(value) {
        if (value) {
          $.plot(element, value, {yaxis: {max: 2.0}})
        }
      }, true)

      $.plot(element, [[[0, 0], [1, 1]]], {yaxis: {max: 2.0}})
    }
  }
}]);
