/*
  Convenience functions, mostly for loading stochastic series data
*/
Redwood.factory("paStochasticSeriesLoader", ["$q", "$http", function($q, $http) {
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
