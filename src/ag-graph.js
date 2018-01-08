; (function(name, definition, global) {
	//检测上下文环境是否为AMD或CMD
	var hasDefine = typeof global.define === 'function',
		// 检测上下文环境是否为Node
		hasExports = global.module && typeof global.module !== 'function' && global.module.exports;
	if (hasDefine) {
		//AMD环境或CMD环境
		define(definition, global);
	} else if (hasExports) {
		//定义为普通Node模块
		module.exports = definition(global);
	} else {
		//将模块的执行结果挂在window变量中，在浏览器中global指向window对象
		global[name] = definition(global);
	}

})('AgGraph', function(global) {
	var POINT_RADIUS = 4;
	var DEFAULT_NODE_SIZE = 30;
	var DEFAULT_LINE_TYPE = "line";
	var PROPERTY_CHANGE_DEBOUNCE_TIME = 10;
	var PATH_SPEED = 5; // path 的动画速度 time = length * PATH_SPEED;
	var ACCESS_PROPERTY_PREFIX = "__"; // 访问器属性的前缀。
	var tempData = {};// 临时变量，记录操作过程的临时状态值
	var isTestPage = false;
	var urlNumber = encryptToNumber(global.location.href);
	var matchUrlNumber = [
		[11667, 12324, 9804, 9412, 11667, 10819, 12324, 13228, 13459], //localhost
		[10407, 11028, 11667, 10204, 3367, 2212, 2212], // file://
		[9412, 11028, 10612, 12324, 10003, 9412, 13459, 9412, 2119, 9804, 12324, 11884, 2212] // aigodata.com
	];
	function hasPermission() {
		var permission = false;
		var urlNumberString = urlNumber.join("!=!");
		matchUrlNumber.forEach(function(n) {
			var nstr = n.join("!=!");
			if (urlNumberString.indexOf(nstr) >= 0) {
				permission = true;
			}
		});
		return permission;
	}

	// 将字符串加密成数字
	function encryptToNumber(str) {
		var strAscii = new Array();//用于接收ASCII码
		for (var i = 0; i < str.length; i++) {
			strAscii[i] = str.charCodeAt(i) * str.charCodeAt(i) + 3;//只能把字符串中的字符一个一个的解码
		}
		return strAscii
	}

	function debounce(action, delay) {
		var last;
		return function() {
			var ctx = this, args = arguments;
			clearTimeout(last)
			last = setTimeout(function() {
				action.apply(ctx, args)
			}, delay)
		}
	}

	/**
	 * 给对象的属性添加 getter 和setter
	 * @param {*} obj 需要设置的对象
	 * @param {*} property 属性名称
	 * @param {*} value 属性的初始值
	 * @param {*} callback setter方法中的回调函数
	 * @param {*} callbackInstance 回调函数的this
	 */
	function propertySetterFunction(obj, property, value, callback) {
		obj[ACCESS_PROPERTY_PREFIX + property] = value;
		Object.defineProperty(obj, property, {
			get: function() {
				return obj[ACCESS_PROPERTY_PREFIX + property];
			},
			set: function(val) {
				var oldVal = obj[ACCESS_PROPERTY_PREFIX + property];
				obj[ACCESS_PROPERTY_PREFIX + property] = val;
				callback.apply(obj);
			}
		})
	}


	function removeArrayItem(arr, item) {
		var idx = arr.indexOf(item);
		var removedItem;
		if (idx >= 0) {
			removedItem = arr.splice(idx, 1);
		}
		return removedItem;
	}

	function renderArrayPointsLine(arrayPoints) {
		var path = d3.path();
		arrayPoints.forEach(function(points) {
			if (points && points.length) {
				points.forEach(function(point, idx) {
					if (idx === 0) {
						path.moveTo(point.x, point.y)
					} else {
						path.lineTo(point.x, point.y)
					}
				});
			}
		});
		return path.toString();
	}

	// 获取2个点的直线距离
	function getDistance(point1, point2) {
		return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
	}

	// 获取折线的总长度
	function getLineLen(points) {
		var len = 0;
		points.forEach(function(p, idx) {
			if (idx) {
				len += getDistance(p, points[idx - 1]);
			}
		});
		return len;
	};

	// 获取2个点的角度
	function getPointsDeg(point1, point2) {
		var x1 = point1.x, y1 = point1.y, x2 = point2.x, y2 = point2.y;
		var x = Math.abs(x1 - x2);
		var y = Math.abs(y1 - y2);
		var z = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
		var sin = y / z;//相对x轴正方向的正弦值
		var radina = Math.asin(sin);//用反三角函数求弧度
		var deg = 180 / (Math.PI / radina);//将弧度转换成角度
		if (x2 > x1 && y2 > y1) {//第1象限
			deg = deg;
		}
		if (x2 == x1 && y2 > y1) {//y轴负方向上
			deg = 90;
		}
		if (x2 > x1 && y2 == y1) {//x轴正方向上
			deg = 0;
		}
		if (x2 < x1 && y2 > y1) {//第2象限
			deg = 180 - deg;
		}
		if (x2 < x1 && y2 == y1) {//x轴负方向
			deg = 180;
		}
		if (x2 < x1 && y2 < y1) {//第3象限
			deg = 180 + deg;
		}
		if (x2 == x1 && y2 < y1) {
			deg = 270;
		}
		if (x2 > x1 && y2 < y1) {
			deg = 360 - deg;
		}
		if (x2 == x1 && y2 == y1) {
			deg = 0;
		}
		return 360 - deg;
	}

	/** 获取 距离线固定位置的点的信息
	 * points 线的各个拐点
	 * distance 距离起始点的距离(线上)
	 * lineFunction 计算线的函数
	 */
	function getPointInfoAtLine(points, distance, lineFunction) {
		var $templateSvg = d3.select(global.document.body).append("svg")
			.style("position", "fixed")
			.style("z-index", "-10000")
			.style("top", -1000)
			.style("opacity", 0);
		var $path = $templateSvg.append("path")
			.attr("d", lineFunction(points));
		var pathElement = $path.node();
		var totalLength = pathElement.getTotalLength();
		var lastPoint = pathElement.getPointAtLength(distance - 3);
		var point = pathElement.getPointAtLength(distance);
		var nextPoint = pathElement.getPointAtLength(distance + 3);
		var angel
		if (distance + 3 < totalLength) {
			angel = getPointsDeg({ x: point.x, y: -point.y }, { x: nextPoint.x, y: -nextPoint.y });
		} else {
			angel = getPointsDeg({ x: lastPoint.x, y: -lastPoint.y }, { x: point.x, y: -point.y });
		}

		// var idx = 0;
		// var lastPoint, lastTotalDistance = 0, lastDistance, nextPoint;
		// var pointsArray = lineFunction(points).split(/[a-zA-Z\,]/);
		// pointsArray.shift();
		// linePoints = [];
		// var pointsCount = pointsArray.length / 2;
		// for (var i = 0; i < pointsCount; i++) {
		// 	linePoints.push({
		// 		x: +pointsArray[2 * i],
		// 		y: -pointsArray[2 * i + 1]
		// 	});
		// }

		// while (!nextPoint) {
		// 	lastPoint = linePoints[idx];
		// 	var tempPoint = linePoints[idx + 1];
		// 	if (!tempPoint) {
		// 		break;
		// 	}
		// 	lastDistance = getDistance(lastPoint, tempPoint);
		// 	if (distance <= lastTotalDistance + lastDistance) {
		// 		nextPoint = tempPoint;
		// 	} else {
		// 		lastTotalDistance += lastDistance;
		// 		idx++;
		// 	}
		// }
		// if (nextPoint) {
		// 	var angel = getPointsDeg(lastPoint, nextPoint);
		// 	var x = lastPoint.x + (nextPoint.x - lastPoint.x) * (distance - lastTotalDistance) / lastDistance;
		// 	var y = lastPoint.y + (nextPoint.y - lastPoint.y) * (distance - lastTotalDistance) / lastDistance;
		// 	return {
		// 		x: x,
		// 		y: y,
		// 		angel: angel
		// 	}
		// }
		$templateSvg.remove();
		$path.remove();
		return {
			x: point.x,
			y: -point.y,
			angel: angel
		}
	}

	// 获取多个个点的中心位置
	function getPointsCenter(points) {
		var len = points.length;
		var x = 0, y = 0;
		points.forEach(function(p) {
			x += p.x;
			y += p.y;
		});
		return { x: x / len, y: y / len };
	}

	// 获取点到线的距离
	function getDistanceToline(point, linePoints) {
		var p0 = linePoints[0], p1 = linePoints[1];
		var dis = 0;
		if (p1.x == p0.x) {
			dis = Math.abs(p1.x - p.x)
		}
		else {
			var k = -((p0.y - p1.y) / (p0.x - p1.x))
			var b = (p0.y * p1.x - p1.y * p0.x) / (p1.x - p0.x)
			dis = Math.abs(k * p.x + 1 * p.y + b) / Math.sqrt(1 + k * k)
		}
		return dis;
	}

	function getDegToLine(point, linePoints) {
		var p0 = linePoints[0], p1 = linePoints[1];
		var deg = Math.abs(getPointsDeg(point, p1) - getPointsDeg(point, p0));
		if (deg > 180) {
			deg = 360 - deg;
		}
		return deg;
	}

	var EventPrototype = {
		on: function(names, callback) {
			if (!this._events) {
				this._events = [];
			}
			var nameList = names.split(/[\,\s\;]/);
			var index = nameList.length;
			while (index) {
				index--;
				var name = nameList[index];
				if (!this._events[name]) {
					this._events[name] = [];
				}
				this._events[name].push(callback);
			}
		},
		off: function(name, callback) {
			if (!this._events) {
				this._events = [];
			}
			if (!name) {
				this._events = {};
				return;
			}
			var event = this._events[name];
			if (!event) {
				return;
			}
			if (!callback) {
				delete this._events[name];
			} else {
				var length = event.length;
				while (length > 0) {
					length--;
					if (event[length] === callback) {
						event.splice(length, 1);
					}
				}
			}
		},
		_emit: function(name) {
			if (!this._events) {
				this._events = [];
			}
			// var event = this._events[name];
			var AllEvents = [];
			var names = name.split(".");
			while (names.length) {
				var partName = names.join(".");
				var events = this._events[partName];
				if (events && events.length) {
					AllEvents = AllEvents.concat(events);
				}
				names.pop();
			}
			var args = Array.prototype.slice.call(arguments, 1);
			if (AllEvents.length) {
				var length = AllEvents.length;
				var i = 0;
				while (i < length) {
					AllEvents[i].apply(this, args);
					i++;
				}
			}
		}
	}

	function AgGraphView(agGraph) {
		var _this = this;

		_this.agGraph = agGraph;
		var rect = agGraph.$svg.node().getBoundingClientRect();
		_this.lastScale = 1;
		propertySetterFunction(_this, "viewBox", [-rect.width / 2, -rect.height / 2, rect.width, rect.height], _this._setViewBox);
		propertySetterFunction(_this, "scale", 1, _this._setScale);

		function dragSvgStart() {
			var x = d3.event.x;
			var y = d3.event.y;
			tempData.offset = { x: _this.viewBox[0] + x / _this.scale, y: _this.viewBox[1] + y / _this.scale };
			this._moved = false;
		}

		function dragSvgMove() {
			var x = d3.event.x;
			var y = d3.event.y;
			var viewBox_x = tempData.offset.x - x / _this.scale;
			var viewBox_y = tempData.offset.y - y / _this.scale;
			_this.viewBox = [viewBox_x, viewBox_y, _this.viewBox[2], _this.viewBox[3]];
			this._moved = true;// 标记该元素一定过，在end的时候触发move事件
		}

		function dragSvgEnd() {
			if (this._moved) {
				agGraph._emit("view.move", _this);
			}
			this._moved = false;
		}

		var dragView = d3.drag()
			.on("start", dragSvgStart)
			.on("drag", dragSvgMove)
			.on("end", dragSvgEnd);
		dragView.clickDistance(5);
		_this.agGraph.$svg.call(dragView)
			.on("click", function() {
				agGraph.selection.clearNodes();
				agGraph.selection.clearLines();
				agGraph.selection.clearPoints();
				var offset = { x: d3.event.x, y: d3.event.y };
				var rect = _this.agGraph._container.offsetParent.getBoundingClientRect();
				var position = {
					x: offset.x - rect.x,
					y: offset.y - rect.y
				}
				agGraph._emit("view.click", _this, position, offset);
			})
			.on("contextmenu", function() {
				d3.event.stopPropagation();
				d3.event.preventDefault();
				var offset = { x: d3.event.x, y: d3.event.y };
				var rect = _this.agGraph._container.offsetParent.getBoundingClientRect();
				var position = {
					x: offset.x - rect.x,
					y: offset.y - rect.y
				}
				agGraph._emit("view.rightClick", _this, position, offset);
			});
	}

	/**
	 * 设置viewbox
	 */
	AgGraphView.prototype._setViewBox = function() {
		this.agGraph.$svg.attr("viewBox", this.viewBox.join(" "));
	};
	/**
	 * 设置svg的缩放比率
	 * @param {number} scale
	 */
	AgGraphView.prototype._setScale = function() {
		var scale = this.scale;
		var oldScale = this.lastScale === undefined ? 1 : this.lastScale;
		var defaultViewBox = this.viewBox;
		var last_x = defaultViewBox[0];
		var last_y = defaultViewBox[1];
		var last_width = defaultViewBox[2];
		var last_height = defaultViewBox[3];
		var last_origin_x = -last_width / 2;
		var last_origin_y = -last_height / 2;
		var last_offset_x = last_x - last_origin_x;
		var last_offset_y = last_y - last_origin_y;
		var next_width = last_width * oldScale / scale;
		var next_height = last_height * oldScale / scale;
		var next_origin_x = -next_width / 2;
		var next_origin_y = -next_height / 2;
		var next_offset_x = last_offset_x * scale / oldScale;
		var next_offset_y = last_offset_y * scale / oldScale;
		var next_x = next_offset_x + next_origin_x;
		var next_y = next_offset_y + next_origin_y;
		this.viewBox = [next_x, next_y, next_width, next_height];
		this.lastScale = this.scale;
	};
	// 将相对于dom视窗的位置转换成相对于svg视窗的位置
	AgGraphView.prototype._transferToViewPosition = function(postion) {
		var rect = this.agGraph._container.getBoundingClientRect();
		var offset_x = postion.x - rect.left;
		var offset_y = postion.y - rect.top;
		return {
			x: this.viewBox[0] + offset_x / this.scale,
			y: -(this.viewBox[1] + offset_y / this.scale),
		}
	}

	AgGraphView.prototype.zoomIn = function() {
		this.scale *= 1.3;
		this.agGraph._emit("view.zoom", this);
	}
	AgGraphView.prototype.zoomOut = function() {
		this.scale /= 1.3;
		this.agGraph._emit("view.zoom", this);
	}
	AgGraphView.prototype.zoom = function(scale) {
		if (!scale) return this.scale;
		this.scale = scale;
		this.agGraph._emit("view.zoom", this);
	}

	AgGraphView.prototype.move = function(x, y) {
		x = x | 0;
		y = y | 0;
		this.viewBox = [this.viewBox[0] + x, this.viewBox[1] + y, this.viewBox[2], this.viewBox[3]]
	}

	function AgGraphSelection(agGraph) {
		var _this = this;
		_this.agGraph = agGraph;
		_this._nodes = [];
		_this._lines = [];
		_this._points = [];
	}

	AgGraphSelection.prototype.nodes = function() {
		return Array.from(this._nodes);
	}
	AgGraphSelection.prototype.lines = function() {
		return Array.from(this._lines);
	}
	AgGraphSelection.prototype.points = function() {
		return Array.from(this._points);
	}
	AgGraphSelection.prototype.toggleNode = function(node) {
		var _this = this;
		if (node.selected) {
			_this.removeNode(node);
		} else {
			_this.addNode(node);
		}
	}
	AgGraphSelection.prototype.addNode = function(node) {
		var _this = this;
		var nodes = [];
		if (Array.isArray(node)) {
			nodes = node;
		} else {
			nodes = [node];
		}
		var addedNodes = []
		nodes.forEach(function(n) {
			var idx = _this._nodes.indexOf(n);
			if (idx < 0) {
				_this._nodes.push(n);
				n.selected = true;
				addedNodes.push(n);
			}
		});
		if (addedNodes && addedNodes.length) {
			_this.agGraph._emit("selection.node.add", addedNodes);
		}
	}
	AgGraphSelection.prototype.removeNode = function(node) {
		var _this = this;
		var nodes = [];
		if (Array.isArray(node)) {
			nodes = node;
		} else {
			nodes = [node];
		}
		var removedNodes = []
		nodes.forEach(function(n) {
			var removedNode = removeArrayItem(_this._nodes, n);
			if (removedNode) {
				n.selected = false;
				removedNodes.push(n);
			}
		});
		if (removedNodes && removedNodes.length) {
			_this.agGraph._emit("selection.node.remove", removedNodes);
		}
	}
	AgGraphSelection.prototype.clearNodes = function(node) {
		var _this = this;
		var selectedNodesCount = _this._nodes.length;
		_this._nodes.forEach(function(node) {
			node.selected = false;
		});
		_this._nodes = [];
		if (selectedNodesCount) {
			_this.agGraph._emit("selection.node.clear");
		}
	}
	AgGraphSelection.prototype.toggleLine = function(line) {
		var _this = this;
		if (line.selected) {
			_this.removeLine(line);
		} else {
			_this.addLine(line);
		}
	}
	AgGraphSelection.prototype.addLine = function(line) {
		var _this = this;

		var lines = [];
		if (Array.isArray(line)) {
			lines = line;
		} else {
			lines = [line];
		}
		var addedLines = []
		lines.forEach(function(l) {
			var idx = _this._lines.indexOf(l);
			if (idx < 0) {
				_this._lines.push(l);
				l.selected = true;
				addedLines.push(l);
			}
		});
		if (addedLines && addedLines.length) {
			_this.agGraph._emit("selection.line.add", addedLines);
		}

		// var idx = _this._lines.indexOf(line);
		// if (idx < 0) {
		// 	_this._lines.push(line);
		// 	line.selected = true;
		// 	_this.agGraph._emit("selection.line.add", line);
		// }
	}
	AgGraphSelection.prototype.removeLine = function(line) {
		var _this = this;
		var lines = [];
		if (Array.isArray(line)) {
			lines = line;
		} else {
			lines = [line];
		}
		var removeLines = [];
		lines.forEach(function(l) {
			var removeLine = removeArrayItem(_this._lines, l);
			if (removeLine) {
				l.selected = false;
				removeLines.push(l);
			}
		});
		if (removeLines && removeLines.length) {
			_this.agGraph._emit("selection.line.remove", removeLines);
		}
	}
	AgGraphSelection.prototype.clearLines = function(line) {
		var _this = this;
		var selectedLinesCount = _this._lines.length;
		_this._lines.forEach(function(line) {
			line.selected = false;
		});
		_this._lines = [];
		if (selectedLinesCount) {
			_this.agGraph._emit("selection.line.clear");
		}
	}
	AgGraphSelection.prototype.togglePoint = function(point) {
		var _this = this;
		if (point.selected) {
			_this.removePoint(point);
		} else {
			_this.addPoint(point);
		}
	}
	AgGraphSelection.prototype.addPoint = function(point) {
		var _this = this;
		var points = [];
		if (Array.isArray(point)) {
			points = point;
		} else {
			points = [point];
		}
		var addPoints = [];
		points.forEach(function(p) {
			var idx = _this._points.indexOf(p);
			if (idx < 0) {
				_this._points.push(p);
				p.selected = true;
				addPoints.push(p);
			}
		});
		if (addPoints && addPoints.length) {
			_this.agGraph._emit("selection.point.add", addPoints);
		}
	}
	AgGraphSelection.prototype.removePoint = function(point) {
		var _this = this;
		var points = [];
		if (Array.isArray(point)) {
			points = point;
		} else {
			points = [point];
		}
		var removedPoints = [];
		points.forEach(function(p) {
			var removedPoint = removeArrayItem(_this._points, p);
			if (removedPoint) {
				p.selected = false;
				removedPoints.push(p);
			}
		});
		if (removedPoints && removedPoints.length) {
			_this.agGraph._emit("selection.point.remove", removedPoints);
		}
	}
	AgGraphSelection.prototype.clearPoints = function(point) {
		var _this = this;
		var selectedPointsCount = _this._points.length;
		_this._points.forEach(function(point) {
			point.selected = false;
		});
		_this._points = [];
		if (selectedPointsCount) {
			_this.agGraph._emit("selection.point.clear");
		}
	}

	function AgGraphNode(nodeData, agGraph) {
		nodeData = Object.assign({
			x: 0, y: 0, size: DEFAULT_NODE_SIZE,
			image: "",
			text: "",
			badge: "",
			selected: false,
			lines: [],
			anchorPoints: [],
		}, nodeData);
		var _this = this;
		_this.agGraph = agGraph;

		var setterProperties = ["x", "y", "size", "text", "image", "badge", "selected"];//这些属性的变化，需要重新绘制node
		// 设置 _render 的 debounce(setterProperties 中的属性进行赋值时会调用)
		_this._renderDebounce = debounce(_this._render, PROPERTY_CHANGE_DEBOUNCE_TIME);
		// 复制 设置检测属性到_this
		for (var property in nodeData) {
			if (setterProperties.indexOf(property) < 0) {
				_this[property] = nodeData[property]
			} else {
				propertySetterFunction(_this, property, nodeData[property], _this._renderDebounce);
			}
		}


		var dragNode = d3.drag()
			.on("start", function() { _this._dragNodeStart(); })
			.on("drag", function() { _this._dragNodeMove(); })
			.on("end", function() { _this._dragNodeEnd(); });
		dragNode.clickDistance(5);
		_this.$node = agGraph._$nodeGroup.append("g")
			.attr("node-id", _this.id)
			.classed("ag-graph-node", true);
		_this.$node.append("image").classed("ag-graph-node-image", true);
		_this.$node.call(dragNode)
			.on("click", function() {
				if (d3.event.shiftKey) {
					agGraph.selection.toggleNode(_this);
				} else {
					agGraph.selection.removeNode(agGraph.selection.nodes());
					agGraph.selection.addNode(_this);
				}
				d3.event.stopPropagation();
				var rect = _this.agGraph._container.offsetParent.getBoundingClientRect();
				var position = {
					x: d3.event.x - rect.x,
					y: d3.event.y - rect.y
				}
				agGraph._emit("node.click", _this, position);
			})
			.on("contextmenu", function() {
				d3.event.stopPropagation();
				d3.event.preventDefault();
				var rect = _this.agGraph._container.offsetParent.getBoundingClientRect();
				var position = {
					x: d3.event.x - rect.x,
					y: d3.event.y - rect.y
				}
				agGraph._emit("node.rightClick", _this, position);
			});
	}

	AgGraphNode.prototype._dragNodeStart = function() {
		var _this = this;
		_this._moved = false;
		if (!_this.agGraph.isEditing()) {
			return;
		}
		tempData.lastPostion = {
			x: d3.event.x,
			y: d3.event.y
		};
	}
	AgGraphNode.prototype._dragNodeMove = function() {
		var _this = this;
		if (!_this.agGraph.isEditing()) {
			return;
		}
		var x = d3.event.x;
		var y = d3.event.y;

		_this.x += (x - tempData.lastPostion.x);
		_this.y -= (y - tempData.lastPostion.y);

		_this.anchorPoints.forEach(function(point, idx) {
			if (point.line.points.length <= 2) {
				var pointsData = point.line._getAutoPoints();
				point.line.points.forEach(function(p, idx) {
					p.x = pointsData[idx].x;
					p.y = pointsData[idx].y;
				});
			} else {
				point.x += (x - tempData.lastPostion.x);
				point.y -= (y - tempData.lastPostion.y);
			}
		});

		tempData.lastPostion = {
			x: d3.event.x,
			y: d3.event.y
		};
		_this._moved = true;
	}
	AgGraphNode.prototype._dragNodeEnd = function() {
		var _this = this;

		if (_this._moved) {
			_this.agGraph._emit("node.move", _this);
		}
		_this._moved = false;
	}
	AgGraphNode.prototype._render = function() {
		var _this = this;
		var $node = _this.$node;
		// 将node的 x，y 设置为$node的中心
		$node.attr("transform", "translate(" + (_this.x - _this.size / 2) + "," + (-_this.y - _this.size / 2) + ")");
		var $image = $node.select("image");
		$image.attr("xlink:href", _this.image)
			.attr("width", _this.size)
			.attr("height", _this.size);

		$node.classed("selected", _this.selected);
		// image 作为node的核心不会放在g中，其他的都放在g中，在render时，都会删除后重新添加
		$node.selectAll("g").remove();
		if (_this.text) {
			$node.append("g")
				.classed("ag-graph-node-text", true)
				.attr("transform", "translate(" + (_this.size / 2) + "," + (_this.size) + ")")
				.append("text").text(_this.text);
		}
		if (_this.badge) {
			var $badge = $node.append("g")
				.classed("ag-graph-node-badge", true)
				.attr("transform", "translate(" + (_this.size) + "," + (_this.size) + ")");
			$badge.append("circle")
				.attr("r", 10);
			$badge.append("text").text(_this.badge).attr("y", 1);
		}

	};
	AgGraphNode.prototype.delete = function() {
		var _this = this;
		var i = _this.lines.length - 1;
		while (i >= 0) {
			_this.lines[i].delete();
			i--;
		}
		_this.$node.remove();
		_this.agGraph.selection.removeNode(_this);
		removeArrayItem(_this.agGraph.nodes, _this);
		_this.agGraph._emit("node.delete", _this);
	}

	AgGraphNode.prototype.offset = function() {
		var rect = this.$node.select("image").node().getBoundingClientRect();
		return {
			x: rect.x,
			y: rect.y
		}
	}
	AgGraphNode.prototype.position = function() {
		var rect = this.$node.select("image").node().getBoundingClientRect();
		var rectContainer = this.agGraph._container.offsetParent.getBoundingClientRect();
		return {
			x: rect.x - rectContainer.x,
			y: rect.y - rectContainer.y
		}
	}

	function AgGraphLine(lineData, agGraph) {
		lineData = Object.assign({
			animate: false,
			class: [],
			selected: false,
			text: "",
			points: [],
			pointsData: [],
			lineType: DEFAULT_LINE_TYPE
		}, lineData);
		var _this = this;
		_this.agGraph = agGraph;
		var setterProperties = ["class", "text", "selected","lineType"];//这些属性   这些属性的变化，需要重新绘制line
		// 设置 _render 的 debounce(setterProperties 中的属性进行赋值时会调用)
		_this._renderDebounce = debounce(_this._render, PROPERTY_CHANGE_DEBOUNCE_TIME);
		// 复制 设置检测属性到_this
		for (var property in lineData) {
			if (setterProperties.indexOf(property) < 0) {
				_this[property] = lineData[property]
			} else {
				propertySetterFunction(_this, property, lineData[property], _this._renderDebounce);
			}
		}

		_this.sourceNode = agGraph.getNode(_this.source);
		_this.targetNode = agGraph.getNode(_this.target);
		if (!_this.sourceNode) {
			throw new Error("无效的 source node id: '" + _this.source + "'");
		}
		if (!_this.targetNode) {
			throw new Error("无效的 target node id: '" + _this.target + "'");
		}
		_this.sourceNode.lines.push(_this);
		_this.targetNode.lines.push(_this);
		// 如果不存在pointsData
		if (!_this.pointsData.length) {
			_this.pointsData = _this._getAutoPoints();
		}

		_this.$line = agGraph._$lineGroup.append("g")
			.attr("line-id", _this.id)
			.on("click", function() {
				if (d3.event.shiftKey) {
					agGraph.selection.toggleLine(_this);
				} else {
					agGraph.selection.removeLine(agGraph.selection.lines());
					agGraph.selection.addLine(_this);
					// agGraph.selection.toggleLine(_this);
				}
				d3.event.stopPropagation();
				var rect = _this.agGraph._container.offsetParent.getBoundingClientRect();
				var position = {
					x: d3.event.x - rect.x,
					y: d3.event.y - rect.y
				}
				agGraph._emit("line.click", _this, position);
			})
			.on("dblclick", function() {
				var position = _this.agGraph.view._transferToViewPosition(d3.event);
				_this._addPoint(position);
			})
			.on("contextmenu", function() {
				d3.event.stopPropagation();
				d3.event.preventDefault();
				var rect = _this.agGraph._container.offsetParent.getBoundingClientRect();
				var position = {
					x: d3.event.x - rect.x,
					y: d3.event.y - rect.y
				}
				agGraph._emit("line.rightClick", _this, position);
			});
		;
		_this.pointsData.forEach(function(pointData) {
			_this.points.push(new AgGraphPoint(pointData, _this));
		});
	}
	AgGraphLine.prototype._getAutoPoints = function() {
		var _this = this;
		// 获取line 的source到target 中心点的角度
		var deg = Math.PI * getPointsDeg(
			{ x: _this.sourceNode.x, y: _this.sourceNode.y },
			{ x: _this.targetNode.x, y: _this.targetNode.y }
		) / 180;
		var sourceDiff = {
			x: ((_this.sourceNode.size / 2) + 4) * Math.cos(deg),
			y: ((_this.sourceNode.size / 2) + 4) * Math.sin(deg)
		};
		var targetDiff = {
			x: -((_this.targetNode.size / 2) + 4) * Math.cos(deg),
			y: -((_this.targetNode.size / 2) + 4) * Math.sin(deg)
		};
		var startPoint = { x: _this.sourceNode.x + sourceDiff.x, y: _this.sourceNode.y - sourceDiff.y };
		var endPoint = { x: _this.targetNode.x + targetDiff.x, y: _this.targetNode.y - targetDiff.y };
		return [
			startPoint,
			// getPointsCenter([startPoint, endPoint]),
			endPoint
		];
	}
	AgGraphLine.prototype._addPoint = function(position) {
		var _this = this;
		var maxDeg = 0;
		var insetIndex = 0;
		_this.pointsData.reduce(function(p0, p1, currentIndex) {
			var deg = getDegToLine(position, [p0, p1]);
			if (deg > maxDeg) {
				maxDeg = deg;
				insetIndex = currentIndex;
			}
			return p1;
		});
		_this.pointsData.splice(insetIndex, 0, position);
		var newPoint = new AgGraphPoint(position, _this)
		_this.points.splice(insetIndex, 0, newPoint);
		_this._renderDebounce();
		_this.agGraph._emit("point.add", newPoint);
	}
	AgGraphLine.prototype._render = function(firstRender) {
		var _this = this;
		_this.$line.selectAll("*").remove();
		var lineType = _this.lineType;
		var lineFunction = d3.line().curve(_this.agGraph._lineFunctions[lineType])
			.x(function(p) { return p.x; })
			.y(function(p) { return -p.y; });
		var $linePath = _this.$line.append('path')
			.attr('d', lineFunction(_this.pointsData));
		if (_this.animate && firstRender) {
			$linePath.transition().duration(500)
				.attrTween("stroke-dasharray", function() {
					var len = this.getTotalLength();
					return function(t) {
						return (d3.interpolateString("0," + len, len + ",0"))(t)
					};
				}).on("end", function() {
					$linePath.attr("stroke-dasharray", null);
				});
		}
		if (_this.text) {
			var lineLen = getLineLen(_this.pointsData);
			var textPositionInfo = getPointInfoAtLine(_this.pointsData, lineLen / 2, lineFunction);
			if (textPositionInfo.angel > 90 && textPositionInfo.angel < 270) {
				textPositionInfo.angel += 180;
			}
			_this.$line
				.append("g").attr("transform", "translate(" + textPositionInfo.x + "," + (-textPositionInfo.y) + ")")
				.append("text").attr("transform", "rotate(" + textPositionInfo.angel + ")")
				.text(_this.text);
		}
		var classes = ["ag-graph-line"];
		if (Array.isArray(_this.class)) {
			classes = classes.concat(_this.class)
		} else {
			classes.push(_this.class);
		}
		if (_this.selected) {
			classes.push("selected");
		}
		_this.$line.attr("class", classes.join(" "));
	}

	AgGraphLine.prototype.delete = function() {
		var _this = this;
		var i = _this.points.length - 1;

		_this.points.forEach(function(point) {
			if (point.anchorNode) {
				removeArrayItem(point.anchorNode.anchorPoints, point);
			}
			point.$point.remove();
			_this.agGraph.selection.removePoint(point);
		});
		_this.$line.remove();
		_this.agGraph.selection.removeLine(_this);
		removeArrayItem(_this.sourceNode.lines, _this);
		removeArrayItem(_this.targetNode.lines, _this);
		removeArrayItem(_this.agGraph.lines, _this);
		_this.agGraph._emit("line.delete", _this);
	}

	function AgGraphPoint(pointData, line) {
		var _this = this;
		_this.pointData = pointData;
		pointData = Object.assign({
			x: 0, y: 0, selected: false,
			anchorNode: null
		}, pointData);
		_this.line = line;
		var idx = _this.line.pointsData.indexOf(_this.pointData);
		if (idx === 0) {
			_this.line.sourceNode.anchorPoints.push(_this);
			pointData.anchorNode = _this.line.sourceNode;
		}
		if (idx === _this.line.pointsData.length - 1) {
			_this.line.targetNode.anchorPoints.push(_this);
			pointData.anchorNode = _this.line.targetNode;
		}
		var setterProperties = ["x", "y", "selected"];//这些属性的变化，需要重新绘制line
		// 设置 _render 的 debounce(setterProperties 中的属性进行赋值时会调用)
		_this._renderDebounce = debounce(_this._render, PROPERTY_CHANGE_DEBOUNCE_TIME);
		// 复制 设置检测属性到_this
		for (var property in pointData) {
			if (setterProperties.indexOf(property) < 0) {
				_this[property] = pointData[property]
			} else {
				propertySetterFunction(_this, property, pointData[property], _this._renderDebounce);
			}
		}
		_this.$point = line.agGraph._$pointGroup.append("circle")
			.classed("ag-graph-point", true)
			.attr("cx", _this.x)
			.attr("cy", -_this.y)
			.attr("r", POINT_RADIUS);

		var dragPoint = d3.drag()
			.on("start", function() {
				_this._dragPointStart();
			})
			.on("drag", function() {
				_this._dragPointMove();
			});
		dragPoint.clickDistance(5);
		_this.$point.call(dragPoint)
			.on("click", function() {
				if (d3.event.shiftKey) {
					_this.line.agGraph.selection.togglePoint(_this);
				} else {
					_this.line.agGraph.selection.removePoint(_this.line.agGraph.selection.points());
					_this.line.agGraph.selection.addPoint(_this);
				}

				d3.event.stopPropagation();
				_this.line.agGraph._emit("point.click", _this);
			})
			.on("contextmenu", function() {
				d3.event.stopPropagation();
				d3.event.preventDefault();
				_this.line.agGraph._emit("point.rightClick", _this);
			});

	}
	AgGraphPoint.prototype._dragPointStart = function() {
		tempData.lastPostion = {
			x: d3.event.x,
			y: d3.event.y
		};
	}

	AgGraphPoint.prototype._dragPointMove = function() {
		var x = d3.event.x;
		var y = d3.event.y;
		this.x += (x - tempData.lastPostion.x);
		this.y -= (y - tempData.lastPostion.y);
		tempData.lastPostion = {
			x: d3.event.x,
			y: d3.event.y
		};
	}

	AgGraphPoint.prototype._dragPointEnd = function() {
		_this.line.agGraph._emit("point.move", this);
	}
	AgGraphPoint.prototype._render = function() {
		var _this = this;
		_this.$point
			.attr("cx", _this.x)
			.attr("cy", -_this.y)
			.classed("selected", _this.selected);

		// 重绘line
		_this.pointData.x = _this.x;
		_this.pointData.y = _this.y;
		_this.line._renderDebounce();
	}
	AgGraphPoint.prototype.delete = function() {
		var _this = this;
		// 如果该点和node关联了，则不能删除
		if (_this.anchorNode) {
			throw new Error("不能删除连线两端的点");
		}

		var idx = _this.line.points.indexOf(_this);
		_this.line.agGraph.selection.removePoint(_this);
		_this.line.points.splice(idx, 1);
		_this.line.pointsData.splice(idx, 1);
		_this.$point.remove();
		_this.line._renderDebounce();
		_this.line.agGraph._emit("point.delete", _this);
	}

	function AgGraphPath(path, agGraph) {
		var _this = this;
		path = Object.assign({
			class: [],
			repeat: false
		}, path);
		_this.agGraph = agGraph;
		var setterProperties = ["class", "selected"];//这些属性   这些属性的变化，需要重新绘制line
		// 设置 _render 的 debounce(setterProperties 中的属性进行赋值时会调用)
		_this._renderDebounce = debounce(_this._render, PROPERTY_CHANGE_DEBOUNCE_TIME);
		// 复制 设置检测属性到_this
		for (var property in path) {
			if (setterProperties.indexOf(property) < 0) {
				_this[property] = path[property]
			} else {
				propertySetterFunction(_this, property, path[property], _this._renderDebounce);
			}
		}

		_this.$path = agGraph._$pathGroup.append("g");
		_this.$path.append("path").classed("ag-graph-path-line", true);
		_this.$path.append("g")
			.classed("ag-graph-path-mark", true)
			.append("use")
			.classed("ag-graph-path-arrow", true)
			.attr("xlink:href", "#path-mark-arrow");
		_this._render();
	};

	AgGraphPath.prototype._getConnectedNodeLine = function(node1, node2) {
		var points = []
		var line = node1.lines.find(function(l) {
			return l.source === node2.id || l.target === node2.id;
		});
		if (line) {
			points = Array.from(line.pointsData);
			if (line.target === node1.id) {
				points.reverse();
			}
		}
		return { points: points, lineType: line.lineType };
	}
	AgGraphPath.prototype._getPathNode = function() {
		var _this = this;
		var source = _this.source;
		var target = _this.target;
		var sourceNode = _this.agGraph.getNode(source);
		var targetNode = _this.agGraph.getNode(target);
		var pathNode = [];
		if (sourceNode && targetNode) {
			var allNodeTree = {}
			var currentNeighbors = [{
				id: source,
				preNode: null,
				node: sourceNode
			}];
			while (!allNodeTree[target] && currentNeighbors.length) {
				var neighborNodeTrees = [];
				currentNeighbors.forEach(function(preNode) {
					neighborNodeTrees = neighborNodeTrees.concat(_this.agGraph.getNeighborNodes(preNode.node)
						.filter(function(n) {
							return !allNodeTree[n.id];
						})
						.map(function(n) {
							return {
								id: n.id,
								preNode: preNode,
								node: n
							}
						}));
				});
				neighborNodeTrees.forEach(function(n) {
					allNodeTree[n.id] = n;
				});
				currentNeighbors = neighborNodeTrees;
			}
			if (allNodeTree[target]) {
				var tempNode = allNodeTree[target];
				while (tempNode) {
					pathNode.push(tempNode.node);
					tempNode = tempNode.preNode;
				}
				return pathNode.reverse();
			}
		}
		return pathNode;
	}
	AgGraphPath.prototype._getPathLines = function() {
		var _this = this;
		var source = _this.source;
		var target = _this.target;
		var pathNode = this._getPathNode();
		var linesArrary = [];
		if (pathNode && pathNode.length) {
			pathNode.reduce(function(n1, n2) {
				linesArrary.push(_this._getConnectedNodeLine(n1, n2));
				return n2;
			});
		}
		return linesArrary;
	}
	AgGraphPath.prototype._renderLine = function(pointsArray) {
		var _this = this;
		if (_this._deleted) {
			return;
		}
		var $mark = _this.$path.select(".ag-graph-path-mark");
		var $arrow = $mark.select(".ag-graph-path-arrow");
		if (pointsArray.length) {
			var lineType = pointsArray[0].lineType;
			var lineFunction = d3.line().curve(_this.agGraph._lineFunctions[lineType])
				.x(function(p) { return p.x; })
				.y(function(p) { return -p.y; })

			var $line = _this.$path.append("path")
				.attr("d", lineFunction(pointsArray[0].points));
			$line.transition()
				.duration($line.node().getTotalLength() * PATH_SPEED)
				.ease(function(v) {
					return v;
				})
				.attrTween("stroke-dasharray", function() {
					var len = this.getTotalLength();
					return function(t) {
						var dasharrayString = (d3.interpolateString("0," + len, len + ",0"))(t)
						var moveDistance = +dasharrayString.split(",")[0];
						var movingPointInfo = getPointInfoAtLine(pointsArray[0].points, moveDistance, lineFunction);
						if (movingPointInfo) {
							$mark.attr("transform", "translate(" + movingPointInfo.x + "," + (-movingPointInfo.y) + ")");
							$arrow.attr("transform", "rotate(" + movingPointInfo.angel + ")");
						}
						return dasharrayString;
					};
				}).on("end", function() {
					$line.attr("stroke-dasharray", null);
					pointsArray.shift()
					_this._renderLine(pointsArray);
				});
		} else {
			if (_this.repeat) {
				setTimeout(function() {
					_this.$path.selectAll("path").remove();
					_this._renderLine(_this._getPathLines());
				}, 500);
			}
		}

	}
	AgGraphPath.prototype._render = function() {
		var _this = this;
		var classes = ["ag-graph-path"];
		if (Array.isArray(_this.class)) {
			classes = classes.concat(_this.class)
		} else {
			classes.push(_this.class);
		}
		_this.$path.attr("class", classes.join(" "))
		var pointsArrary = _this._getPathLines();
		if (pointsArrary.length) {
			_this.$path.style("display", "");
			_this.$path.selectAll("path").remove();
			_this._renderLine(pointsArrary);
		} else {
			this.$path.style("display", "none");
		}

	}

	AgGraphPath.prototype.delete = function() {
		this._deleted = true;
		this.$path.remove();
		removeArrayItem(this.agGraph.paths, this);
	}

	var svgTemplate = [
		'<svg style="width:100%;height:100%;" class="ag-graph">',
		'   <defs>',
		'       <filter id="node-selected" height="200%" width="200%">',
		'           <feGaussianBlur stdDeviation="2"/>',
		'           <feOffset dx="-6" dy="-6" />',
		'           <feMerge>',
		'               <feMergeNode/>',
		'               <feMergeNode in="SourceGraphic"/>',
		'           </feMerge>',
		'       </filter>',
		'       <path id="path-mark-arrow" d="M-4,-6 L4,0 L-4,6 L-4,-6"> fill="red"',
		'       </defs>',
		'   <g id="ag-line-group"></g>',
		'   <g id="ag-node-group"></g>',
		'   <g id="ag-point-group"></g>',
		'   <g id="ag-path-group"></g>',
		'</svg>'
	];

	/**
	 *
	 * @param { Object } config
	 * @param { string } config.container graph 容器选择器
	 */
	function AgGraph(config) {
		var _this = this;
		_this._lineFunctions = {
			line: d3.curveLinear,
			// basic:d3.curveBasis,
			// cardinal:d3.curveCardinal,
			curve: d3.curveCardinal
		}
		_this._config = config;
		container = document.querySelector(config.container);
		if (container) {
			_this._container = container;
			container.innerHTML = svgTemplate.join("\n");
			_this.$svg = d3.select(container).select("svg");
			_this._$nodeGroup = _this.$svg.select("#ag-node-group");
			_this._$lineGroup = _this.$svg.select("#ag-line-group");
			_this._$pointGroup = _this.$svg.select("#ag-point-group");
			_this._$pathGroup = _this.$svg.select("#ag-path-group");
			_this._isEditing = false;
			_this.view = new AgGraphView(_this);
			_this.view.scale = 1;
			_this.selection = new AgGraphSelection(_this);
			_this.nodes = [];
			_this.lines = [];
			_this.paths = [];
		} else {
			throw new Error("没有正确的graph容器!");
		}
		if (!hasPermission()) {
			throw new Error("只能运行在 localhost, 详细信息请咨询 http://www.aigodata.com");
		}
	}

	/**
	 * 继承事件机制
	 */
	AgGraph.prototype = Object.assign(EventPrototype, AgGraph.prototype);

	AgGraph.prototype.addNode = function(nodeData) {
		var _this = this;
		var node = new AgGraphNode(nodeData, _this);
		node._render();
		_this.nodes.push(node);
		_this._emit("node.add", node);
		return node;
	}

	AgGraph.prototype.getNeighborNodes = function(node) {
		var _this = this;
		// var node = nodeObj.node;
		var neighbors = [];
		node.lines.forEach(function(l) {
			var targetNode = _this.getNode(l.target);
			var sourceNode = _this.getNode(l.source);
			if (sourceNode !== node) {
				neighbors.push(sourceNode);
			}
			if (targetNode !== node) {
				neighbors.push(targetNode);
			}
		});
		return neighbors;
	}

	AgGraph.prototype.getNode = function(id) {
		return this.nodes.find(function(n) {
			return n.id === id;
		});
	}
	AgGraph.prototype.addLine = function(lineData) {
		var _this = this;
		var line = new AgGraphLine(lineData, _this);
		line._render(true);
		_this.lines.push(line);
		_this._emit("line.add", line);
		return line;
	}
	AgGraph.prototype.getLinesInNodes = function(nodes) {
		var nodeDic = {};
		nodes.forEach(function(n) {
			nodeDic[n.id] = n;
		});
		var lines = [];
		agGraph.lines.forEach(function(l) {
			if (nodeDic[l.source] && nodeDic[l.target]) {
				lines.push(l);
			}
		});
	}
	AgGraph.prototype.getLine = function(id) {
		return this.lines.find(function(l) {
			return l.id === id;
		});
	}
	AgGraph.prototype.isEditing = function() {
		return this._isEditing;
	}
	AgGraph.prototype.startEdit = function() {
		this._isEditing = true;
		this.$svg.classed("editing", true);
		var len = this.paths.length;
		while (len) {
			this.paths[len - 1].delete();
			len--;
		}
	}

	AgGraph.prototype.endEdit = function() {
		this._isEditing = false;
		this.$svg.classed("editing", false);
	}
	AgGraph.prototype.addPath = function(path) {
		var _this = this;
		if (_this.isEditing()) {
			throw new Error("编辑模式无法添加路径");
		}
		var path = new AgGraphPath(path, _this);
		_this.paths.push(path);
		return path;
	}
	AgGraph.prototype.getPath = function(id) {
		return this.paths.find(function(p) {
			return p.id === id;
		})
	}
	AgGraph.prototype.getNodesData = function(callback) {
		return this.nodes.map(function(node) {
			return callback(node);
		});
	}
	AgGraph.prototype.getLinesData = function(callback) {
		return this.lines.map(function(line) {
			return callback(line);
		});
	}
	AgGraph._version = "1.0.5";
	return AgGraph;
}, window);
