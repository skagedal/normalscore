// Object to hold all global app data
var NormalScore = {
    scaleType: {
	NORMAL: "Normal",
	DISCRETE: "Discrete",
	PERCENTILE: "Percentile"
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

NormalScore.defaultScales = [
    {name: "Z-score",
     type: NormalScore.scaleType.NORMAL,
     M: 0,
     SD: 1,
     digits: 2,
     show: true},
    {name: "IQ",
     type: NormalScore.scaleType.NORMAL,
     M: 100,
     SD: 15,
     digits: 1,
     show: true},
    {name: "T-score",
     type: NormalScore.scaleType.NORMAL,
     M: 50,
     SD: 10,
     digits: 1,
     show: true},
    {name: "Stanine",
     type: NormalScore.scaleType.DISCRETE,
     M: 5,
     SD: 2,
     min: 1,
     max: 9,
     show: true},
    {name: "Sten",
     type: NormalScore.scaleType.DISCRETE,
     M: 5.5,
     SD: 2,
     min: 1,
     max: 10,
     show: false},
    {name: "Standard 19",
     type: NormalScore.scaleType.DISCRETE,
     M: 10,
     SD: 3,
     min: 1,
     max: 19,
     show: true},
    {name: "Percentile",
     type: NormalScore.scaleType.PERCENTILE,
     SD: 100,			// used here for scaling
     digits: 2,
     show: true}
];

// temp hack
NormalScore.Z = NormalScore.defaultScales[0];
NormalScore.IQ = NormalScore.defaultScales[1];
NormalScore.T = NormalScore.defaultScales[2];
NormalScore.Stanine = NormalScore.defaultScales[3];
NormalScore.Sten = NormalScore.defaultScales[4];
NormalScore.Sta19 = NormalScore.defaultScales[5];
NormalScore.Percentile = NormalScore.defaultScales[6];


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
	return scale.name + "=" + toScaleFormattedString(scale, z);
    }).join(", "));
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

$(document).ready(function() {
    var curve = [];
    for (var i = -5; i <= 5.0; i += 0.1)
        curve.push([i, jStat.normal.pdf(i, 0, 1)]);

    NormalScore.plot = $.plot($("#plot"), [
	{ data: curve, label: null}
    ], {
	crosshair: {
	    mode: "x"
	},
	grid: {
	    markings: [],
	    clickable: true,
	    hoverable: true
	},
	xaxes: [
	    { min: -5,
	      max: 5,
	      position: "bottom",
	      axisLabel: "Z-score",
	      axisLabelUseCanvas: true,
	      axisLabelPadding: 5,
	      axisLabelFontSizePixels: 10,
	    },
	    { min: toScale(NormalScore.IQ, -5),
	      max: toScale(NormalScore.IQ, 5),
	      position: "bottom",
	      alignTicksWithAxis: 1,
	      axisLabel: "IQ",
	      axisLabelUseCanvas: true,
	      axisLabelPadding: 5,
	      axisLabelFontSizePixels: 10,
	      show: true},
	    /*
	    // Ah, this doesn't work of course with fixed vals:
	    { min: toScale(NormalScore.Sta19, -5),
	      max: toScale(NormalScore.Sta19, 5),
	      position: "bottom",
	      show: true}, */
	    { min: toScale(NormalScore.Percentile, -5),
	      max: toScale(NormalScore.Percentile, 5),
	      transform: createFromScaleFunction(NormalScore.Percentile),
	      position: "bottom",
	      alignTicksWithAxis: 1,
	      axisLabel: "Percentile",
	      axisLabelUseCanvas: true,
	      axisLabelPadding: 5,
	      axisLabelFontSizePixels: 10,
	      show: true},
	    
	]
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
	addScore(fromScale(scaleInfo, score));

	$("#score").val("");
	return false;		// abort default submit
    });

    updateInputType();

    $("#outputTable").handsontable({
	data: NormalScore.gridData,
	colHeaders: true
    });
    renderScoreTable();

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
	     type: "numeric",
	     format: "0.00"},
	    {data: "SD",
	     type: "numeric",
	     format: "0.00"},
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
	    updateInputType();
	}
    });

    $("#setupScales").hide();
    $("#hideScaleSettings").hide();
    $("#showScaleSettings").click(function () {
	$("#setupScales").slideDown();
	$("#showScaleSettings").hide();
	$("#hideScaleSettings").show();
    });
    $("#hideScaleSettings").click(function () {
	$("#setupScales").slideUp();
	$("#showScaleSettings").show();
	$("#hideScaleSettings").hide();
    });
    
});
