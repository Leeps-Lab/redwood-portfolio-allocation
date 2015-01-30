Redwood.controller("PAAdminAdditionsController", ["Admin", "$scope", function(ra, $scope) {
    var period = 1;

    ra.on_load(function () {
        $scope.allRounds = [];
        for (var i = 0; i < ra.get_config(period, 1).rounds; ++i) {
            $scope.allRounds.push(i+1);
        }
    });

    ra.recv("pa.results", function(subject, data) {
        period = data.period;
        $scope.allRounds = [];
        for (var i = 0; i < ra.get_config(period, 1).rounds; ++i) {
            $scope.allRounds.push(i+1);
        }
    });
}]);