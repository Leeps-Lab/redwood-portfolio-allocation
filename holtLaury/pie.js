// terrible functions for drawing 2D and 3D pie charts in a Canvas element

function normalized_angle(angle) {
  while (angle > Math.PI*2) {
    angle -= Math.PI*2;
  }
  return angle;
}

function pie_top_sort_angle(angle, newAngle) {
  var epsilon = 0.001;
  if (angle < Math.PI/2) {
    if (newAngle < Math.PI/2) {
      return newAngle-epsilon;
    } else {
      return Math.PI/2;
    }
  } else if (angle < Math.PI) {
    return angle+epsilon;
  } else if (angle < 3*Math.PI/2) {
    if (newAngle < 3*Math.PI/2) {
      return newAngle-epsilon;
    } else {
      return 3*Math.PI/2;
    }
  } else {
    return angle+epsilon;
  }
}

function sort_pie_elements(e1, e2) {
    return Math.sin(e1.sort_angle)-Math.sin(e2.sort_angle);
}

function draw_pie_arc(context, startAngle, endAngle, cx, cy, radius, bottom, height) {
  context.beginPath();
  context.moveTo(cx, bottom-(cy+height));
  context.lineTo(cx+Math.cos(startAngle)*radius, bottom-(cy+height)+Math.sin(startAngle)*radius);
  context.arc(cx, bottom-(cy+height), radius, startAngle, endAngle);
  context.lineTo(cx, bottom-(cy+height));
  context.closePath();
  context.fill();
}

function draw_pie_edge(context, angle, cx, cy, radius, bottom, height) {
  context.beginPath();
  context.moveTo(cx, bottom-cy);
  context.lineTo(cx, bottom-(cy+height));
  context.lineTo(cx+Math.cos(angle)*radius, bottom-(cy+height)+Math.sin(angle)*radius);
  context.lineTo(cx+Math.cos(angle)*radius, bottom-cy+Math.sin(angle)*radius);
  context.lineTo(cx, bottom-cy);
  context.closePath();
  context.fill();
}

function draw_pie_border(context, startAngle, endAngle, cx, cy, radius, bottom, height) {
  var angle1 = startAngle;
  var angle2 = endAngle;
  if (angle1 >= Math.PI) angle1 = 0;
  if (angle2 >= Math.PI) angle2 = Math.PI;
  context.beginPath();
  context.moveTo(cx+Math.cos(angle1)*radius, bottom-(cy+Math.sin(angle1)*radius));
  context.arc(cx, bottom-cy, radius, angle1, angle2);
  context.lineTo(cx+Math.cos(angle2)*radius, bottom-(cy+height+Math.sin(angle2)*radius));
  context.arc(cx, bottom-(cy+height), radius, angle2, angle1, true);
  context.lineTo(cx+Math.cos(angle1)*radius, bottom-(cy+Math.sin(angle1)*radius));
  context.closePath();
  context.fill();
}

function draw_pie_3d(context, cx, cy, radius, outcomes, colors) {
  var bottom = 100;
  var heightScale = 10;
  var elements = [];
  var offset = 0.1;

  var angle = offset;
  for (var i = 0; i < outcomes.length; i++) {
    var arcLength = Math.PI*2*outcomes[i].chance;
    var newAngle = angle+arcLength;
    var height = outcomes[i].payoff*heightScale;
    var edge_color = context.fillStyle = colors[i][1];
    var top_color = context.fillStyle = colors[i][0];
    newAngle = normalized_angle(newAngle);
    angle = normalized_angle(angle);
    if (Math.abs(angle-newAngle) < 0.01) {
      elements.push({
        "type": "top",
        "sort_angle": pie_top_sort_angle(angle, newAngle),
        "angle": 0,
        "newAngle": Math.PI*2,
        "height": height,
        "color": top_color
      });
      elements.push({
        "type": "border",
        "sort_angle": Math.PI/2, // in front of almost everything
        "angle":  0,
        "newAngle": Math.PI,
        "height": height,
        "color": edge_color
      });
      break;
    } 
    // Add edges
    if (angle >= Math.PI/2 && angle <= 3*Math.PI/2) {
      elements.push({
        "type": "edge",
        "sort_angle": angle,
        "angle": angle,
        "height": height,
        "color": edge_color
      });
    }
    if (newAngle <= Math.PI/2 || newAngle >= 3*Math.PI/2) {
      elements.push({
        "type": "edge",
        "sort_angle": newAngle,
        "angle": newAngle,
        "height": height,
        "color": edge_color
      });
    }
    // Add border
    if (newAngle < Math.PI) {
      elements.push({
        "type": "border",
        "sort_angle": Math.PI/2, // in front of almost everything
        "angle":  angle > newAngle ? 0 : angle,
        "newAngle": newAngle,
        "height": height,
        "color": edge_color
      });
    }
    if (angle < Math.PI) {
      elements.push({
        "type": "border",
        "sort_angle": Math.PI/2, // in front of almost everything
        "angle": angle,
        "newAngle": newAngle > Math.PI || newAngle < angle ? Math.PI : newAngle,
        "height": height,
        "color": edge_color
      });
    }
    if (angle >= Math.PI && newAngle >= Math.PI && newAngle <= angle) {
      elements.push({
        "type": "border",
        "sort_angle": Math.PI/2, // in front of almost everything
        "angle": 0,
        "newAngle": Math.PI,
        "height": height,
        "color": edge_color
      });
    }
    // Add back and front of top
    if (newAngle <= Math.PI && angle <= Math.PI) {
      if (angle <= newAngle) {
        elements.push({
          "type": "top",
          "sort_angle": pie_top_sort_angle(angle, newAngle),
          "angle": angle,
          "newAngle": newAngle,
          "height": height,
          "color": top_color
        });
      } else {
        elements.push({
          "type": "top",
          "sort_angle": pie_top_sort_angle(angle, Math.PI),
          "angle": angle,
          "newAngle": Math.PI,
          "height": height,
          "color": top_color
        });
        elements.push({
          "type": "top",
          "sort_angle": pie_top_sort_angle(Math.PI, Math.PI*2),
          "angle": Math.PI,
          "newAngle": Math.PI*2,
          "height": height,
          "color": top_color
        });
        elements.push({
          "type": "top",
          "sort_angle": pie_top_sort_angle(0, newAngle),
          "angle": 0,
          "newAngle": newAngle,
          "height": height,
          "color": top_color
        });
      }
    }
    if (newAngle >= Math.PI && angle >= Math.PI) {
      if (angle <= newAngle) {
        elements.push({
          "type": "top",
          "sort_angle": pie_top_sort_angle(angle, newAngle),
          "angle": angle,
          "newAngle": newAngle,
          "height": height,
          "color": top_color
        });
      } else {
        elements.push({
          "type": "top",
          "sort_angle": pie_top_sort_angle(angle, Math.PI*2),
          "angle": angle,
          "newAngle": Math.PI*2,
          "height": height,
          "color": top_color
        });
        elements.push({
          "type": "top",
          "sort_angle": pie_top_sort_angle(0, Math.PI),
          "angle": 0,
          "newAngle": Math.PI,
          "height": height,
          "color": top_color
        });
        elements.push({
          "type": "top",
          "sort_angle": pie_top_sort_angle(Math.PI, newAngle),
          "angle": Math.PI,
          "newAngle": newAngle,
          "height": height,
          "color": top_color
        });
      }
    }
    if (newAngle >= Math.PI && angle <= Math.PI) {
      elements.push({
        "type": "top",
        "sort_angle": pie_top_sort_angle(angle, Math.PI),
        "angle": angle,
        "newAngle": Math.PI,
        "height": height,
        "color": top_color
      });
      elements.push({
        "type": "top",
        "sort_angle": pie_top_sort_angle(Math.PI, newAngle),
        "angle": Math.PI,
        "newAngle": newAngle,
        "height": height,
        "color": top_color
      });
    }
    if (newAngle <= Math.PI && angle >= Math.PI) {
      elements.push({
        "type": "top",
        "sort_angle": pie_top_sort_angle(angle, Math.PI*2),
        "angle": angle,
        "newAngle": Math.PI*2,
        "height": height,
        "color": top_color
      });
      elements.push({
        "type": "top",
        "sort_angle": pie_top_sort_angle(0, newAngle),
        "angle": 0,
        "newAngle": newAngle,
        "height": height,
        "color": top_color
      });
    }
    angle = newAngle;
  }
  
  elements.sort(sort_pie_elements);
  
  context.save();
  context.scale(1, 0.5);
  
  for (i = 0; i < elements.length; i++) {
    var element = elements[i];
    context.fillStyle = element.color; 
    if (element.type == "edge") {
      draw_pie_edge(context, element.angle, cx, cy, radius, bottom, element.height);
    } else if (element.type == "border") {
      draw_pie_border(context, element.angle, element.newAngle, cx, cy, radius, bottom, element.height);
    } else if (element.type == "top") {
      draw_pie_arc(context, element.angle, element.newAngle, cx, cy, radius, bottom, element.height);
    }
  }
  context.restore();
}

function draw_pie(context, cx, cy, radius, outcomes, colors) {
  var angle = 0;
  for (var i = 0; i < outcomes.length; i++) {
    var arcLength = Math.PI*2*outcomes[i].chance;
    var newAngle = angle+arcLength;
    context.fillStyle = colors[i];
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(cx+Math.cos(angle)*radius, cy+Math.sin(angle)*radius);
    context.arc(cx, cy, radius, angle, newAngle);
    context.lineTo(cx, cy);
    context.closePath();
    context.fill();
    angle = newAngle;
  }
}

function draw_pie_const_radius(context, cx, cy, r, outcomes, colors) {
  var angle = 0;
  for (var i = 0; i < outcomes.length; i++) {
    var arcLength = Math.PI*2*outcomes[i].chance;
    var newAngle = angle+arcLength;
    var radius = r*outcomes[i].payoff/3.85;
    context.fillStyle = colors[i];
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(cx+Math.cos(angle)*radius, cy+Math.sin(angle)*radius);
    context.arc(cx, cy, radius, angle, newAngle);
    context.lineTo(cx, cy);
    context.closePath();
    context.fill();
    angle = newAngle;
  }
}

function draw_pie_const_area(context, cx, cy, area_const, outcomes, colors) {
  var angle = 0;
  for (var i = 0; i < outcomes.length; i++) {
    var arcLength = Math.PI*2*outcomes[i].chance;
    var radius = Math.sqrt(outcomes[i].payoff*area_const/arcLength);
    var newAngle = angle+arcLength;
    context.fillStyle = colors[i];
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(cx+Math.cos(angle)*radius, cy+Math.sin(angle)*radius);
    context.arc(cx, cy, radius, angle, newAngle);
    context.lineTo(cx, cy);
    context.closePath();
    context.fill();
    angle = newAngle;
  }
}
