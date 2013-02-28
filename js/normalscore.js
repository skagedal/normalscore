var normalPlot;

function fromIQ(iq) { return (iq - 100) / 15; }
function toIQ(z) { return z * 15 + 100; }

function fromZ(z) { return z; }
function toZ(z) { return z; }

function fromPerc(perc) { return jStat.normal.inv(perc / 100, 0, 1); }
function toPerc(z) { return jStat.normal.cdf(z, 0, 1) * 100; }

function fromStanine(stanine) { return (stanine - 5) / 2; }
function toStanine(z) { 
    return Math.min(9, Math.max(1, Math.round(z * 2 + 5))); 
}

function fromSta19(s19) { return (s19 - 10) / 3; }
function toSta19(z) {
    return Math.min(19, Math.max(1, Math.round(z * 3 + 10)));
}

function roundNumber(number, digits) {
    var multiple = Math.pow(10, digits);
    var roundedNum = Math.round(number * multiple) / multiple;
    return roundedNum;
}

function update_scales(z) {
    var normal = roundNumber(z, 2);
    var perc = roundNumber(toPerc(z), 2);
    var iq = roundNumber(toIQ(z), 1);
    var stanine = toStanine(z);
    var sta19 = toSta19(z);

    $("#outputHeader").after("<tr><td>" + normal + "</td><td>" + 
			     perc + "</td><td>" + iq + "</td><td>" + 
			     stanine + "</td><td>" + sta19 + "</td></tr>");

    var colors = ["#ff0000", "#ff8888", "#ffcccc", "#ffeeee"];
    var i;

    var oldMarkings = normalPlot.getOptions().grid.markings;
    var newMarkings = [ { xaxis: { from: z, to: z },
			  color: colors[0] } ];

    for (i = 0; i < Math.min(colors.length - 1, oldMarkings.length); i++) {
	newMarkings.push( { xaxis: oldMarkings[i].xaxis,
			    color: colors[i + 1] });
    }

    normalPlot.getOptions().grid.markings = newMarkings;
    normalPlot.draw();
}


$(document).ready(function() {
    var curve = [];
    for (var i = -5; i <= 5.0; i += 0.1)
        curve.push([i, jStat.normal.pdf(i, 0, 1)]);

    normalPlot = $.plot($("#plot"), [
	{ data: curve, label: null}
    ], {
	crosshair: {
	    mode: "x"
	},
	grid: {
	    markings: [],
	    clickable: true,
	    hoverable: true
	}
	
    });

    $("#plot").bind("plotclick", function (event, pos, item) {
	update_scales(pos.x);
    });

    $("select#inputtype").change(function() {
	$("#score").val("");
    });

    $("#scoreform").submit(function() {
	var score = parseFloat($("#score").val());
	switch($("#inputtype").val()) {
	case 'z':
	    update_scales(score);
	    break;
	case 'iq':
	    update_scales(fromIQ(score));
	    break;
	case 'perc':
	    update_scales(fromPerc(score));
	    break;
	case 'stanine':
	    update_scales(fromStanine(score));
	    break;
	case 'sta19':
	    update_scales(fromSta19(score));
	    break;
	}
	return false;
    });
});
