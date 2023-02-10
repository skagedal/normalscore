normalscore
===========

Converts between scales commonly used by psychologists of values on a
normal distribution.

Uses the following libraries, all included for convenience:

* [jQuery] [1] -- for DOM manipulation
* [Flot] [2] -- for plotting
  * [flot-axislabels] [8] -- plugin to Flot to label axes
* [jStat] [3] -- for statistics. Note, I use the Github version, not the 
  one on jstat.org.
* [JavaScript sprintf] [4] -- can't code without a sprintf.
* [Handsontable] [5] -- a clean and simple Excel-like data grid editor.
* [FlashCanvas] [6] -- emulation of HTML5 Canvas on Internet Explorer via 
  Flash.
* [ES5 Shim] [7] -- ECMAScript 5 compatibility shims for legacy
  JavaScript engines.

To build the project, just run `python3 build.py`. You'll need to have [yuicompressor](https://yui.github.io/yuicompressor/) installed (`brew install yuicompressor` if you're using Homebrew.)

  [1]: http://jquery.com/
  [2]: http://www.flotcharts.org/
  [3]: https://github.com/jstat/jstat
  [4]: http://www.diveintojavascript.com/projects/javascript-sprintf
  [5]: http://handsontable.com/
  [6]: http://flashcanvas.net/
  [7]: https://github.com/kriskowal/es5-shim
  [8]: https://github.com/markrcote/flot-axislabels/