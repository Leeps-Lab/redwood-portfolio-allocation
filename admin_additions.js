Redwood.controller("PAAdminAdditionsController", ["Admin", "$scope", function(ra, $scope) {
    ra.on_load(function () {
        $scope.allRounds = [];
        for (var i = 0; i < ra.get_config(1, 1).rounds; ++i) {
            $scope.allRounds.push(i+1);
        }
    });
}]);