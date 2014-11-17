

Redwood.controller("SubjectCtrl", ["$rootScope", "$scope", "RedwoodSubject", function($rootScope, $scope, rs) {

  $scope.decisions = [
    {
      text: "1/10 of $2.00, 9/10 of $1.60 or 1/10 of $3.85, 9/10 of $0.10?",
      choice1: [{chance: 0.1, payoff: 2.00}, {chance: 0.9, payoff: 1.60}],
      choice2: [{chance: 0.1, payoff: 3.85}, {chance: 0.9, payoff: 0.10}]
    },
    {
      text: "2/10 of $2.00, 8/10 of $1.60 or 2/10 of $3.85, 8/10 of $0.10?",
      choice1: [{chance: 0.2, payoff: 2.00}, {chance: 0.8, payoff: 1.60}],
      choice2: [{chance: 0.2, payoff: 3.85}, {chance: 0.8, payoff: 0.10}]
    },
    {
      text: "3/10 of $2.00, 7/10 of $1.60 or 3/10 of $3.85, 7/10 of $0.10?",
      choice1: [{chance: 0.3, payoff: 2.00}, {chance: 0.7, payoff: 1.60}],
      choice2: [{chance: 0.3, payoff: 3.85}, {chance: 0.7, payoff: 0.10}]
    },
    {
      text: "4/10 of $2.00, 6/10 of $1.60 or 4/10 of $3.85, 6/10 of $0.10?",
      choice1: [{chance: 0.4, payoff: 2.00}, {chance: 0.6, payoff: 1.60}],
      choice2: [{chance: 0.4, payoff: 3.85}, {chance: 0.6, payoff: 0.10}]
    },
    {
      text: "5/10 of $2.00, 5/10 of $1.60 or 5/10 of $3.85, 5/10 of $0.10?",
      choice1: [{chance: 0.5, payoff: 2.00}, {chance: 0.5, payoff: 1.60}],
      choice2: [{chance: 0.5, payoff: 3.85}, {chance: 0.5, payoff: 0.10}]
    },
    {
      text: "6/10 of $2.00, 4/10 of $1.60 or 6/10 of $3.85, 4/10 of $0.10?",
      choice1: [{chance: 0.6, payoff: 2.00}, {chance: 0.4, payoff: 1.60}],
      choice2: [{chance: 0.6, payoff: 3.85}, {chance: 0.4, payoff: 0.10}]
    },
    {
      text: "7/10 of $2.00, 3/10 of $1.60 or 7/10 of $3.85, 3/10 of $0.10?",
      choice1: [{chance: 0.7, payoff: 2.00}, {chance: 0.3, payoff: 1.60}],
      choice2: [{chance: 0.7, payoff: 3.85}, {chance: 0.3, payoff: 0.10}]
    },
    {
      text: "8/10 of $2.00, 2/10 of $1.60 or 8/10 of $3.85, 2/10 of $0.10?",
      choice1: [{chance: 0.8, payoff: 2.00}, {chance: 0.2, payoff: 1.60}],
      choice2: [{chance: 0.8, payoff: 3.85}, {chance: 0.2, payoff: 0.10}]
    },
    {
      text: "9/10 of $2.00, 1/10 of $1.60 or 9/10 of $3.85, 1/10 of $0.10",
      choice1: [{chance: 0.9, payoff: 2.00}, {chance: 0.1, payoff: 1.60}],
      choice2: [{chance: 0.9, payoff: 3.85}, {chance: 0.1, payoff: 0.10}]
    },
    {
      text: "10/10 of $2.00, 0/10 of $1.60 or 10/10 of $3.85, 0/10 of $0.10",
      choice1: [{chance: 1.0, payoff: 2.00}, {chance: 0.0, payoff: 1.60}],
      choice2: [{chance: 1.0, payoff: 3.85}, {chance: 0.0, payoff: 0.10}]
    }
  ];

  $scope.riskAversionText = [
    "highly risk loving",
    "highly risk loving",
    "very risk loving",
    "risk loving",
    "risk neutral",
    "slightly risk averse",
    "risk averse",
    "very risk averse",
    "highly risk averse",
    "stay in bed",
    "stay in bed"
  ];
  
  // bound to the users radio button selections
  $scope.subjectDecisions = [];
  $scope.redwoodLoaded = false;
  $scope.unansweredQuestions = 10;
  $scope.periodOver = false;

  $scope.finishPeriod = function() {
    var score = $scope.subjectDecisions.reduce(function(prev, curr, index, array) {
      return prev + (curr === "lessRisk" ? 1 : 0);
    }, 0);

    rs.trigger("finished_questions", {
      "view": $scope.treatment,
      "result": score,
      "result-text": $scope.riskAversionText[score]
    });
    
    $scope.periodOver = true;
    rs.next_period();
  };

  $scope.selectOption = function(decisionId, selection) {
    rs.trigger("selected_option", {
      "treatment": $scope.treatment,
      "question-text": $scope.decisions[decisionId].text,
      "question": decisionId+1,
      "selection": selection 
    });
  };

  rs.on("selected_option", function(value) {
    // seems redundant, but necessary for restoring when the page is refreshed
    $scope.subjectDecisions[value.question-1] = value.selection;

    var answerCount = $scope.subjectDecisions.reduce(function(prev, curr, index, array) {
      return prev + (typeof curr !== "undefined" ? 1 : 0);
    }, 0);

    $scope.unansweredQuestions = 10 - answerCount;
  });
  
  rs.on_load(function() { //called once the page has loaded for a new sub period
    $scope.user_id = rs.user_id;
    $scope.treatment = rs.config.treatment;
    $scope.redwoodLoaded = true;
  });
}]);

// Rendering
Redwood.directive("choiceView", ["RedwoodSubject", function(rs) {
  
  var primary_color_1 = "#229fd9";
  var primary_color_2 = "#db2e1b";
  var secondary_color_1 = "#1571a5";
  var secondary_color_2 = "#b02113";

  var renderers = {
    "text": function(choice) {
      var fraction0 = (choice[0].chance * 10).toString() + "/10";
      var fraction1 = (choice[1].chance * 10).toString() + "/10";
      var dollar0 = "$"+choice[0].payoff.toFixed(2);
      var dollar1 = "$"+choice[1].payoff.toFixed(2);
      var text = fraction0 + " chance of " + dollar0 + ", " + fraction1 + " chance of " + dollar1;
      var alignElem = '<span style="display: inline-block; height: 100%; vertical-align: middle"></span>';
      var textElem = '<span style="display: inline-block; vertical-align: middle;">' + text + '</span>';
      return alignElem + textElem;
    },

    "bar": function(choice) {
      var width0 = choice[0].chance * 410;
      var width1 = choice[1].chance * 410;
      return '<svg width="100%" height="100%" viewBox="0 0 410 80"> \
        <rect width="'+width0+'" height="20" x="0" y="0" fill="'+primary_color_1+'" /> \
        <rect width="'+width1+'" height="20" x="'+width0+'" y="0" fill="'+primary_color_2+'" /> \
        <text x="0" y="40"> \
          '+"$"+choice[0].payoff.toFixed(2)+'\
        </text> \
        <text x="'+(width0)+'" y="40"> \
          '+"$"+choice[1].payoff.toFixed(2)+'\
        </text> \
      </svg>';
    },

    "bar-inverted": function(choice) {
      var width0 = choice[0].chance * 410;
      var width1 = choice[1].chance * 410;
      var textX0 = width0 < 150 ? width0 + 10 : width0 - 10;
      var textX1 = width1 < 150 ? width1 + 10 : width1 - 10;
      var textAnchor0 = width0 < 150 ? "start" : "end";
      var textAnchor1 = width1 < 150 ? "start" : "end";
      return '<svg width="100%" height="100%" viewBox="0 0 410 80"> \
        <rect width="'+width0+'" height="40" x="0" y="0" fill="'+primary_color_1+'" /> \
        <rect width="'+width1+'" height="40" x="0" y="40" fill="'+primary_color_2+'" /> \
        <text x="'+textX0+'" y="24" text-anchor="'+textAnchor0+'"> \
          '+choice[0].chance*100+"% chance of $"+choice[0].payoff.toFixed(2)+'\
        </text> \
        <text x="'+textX1+'" y="64" text-anchor="'+textAnchor1+'"> \
          '+choice[1].chance*100+"% chance of $"+choice[1].payoff.toFixed(2)+'\
        </text> \
      </svg>';
    },

    "bar-height": function(choice) {
      var width0 = choice[0].chance * 410;
      var width1 = choice[1].chance * 410;
      var maxHeight = 40;
      var height0 = choice[0].payoff/4.0 * maxHeight;
      var height1 = choice[1].payoff/4.0 * maxHeight;
      return '<svg width="100%" height="100%" viewBox="0 0 410 80"> \
        <rect width="'+width0+'" height="'+height0+'" x="0" y="'+(maxHeight-height0)+'" fill="'+primary_color_1+'" /> \
        <rect width="'+width1+'" height="'+height1+'" x="'+width0+'" y="'+(maxHeight-height1)+'" fill="'+primary_color_2+'" /> \
        <text x="0" y="'+(maxHeight+20)+'"> \
          '+"$"+choice[0].payoff.toFixed(2)+'\
        </text> \
        <text x="'+(width0)+'" y="'+(maxHeight+20)+'"> \
          '+"$"+choice[1].payoff.toFixed(2)+'\
        </text> \
      </svg>';
    },

    "pie": function(choice) {
      return '<canvas width="410" height="80"></canvas>';
    },

    "pie-height": function(choice) {
      return '<canvas width="410" height="80"></canvas>';
    }
  };
  
  return {
    template: function(element, attrs) {
      return '';
    },
    link: function postLink(scope, element, attrs) {
      var choice = scope.$eval(attrs.choice);
      element.html(renderers[scope.treatment](choice));

      // hacky, but can't see any other angulary way to do this
      if (scope.treatment === "pie") {
        var colors = [primary_color_1, primary_color_2];
        var context = $("canvas", element).get(0).getContext("2d");
        draw_pie(context, 50, 40, 40, choice, colors);

        // draw legend
        context.fillStyle = colors[0];
        context.fillRect(120, 10, 20, 20);

        context.fillStyle = colors[1];
        context.fillRect(120, 50, 20, 20);

        context.fillStyle = "#000000";
        context.font = "14px sans-serif";
        context.textBaseline = "middle";
        context.fillText(choice[0].chance * 100 + "% chance of $" + choice[0].payoff.toFixed(2), 150, 20);
        context.fillText(choice[1].chance * 100 + "% chance of $" + choice[1].payoff.toFixed(2), 150, 60);
      }

      if (scope.treatment === "pie-height") {
        var colors = [[primary_color_1, secondary_color_1], [primary_color_2, secondary_color_2]];
        var context = $("canvas", element).get(0).getContext("2d");
        draw_pie_3d(context, 50, 0, 50, choice, colors);
      }
    }
  };
}]);
