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

	// 向上寻找父节点
	function searchUp (node, className) {
		if (!node || node === document.body || node === document) return undefined;   // 向上递归到顶就停
		if (node.classList.contains(className)) return node;
		return searchUp(node.parentNode, className);
	}

	// 取得节点位置
	function getOffset (node, offset, parent) {
		if (!parent) return node.getBoundingClientRect();
		offset = offset || {top: 0, left: 0};
		if (node === null || node === parent) return offset;
		offset.top += node.offsetTop;
		offset.left += node.offsetLeft;
		return this.getOffset(node.offsetParent, offset, parent);
	}

	agGraphBar = {
		init: function(selector) {
			this.destroy();
			this.selector = selector;
			var container = document.querySelector("." + selector);
			if (container) {

			}
			this.bindEvent();
		},
		destroy: function() {
			this.unBindEvent();
			delete this.selector;
		},
		bindEvent: function() {
			document.addEventListener('click', this.click, false);
		},
		unBindEvent: function() {
			document.removeEventListener('click', this.click, false);
		},
		click: function (event) {
			var self = agGraphBar;
			console.log(event.target);
			var container = searchUp(event.target, self.selector);
			if (container) {
				console.log(container, "container");
			}
		}
	};

	agGraphBar.init("ag-graph-bar");

	return agGraphBar;
});
