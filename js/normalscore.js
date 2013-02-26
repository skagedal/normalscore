var normalPlot;

function IQ(iq) { return (iq - 100.0) / 15.0; }
function toIQ(z) { return z * 15.0 + 100; }

function roundNumber(number, digits) {
    var multiple = Math.pow(10, digits);
    var roundedNum = Math.round(number * multiple) / multiple;
    return roundedNum;
}

function update_scales(z) {
    var normal = roundNumber(z, 2);
    var perc = roundNumber(jStat.normal.cdf(z, 0, 1) * 100, 2);
    var iq = roundNumber(z * 15 + 100, 1);
    var stanine = Math.min(9, Math.max(1, Math.round(z * 2 + 5)));

    $("#outputHeader").after("<tr><td>" + normal + "</td><td>" + 
			     perc + "</td><td>" + iq + "</td><td>" + 
			     stanine + "</td></tr>");

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


function blur_normal(event) {
    var z = parseFloat(event.target.value);
    update_scales(z);
}

function blur_percentile(event) {
    var z = jStat.normal.inv(parseFloat(event.target.value) / 100, 0, 1);
    update_scales(z);
}

function blur_iq(event) {
    var z = (parseFloat(event.target.value) - 100.0) / 15.0;
    update_scales(z);
}

function blur_stanine(event) {
    var z = (parseFloat(event.target.value) - 5.0) / 2.0;
    update_scales(z);
}

$(document).ready(function() {
    var curve = [];
    for (var i = -5; i <= 5.0; i += 0.1)
        curve.push([i, jStat.normal.pdf(i, 0, 1)]);

    normalPlot = $.plot($("#plot"), [
	{ data: curve, label: "Normalfördelning"}
    ], {
	crosshair: {
	    mode: "x"
	},
	grid: {
	    markings: [
/*		{ 
		    // Update this value and call normalPlot.draw()
		    xaxis: { from: -0, to: 0 },
		    color: "#ff0000"
		} */
	    ],
	    clickable: true,
	    hoverable: true
	}
	
    });

    $("#plot").bind("plotclick", function (event, pos, item) {
	update_scales(pos.x);
    });

/*    
    $("#normal").blur(blur_normal);
    $("#percentile").blur(blur_percentile);
    $("#iq").blur(blur_iq);
    $("#stanine").blur(blur_stanine); */
});
