/**
 * ag-graph-bar
 */
;(function (gloabal, fun) {
	if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
		module.exports = fun();
	} else if (typeof define === 'function'
		&& (typeof define.amd === 'object' || typeof define.cmd === 'object')) {
		define(fun);
	} else {
		gloabal.agGraphBar = fun();
	}
})(window, function (agGraphBar) {
	'use strict';

	agGraphBar = {
		init: function() {

		},
		destroy: function() {

		},
		bindEvent: function() {

		},
		unBindEvent: function() {

		}
	};

	return agGraphBar;
});
