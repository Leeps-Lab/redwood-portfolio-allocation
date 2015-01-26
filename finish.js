Redwood.controller("PAFinishController", ["$scope", "RedwoodSubject", function($scope, rs) {
  
    $scope.results = []
    $scope.totalEarnings = 5.0;

    var recomputeEarnings = function() {
        // recompute total earnings
        $scope.totalEarnings = $scope.results.reduce(function(prev, next) {
            next.earnings = next.selected ? next.points/140 : 0;
            return prev + next.earnings;
        }, 5.0);

        rs.trigger("earnings", $scope.totalEarnings);
    };

    rs.on_load(function() {

        var results = rs.subject[rs.user_id].data["results"];

        for (var i = 0; i < results.length; i++) {
            
            var result = results[i];

            $scope.results[result.round] = {
                round: result.round + 1,
                stock: result.allocation.stock,
                bond: result.allocation.bond,
                returnFromBonds: result.returnFromBonds,
                returnFromStocks: result.returnFromStocks,
                isPracticeRound: result.isPracticeRound,
                points: 0.0,
                earnings: 0.0,
                selected: false
            };
        }

        rs.send("__mark_paid__", {period: 1, paid: result.points})
        rs.send("__set_points__", {period: 1, points: 0});
        rs.send("__set_show_up_fee__", {show_up_fee: 5.0});
        rs.send("__set_conversion_rate__", {conversion_rate: 1/140});
        recomputeEarnings();
    });

    rs.on("selected_round", function(round) {
        var result = $scope.results[round-1];
        result.selected = !result.selected;
        result.points = result.returnFromStocks + result.returnFromBonds;
        rs.send("__set_points__", {period: 1, points: result.points});
        recomputeEarnings();
    });
}]);