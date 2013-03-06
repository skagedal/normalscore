var NormalScore = {
    zscores: [],
    gridData: [],
    defaultScales: null,
    scales: null,
};

var normalPlot;

var SCALETYPE_NORMAL = "Normal";
var SCALETYPE_DISCRETE = "Discrete";
var SCALETYPE_PERCENTILE = "Percentile";

NormalScore.defaultScales = [
    {name: "Z-score",
     type: SCALETYPE_NORMAL,
     M: 0,
     SD: 1,
     digits: 2,
     show: true},
    {name: "IQ",
     type: SCALETYPE_NORMAL,
     M: 100,
     SD: 15,
     digits: 1,
     show: true},
    {name: "T-score",
     type: SCALETYPE_NORMAL,
     M: 50,
     SD: 10,
     digits: 1,
     show: true},
    {name: "Stanine",
     type: SCALETYPE_DISCRETE,
     M: 5,
     SD: 2,
     min: 1,
     max: 9,
     show: true},
    {name: "Sten",
     type: SCALETYPE_DISCRETE,
     M: 5.5,
     SD: 2,
     min: 1,
     max: 10,
     show: false},
    {name: "Standard 19",
     type: SCALETYPE_DISCRETE,
     M: 10,
     SD: 3,
     min: 1,
     max: 19,
     show: true},
    {name: "Percentile",
     type: SCALETYPE_PERCENTILE,
     SD: 100,			// used here for scaling
     digits: 2,
     show: true}
];

// deep copy
NormalScore.scales = $.extend(true, [], NormalScore.defaultScales);

var defaultScaleOrder = [
    "Z-score", "IQ", "T-score", "Stanine", "Sten", "Standard 19", "Percentile"];

function getScaleInfo(scaleName) {
    return $.grep(NormalScore.scales, function (element, index) {
	return element.name === scaleName; 
    })[0];
}

function toScale(z, scaleInfo) {
    var scaleValue;
    // "SD" should really be read as scale factor, and "M" as offset
    var factor = $.isNumeric(scaleInfo.SD) ? scaleInfo.SD : 1;
    var offset = $.isNumeric(scaleInfo.M) ? scaleInfo.M : 0;
    switch(scaleInfo.type) {
    case SCALETYPE_NORMAL:
	scaleValue = z * factor + offset;
	break;
    case SCALETYPE_DISCRETE:
	scaleValue = Math.round(z * factor + offset);
	break;
    case SCALETYPE_PERCENTILE:
	scaleValue = jStat.normal.cdf(z, 0, 1) * factor + offset;
	break;
    }
    if ($.isNumeric(scaleInfo.min))
	scaleValue = Math.max(scaleValue, scaleInfo.min);
    if ($.isNumeric(scaleInfo.max))
	scaleValue = Math.min(scaleValue, scaleInfo.max);

    return scaleValue;
}
   
function fromScale(scaleValue, scaleInfo) {
    var z;
    // "SD" should really be read as scale factor, and "M" as offset
    var factor = $.isNumeric(scaleInfo.SD) ? scaleInfo.SD : 1;
    var offset = $.isNumeric(scaleInfo.M) ? scaleInfo.M : 0;

    // When converting from scales to Z, we allow discrete values to 
    // be continuous and for values to break max/min boundaries,
    // such as "Stanine 19.3". Not sure if this makes sense, but 
    // if the user asks for it...? 
    switch(scaleInfo.type) {
    case SCALETYPE_NORMAL:
    case SCALETYPE_DISCRETE:
	z = (scaleValue - offset) / factor;
	break;
    case SCALETYPE_PERCENTILE:
	// Arbitrary clamping of input percentile to avoid silliness
	var p = Math.min(0.9999999, 
			 Math.max(0.0000001, (scaleValue - offset) / factor));
	z = jStat.normal.inv(p, 0, 1);
	break;
    }
    
    return z;
}

function toScaleFormattedString(z, scaleInfo) {
    // Converts z score to scale and formats it 
    var fmt = sprintf("%%.%df", scaleInfo.digits ? scaleInfo.digits : 0);
    return sprintf(fmt, toScale(z, scaleInfo));
}

function roundNumber(number, digits) {
    var multiple = Math.pow(10, digits);
    var roundedNum = Math.round(number * multiple) / multiple;
    return roundedNum;
}

function plucker(key) {
    return (function (obj) { 
	return obj[key]; 
    });
}

function renderScoreTable() {
    var activeScales = NormalScore.scales.filter(plucker("show"));
    var colHeaders = activeScales.map(plucker("name"));
    var newData = NormalScore.zscores.map(function (z) {
	return activeScales.map(function(scale) {
	    return toScaleFormattedString(z, scale);
	});
    });
    $("#outputTable").handsontable('loadData', newData);
    $("#outputTable").handsontable('updateSettings', 
				   {colHeaders: colHeaders});
}

function addScore(z) {
    NormalScore.zscores.push(z);

    renderScoreTable();

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

function updateTooltip(z) {
    $("#tooltip").html($.map(defaultScaleOrder, function(name) {
	return name + "=" + toScaleFormattedString(z, getScaleInfo(name));
    }).join(", "));
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
	addScore(pos.x);
    });

    $("#plot").bind("plothover", function (event, pos, item) {
	$("#tooltip").show();
	updateTooltip(pos.x);
    });
    $("#plot").mouseleave(function (event) {
	$("#tooltip").hide();
    });

    $("select#inputtype").change(function() {
	$("#score").val("");
    });

    $("#scoreform").submit(function() {
	var score = parseFloat($("#score").val());
	var scaleName = $("#inputtype").val();
	var scaleInfo = getScaleInfo(scaleName);
	addScore(fromScale(score, scaleInfo));

	$("#score").val("");
	return false;		// abort default submit
    });

    $("select#inputtype").append($.map(defaultScaleOrder, function(name) {
	return sprintf("<option value=\"%s\">%s</option>", name, name);
    }));

    $("#outputTable").handsontable({
	data: NormalScore.gridData,
	colHeaders: true
    });

    $("#setupScales").handsontable({
	data: NormalScore.scales,
	colHeaders: ["Name", "Type", "M", "SD", "Digits", "Show"],
	columns: [
	    {data: "name"},
	    {data: "type",
	     type: "autocomplete",
	     source: ["Normal", "Discrete", "Percentile"],
	     strict: true},
	    {data: "M",
	     type: "numeric"},
	    {data: "SD",
	     type: "numeric"},
	    {data: "digits",
	     type: "numeric"},
	    {data: "show",
	     type: Handsontable.CheckboxCell}
	],
	minSpareRows: 1,
	fillHandle: "vertical",
	onBeforeChange: function (data) {
	    for (var i = 0; i < data.length; i++) {
		// each data[i] is a change: [row, col, oldVal, newVal]
		// setting newVal to false discards the change
		switch (data[i][1]) { // column
		case "M":
		case "SD":
		case "digits":
		    var number = parseFloat(data[i][3]);
		    if ($.isNumeric(number))
			data[i][3] = number;
		    else
			data[i][3] = null;
		    break;
		}
	    }
	},
	onChange: function (changes, source) {
	    renderScoreTable();
	}
    });
				   
});
