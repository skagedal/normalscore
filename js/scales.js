var SCALETYPE_NORMAL = 1;
var SCALETYPE_DISCRETE = 2;
var SCALETYPE_PERCENTILE = 3;

var defaultScales = [
    {name: "Z-score",
     type: SCALETYPE_NORMAL,
     M: 0,
     SD: 1},
    {name: "IQ",
     type: SCALETYPE_NORMAL,
     M: 100,
     SD: 15},
    {name: "T-score",
     type: SCALETYPE_NORMAL,
     M: 50,
     SD: 10},
    {name: "Stanine",
     type: SCALETYPE_DISCRETE,
     M: 5,
     SD: 2,
     min: 1,
     max: 9},
    {name: "Sten",
     type: SCALETYPE_DISCRETE,
     M: 5.5,
     SD: 2,
     min: 1,
     max: 10},
    {name: "Percentile",
     type: SCALETYPE_PERCENTILE,
     SD: 100}			// used here for scaling
];

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
	var p = Math.min(100, Math.max(0, (scaleValue - offset) / factor));
	z = jStat.normal.inv(p)
	break;
    }
    
}
