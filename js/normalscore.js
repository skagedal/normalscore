// Object to hold all global app data
var NormalScore = {
    MIN: -4,
    MAX: 4,

    axisLabelPadding: 7,
    axisLabelFontSizePixels: 10,
    labelHeight: 15,
    extraAxisHeight: 18,	// I don't know where these come from

    plotHeight: 150,

    scaleType: {
	NORMAL: "Normal",
	DISCRETE: "Discrete",
	PERCENTILE: "Percentile"
    },
    scaleAxis: {
	NONE: "None",
	TOP: "Top",
	BOTTOM: "Bottom"
    },

    zscores: [],
    gridData: [],

    // Factory settings
    defaultScales: null,

    // Currently used scale setup
    scales: null,

    // Flot widget
    plot: null
};

NormalScore.totalAxisHeight = NormalScore.axisLabelPadding + 
    NormalScore.axisLabelFontSizePixels + NormalScore.labelHeight + 
    NormalScore.extraAxisHeight;

NormalScore.defaultScales = [
    {name: "Z-score",
     type: NormalScore.scaleType.NORMAL,
     M: 0,
     SD: 1,
     digits: 2,
     show: true,
     axis: NormalScore.scaleAxis.BOTTOM},
    {name: "IQ",
     type: NormalScore.scaleType.NORMAL,
     M: 100,
     SD: 15,
     digits: 1,
     show: true,
     axis: NormalScore.scaleAxis.BOTTOM},
    {name: "T-score",
     type: NormalScore.scaleType.NORMAL,
     M: 50,
     SD: 10,
     digits: 1,
     show: true,
     axis: NormalScore.scaleAxis.BOTTOM},
    {name: "Stanine",
     type: NormalScore.scaleType.DISCRETE,
     M: 5,
     SD: 2,
     min: 1,
     max: 9,
     show: true,
     axis: NormalScore.scaleAxis.BOTTOM},
    {name: "Sten",
     type: NormalScore.scaleType.DISCRETE,
     M: 5.5,
     SD: 2,
     min: 1,
     max: 10,
     show: false,
     axis: NormalScore.scaleAxis.NONE},
    {name: "Wechsler 19",
     type: NormalScore.scaleType.DISCRETE,
     M: 10,
     SD: 3,
     min: 1,
     max: 19,
     show: true,
     axis: NormalScore.scaleAxis.NONE},
    {name: "Percentile",
     type: NormalScore.scaleType.PERCENTILE,
     SD: 100,			// used here for scaling
     digits: 2,
     show: true,
     axis: NormalScore.scaleAxis.BOTTOM}
];

// deep copy
NormalScore.scales = $.extend(true, [], NormalScore.defaultScales);

function getScaleInfo(scaleName) {
    return $.grep(NormalScore.scales, function (element, index) {
	return element.name === scaleName; 
    })[0];
}

function checkScaleInfoValidity(scaleInfo) { 
    if (typeof (scaleInfo) === "undefined")
	throw new Error("Invalid scale info: undefined");
    switch (scaleInfo.type) {
    case NormalScore.scaleType.NORMAL:
    case NormalScore.scaleType.DISCRETE:
	if (!$.isNumeric(scaleInfo.M))
	    throw new Error("Invalid scale info: M not set or is not numeric");
	if (!$.isNumeric(scaleInfo.SD))
	    throw new Error("Invalid scale info: SD not set or is not numeric");
	if (scaleInfo.SD == 0)
	    throw new Error("Invalid scale info: SD is zero");
	return true;
    case NormalScore.scaleType.PERCENTILE:
	return true;
    }
    throw new Error(sprintf("Invalid scale info %s: invalid scale type: %s", scaleInfo.name,
			    scaleInfo.type));
}

function toScale(scaleInfo, z) {
    var scaleValue;
    // "SD" should really be read as scale factor, and "M" as offset
    var factor = $.isNumeric(scaleInfo.SD) ? scaleInfo.SD : 1;
    var offset = $.isNumeric(scaleInfo.M) ? scaleInfo.M : 0;
    switch(scaleInfo.type) {
    case NormalScore.scaleType.NORMAL:
	scaleValue = z * factor + offset;
	break;
    case NormalScore.scaleType.DISCRETE:
	scaleValue = Math.round(z * factor + offset);
	break;
    case NormalScore.scaleType.PERCENTILE:
	scaleValue = jStat.normal.cdf(z, 0, 1) * factor + offset;
	break;
    }
    if ($.isNumeric(scaleInfo.min))
	scaleValue = Math.max(scaleValue, scaleInfo.min);
    if ($.isNumeric(scaleInfo.max))
	scaleValue = Math.min(scaleValue, scaleInfo.max);

    return scaleValue;
}

function fromScale(scaleInfo, scaleValue) {
    var z;
    // "SD" should really be read as scale factor, and "M" as offset
    var factor = $.isNumeric(scaleInfo.SD) ? scaleInfo.SD : 1;
    var offset = $.isNumeric(scaleInfo.M) ? scaleInfo.M : 0;

    // When converting from scales to Z, we allow discrete values to 
    // be continuous and for values to break max/min boundaries,
    // such as "Stanine 19.3". Not sure if this makes sense, but 
    // if the user asks for it...? 
    switch(scaleInfo.type) {
    case NormalScore.scaleType.NORMAL:
    case NormalScore.scaleType.DISCRETE:
	z = (scaleValue - offset) / factor;
	break;
    case NormalScore.scaleType.PERCENTILE:
	// Arbitrary clamping of input percentile to avoid silliness
	var p = Math.min(0.9999999, 
			 Math.max(0.0000001, (scaleValue - offset) / factor));
	z = jStat.normal.inv(p, 0, 1);
	break;
    }
    
    return z;
}

// Curried versions
function createToScaleFunction(scaleInfo) {
    return function(z) {
	return toScale(scaleInfo, z);
    };
}
   
function createFromScaleFunction(scaleInfo) {
    return function(scaleValue) {
	return fromScale(scaleInfo, scaleValue);
    };
}

// Make Discrete type Normal and remove min/max clamping 
// Need this for calculation of plot axes
function normalizeScale(scaleInfo) {
    var newScaleInfo = $.extend({}, scaleInfo);
    newScaleInfo.min = null;
    newScaleInfo.max = null;
    if (newScaleInfo.type === NormalScore.scaleType.DISCRETE)
	newScaleInfo.type = NormalScore.scaleType.NORMAL;

    return newScaleInfo;
}
   
function toScaleFormattedString(scaleInfo, z) {
    try {
	checkScaleInfoValidity(scaleInfo);
    } catch (e) {
	return "INVALID";
    }
    // Converts z score to scale and formats it 
    var fmt = sprintf("%%.%df", scaleInfo.digits ? scaleInfo.digits : 0);
    return sprintf(fmt, toScale(scaleInfo, z));
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
	    return toScaleFormattedString(scale, z);
	});
    });
    if (newData.length === 0) {
	// Show an empty row, otherwise headers don't show
	newData = [ activeScales.map(function() { return ""; }) ];
    }
    $("#outputTable").handsontable('loadData', newData);
    $("#outputTable").handsontable('updateSettings', 
				   {colHeaders: colHeaders});
}

function addScore(z) {
    NormalScore.zscores.push(z);

    renderScoreTable();

    var colors = ["#ff0000", "#ff8888", "#ffcccc", "#ffeeee"];
    var i;

    var oldMarkings = NormalScore.plot.getOptions().grid.markings;
    var newMarkings = [ { xaxis: { from: z, to: z },
			  color: colors[0] } ];

    for (i = 0; i < Math.min(colors.length - 1, oldMarkings.length); i++) {
	newMarkings.push( { xaxis: oldMarkings[i].xaxis,
			    color: colors[i + 1] });
    }

    NormalScore.plot.getOptions().grid.markings = newMarkings;
    NormalScore.plot.draw();
}

function updateTooltip(z) {
    var activeScales = NormalScore.scales.filter(plucker("show"));
    $("#tooltip").html($.map(activeScales, function(scale) {
	return scale.name + " = " + toScaleFormattedString(scale, z);
    }).join("<br />"));
}

function updateInputType() {
    var nonEmptyScales = NormalScore.scales.filter(plucker("name"));
    var newHtml = nonEmptyScales.map(function(scale) {
	return sprintf("<option value=\"%s\">%s</option>", 
		       scale.name, scale.name);
    }).join("");

    var select = $("#inputtype");
    // This method to keep the old value selected seems to work in Firefox,
    // but not in IE8. Well well.
    var oldVal = select.val();
    select.html(newHtml);
    select.val(oldVal);
}

function scaleHasAxis(scale) {
    return scale.axis === NormalScore.scaleAxis.TOP ||
	scale.axis === NormalScore.scaleAxis.BOTTOM;
}

function scaleGetAxisPosition(scale) {
    switch (scale.axis) {
    case NormalScore.scaleAxis.TOP:
	return "top";
    case NormalScore.scaleAxis.BOTTOM:
	return "bottom";
    }
    return null;
}

var PERCENTILE_TICKS = [0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 0.7, 0.8, 0.9, 0.95, 0.98];

/**
 * Curried function. Generates ticks.
 */ 
function scaleGetAxisTicks(scale, axis) {
    function getTicks(axis) {
	var ticks = [];
	switch(scale.type) {
	case NormalScore.scaleType.NORMAL:
	    var z = Math.ceil(fromScale(scale, axis.min));
	    var zMax = fromScale(scale, axis.max);
	    while (z <= zMax) {
		ticks.push(toScale(scale, z));
		z++;
	    }	   
	    break;

	case NormalScore.scaleType.DISCRETE:
	    var min = scale.min ? Math.max(scale.min, axis.min) : axis.min;
	    var max = scale.max ? Math.min(scale.max, axis.max) : axis.max;
	    var tick = Math.ceil(min);
	    while (tick <= max) {
		ticks.push(tick);
		tick++;
	    }
	    break;

	case NormalScore.scaleType.PERCENTILE:
	    var i = 0, len = PERCENTILE_TICKS.length;
	    var factor = $.isNumeric(scale.SD) ? scale.SD : 1;
	    var offset = $.isNumeric(scale.M) ? scale.M : 0;
	    function tick(i) {
		return PERCENTILE_TICKS[i] * factor + offset;
	    }
	    while (i < len && tick(i) < axis.min)
		i++;
	    while (i < len && tick(i) <= axis.max) {
		ticks.push(tick(i));
		i++;
	    }
	}

	return ticks;
    }

    if (arguments.length > 1)
	return getTicks(axis);
    else
	return getTicks;   
}

function getXAxes(scales, zMin, zMax) {
    function makeScaleAxis(scale) {
	var nScale = normalizeScale(scale);
	var axis = {
	    min: toScale(nScale, zMin),
	    max: toScale(nScale, zMax),
	    transform: createFromScaleFunction(scale),
	    position: scaleGetAxisPosition(scale),
	    ticks: scaleGetAxisTicks(scale),
	    axisLabel: scale.name,
	    axisLabelUseCanvas: true,
	    axisLabelPadding: 7,
	    axisLabelFontSizePixels: 10,
	    labelHeight: 15,
	    show: true
	};
	return axis;
    }

    return [{
	// The Z scale towards which values are plotted. 
	// Don't show this because we want user to set which axes to show.
	// Can't set show to false; hide by giving it no ticks.
	min: zMin, 
	max: zMax, 
	ticks: []
    }].concat(scales.filter(scaleHasAxis).map(makeScaleAxis));
}

function doPlot() {
    var xaxes = getXAxes(NormalScore.scales, NormalScore.MIN, NormalScore.MAX);
    $("#plot").height(NormalScore.plotHeight + 
		      NormalScore.totalAxisHeight * (xaxes.length - 1));
    NormalScore.plot = $.plot($("#plot"), [
	{ data: NormalScore.curve, 
	  label: null}
    ], {
	crosshair: {
	    mode: "x",
	    coverAxes: "x"
	},
	grid: {
	    markings: [],
	    clickable: true,
	    hoverable: true,
	    autoHighlight: false,
	},
	xaxes: xaxes
    });
}

$(document).ready(function() {
    NormalScore.curve = [];
    for (var i = NormalScore.MIN; i <= NormalScore.MAX; i += 0.2)
        NormalScore.curve.push([i, jStat.normal.pdf(i, 0, 1)]);

    doPlot();

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

    var offset = NormalScore.plot.offset();
    $("#tooltip").css({left: offset.left + 10, top: offset.top});

    $("select#inputtype").change(function() {
	$("#score").val("");
    });

    $("#scoreform").submit(function() {
	var score = parseFloat($("#score").val());
	var scaleName = $("#inputtype").val();
	var scaleInfo = getScaleInfo(scaleName);
	addScore(fromScale(scaleInfo, score));

	$("#score").val("");
	return false;		// abort default submit
    });

    updateInputType();

    $("#outputTable").handsontable({
	data: NormalScore.gridData,
	colHeaders: true,
	cells: function (row, col, prop) {
	    return { readOnly: true };
	}
    });
    renderScoreTable();

    $("#setupScales").handsontable({
	data: NormalScore.scales,
	colHeaders: ["Name", "Type", "M", "SD", "Min", "Max", 
		     "Digits", "Axis", "Output"],
	columns: [
	    {data: "name"},
	    {data: "type",
	     type: "autocomplete",
	     source: ["Normal", "Discrete", "Percentile"],
	     strict: true},
	    {data: "M",
	     type: "numeric",
	     format: "0.00"},
	    {data: "SD",
	     type: "numeric",
	     format: "0.00"},
	    {data: "min",
	     type: "numeric",
	     format: "0"},
	    {data: "max",
	     type: "numeric",
	     format: "0"},
	    {data: "digits",
	     type: "numeric"},
	    {data: "axis",
	     type: "autocomplete",
	     source: ["None", "Top", "Bottom"],
	     strict: true},
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
	    updateInputType();
	    doPlot();
	}
    });
    
});
