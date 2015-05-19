portfolioAllocation.controller("paFinishCtrl", ["$scope", "RedwoodSubject", function($scope, rs) {
  
    $scope.results = []

    $scope.payoutFunction = function(entry) {
        return entry.selected ? entry.portfolioValue/140 : 0;
    }

    rs.on_load(function() {

        var results = rs.subject[rs.user_id].data["pa.results"];

        if (!results) {
            return;
        }

        for (var i = 0; i < results.length; i++) {
            
            var result = results[i];

            $scope.results[result.round] = {
                period: result.round + 1,
                round: result.round + 1,
                stock: result.allocation.stock,
                bond: result.allocation.bond,
                returnFromBonds: result.returnFromBonds,
                returnFromStocks: result.returnFromStocks,
                portfolioValue: result.returnFromStocks + result.returnFromBonds,
                isPractice: result.isPracticeRound,
                earnings: 0.0,
                selected: false
            };
        }

        rs.send("__set_points__", {period: 1, points: 0});
        rs.send("__set_show_up_fee__", {show_up_fee: 5.0});
        rs.send("__set_conversion_rate__", {conversion_rate: 1/140});
    });

    rs.on("pa.select_payoff_round", function(round) {
        var result = $scope.results[round-1];
        result.selected = !result.selected;
        rs.send("__set_points__", {period: 1, points: result.portfolioValue});
        rs.send("__mark_paid__", {period: 1, paid: $scope.payoutFunction(result)})
    });
}]);