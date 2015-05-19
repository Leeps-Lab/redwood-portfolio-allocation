/*
  Percentage Input Directive
*/
portfolioAllocation.directive("paPercentage", ["$filter", function($filter) {
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