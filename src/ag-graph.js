; (function (name, definition, global) {
    //检测上下文环境是否为AMD或CMD
    var hasDefine = typeof global.define === 'function',
        // 检测上下文环境是否为Node
        hasExports = global.module && typeof global.module !== 'function' && global.module.exports;
    if (hasDefine) {
        //AMD环境或CMD环境
        define(definition);
    } else if (hasExports) {
        //定义为普通Node模块
        module.exports = definition();
    } else {
        //将模块的执行结果挂在window变量中，在浏览器中global指向window对象
        global[name] = definition();
    }

})('AgGraph', function () {
    var POINT_RADIUS = 4;
    var DEFAULT_NODE_SIZE = 30;
    var PROPERTY_CHANGE_DEBOUNCE_TIME = 10;
    var PATH_SPEED = 5; // path 的动画速度 time = length * PATH_SPEED;
    var ACCESS_PROPERTY_PREFIX = "__"; // 访问器属性的前缀。
    var tempData = {};// 临时变量，记录操作过程的临时状态值
    function debounce(action, delay) {
        var last;
        return function () {
            var ctx = this, args = arguments;
            clearTimeout(last)
            last = setTimeout(function () {
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
            get: function () {
                return obj[ACCESS_PROPERTY_PREFIX + property];
            },
            set: function (val) {
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
        arrayPoints.forEach(function (points) {
            if (points && points.length) {
                points.forEach(function (point, idx) {
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
        points.forEach((p, idx) => {
            if (idx) {
                len += getDistance(p, points[idx - 1]);
            }
        });
        return len;
    };
    // 获取2个点的角度
    function getPointsAngle(point1, point2) {
        var x1 = point1.x, y1 = point1.y, x2 = point2.x, y2 = point2.y;
        var x = Math.abs(x1 - x2);
        var y = Math.abs(y1 - y2);
        var z = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
        var sin = y / z;//相对x轴正方向的正弦值
        var radina = Math.asin(sin);//用反三角函数求弧度
        var angle = 180 / (Math.PI / radina);//将弧度转换成角度
        if (x2 > x1 && y2 > y1) {//第1象限
            angle = angle;
        }
        if (x2 == x1 && y2 > y1) {//y轴负方向上
            angle = 90;
        }
        if (x2 > x1 && y2 == y1) {//x轴正方向上
            angle = 0;
        }
        if (x2 < x1 && y2 > y1) {//第2象限
            angle = 180 - angle;
        }
        if (x2 < x1 && y2 == y1) {//x轴负方向
            angle = 180;
        }
        if (x2 < x1 && y2 < y1) {//第3象限
            angle = 180 + angle;
        }
        if (x2 == x1 && y2 < y1) {
            angle = 270;
        }
        if (x2 > x1 && y2 < y1) {
            angle = 360 - angle;
        }
        return angle;
    }
    /** 获取 距离线固定位置的点的信息
		* linePoints 线的各个拐点
		* distance 距离起始点的距离(线上)
	*/
    function getPointInfoAtLine(linePoints, distance) {
        var idx = 0;
        var lastPoint, lastTotalDistance = 0, lastDistance, nextPoint;
        while (!nextPoint) {
            lastPoint = linePoints[idx];
            var tempPoint = linePoints[idx + 1];
            if (!tempPoint) {
                break;
            }
            lastDistance = getDistance(lastPoint, tempPoint);
            if (distance <= lastTotalDistance + lastDistance) {
                nextPoint = tempPoint;
            } else {
                lastTotalDistance += lastDistance;
                idx++;
            }
        }
        if (nextPoint) {
            var angel = getPointsAngle(lastPoint, nextPoint);
            var x = lastPoint.x + (nextPoint.x - lastPoint.x) * (distance - lastTotalDistance) / lastDistance;
            var y = lastPoint.y + (nextPoint.y - lastPoint.y) * (distance - lastTotalDistance) / lastDistance;
            return {
                x: x,
                y: y,
                angel: angel
            }
        }
    }
    // 获取多个个点的中心位置
    function getPointsCenter(points) {
        var len = points.length;
        var x = 0, y = 0;
        points.forEach(function (p) {
            x += p.x;
            y += p.y;
        });
        return { x: x / len, y: y / len };
    }

    var EventPrototype = {
        on: function (names, callback) {
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
        off: function (name, callback) {
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
        _emit: function (name) {
            if (!this._events) {
                this._events = [];
            }
            var event = this._events[name];
            var args = Array.prototype.slice.call(arguments, 1);
            if (event) {
                var length = event.length;
                var i = 0;
                while (i < length) {
                    event[i].apply(this, args);
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
        }
        function dragSvgMove() {
            var x = d3.event.x;
            var y = d3.event.y;
            var viewBox_x = tempData.offset.x - x / _this.scale;
            var viewBox_y = tempData.offset.y - y / _this.scale;
            _this.viewBox = [viewBox_x, viewBox_y, _this.viewBox[2], _this.viewBox[3]];
        }

        function dragSvgEnd() {
            agGraph._emit("view.move", _this);
        }
        var dragView = d3.drag()
            .on("start", dragSvgStart)
            .on("drag", dragSvgMove)
            .on("end", dragSvgEnd)
        dragView.clickDistance(5);
        _this.agGraph.$svg.call(dragView)
            .on("click", function () {
                agGraph.selection.clearNodes();
                agGraph._emit("view.click", _this);
            })
            .on("contextmenu", function () {
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
    AgGraphView.prototype._setViewBox = function () {
        this.agGraph.$svg.attr("viewBox", this.viewBox.join(" "));
    };
    /**
     * 设置svg的缩放比率
     * @param {number} scale  
     */
    AgGraphView.prototype._setScale = function () {
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

    AgGraphView.prototype.zoomIn = function () {
        this.scale *= 1.3;
        this.agGraph._emit("view.zoom", this);
    }
    AgGraphView.prototype.zoomOut = function () {
        this.scale /= 1.3;
        this.agGraph._emit("view.zoom", this);
    }

    AgGraphView.prototype.move = function (x, y) {
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
    AgGraphSelection.prototype.nodes = function () {
        return Array.from(this._nodes);
    }
    AgGraphSelection.prototype.lines = function () {
        return Array.from(this._lines);
    }
    AgGraphSelection.prototype.points = function () {
        return Array.from(this._points);
    }
    AgGraphSelection.prototype.toggleNode = function (node) {
        var _this = this;
        if (node.selected) {
            _this.removeNode(node);
        } else {
            _this.addNode(node);
        }
    }
    AgGraphSelection.prototype.addNode = function (node) {
        var _this = this;
        var idx = _this._nodes.indexOf(node);
        if (idx < 0) {
            _this._nodes.push(node);
            node.selected = true;
            _this.agGraph._emit("selection.node.add", node);
        }
    }
    AgGraphSelection.prototype.removeNode = function (node) {
        var _this = this;
        var removedNode = removeArrayItem(_this._nodes, node);
        if (removedNode) {
            node.selected = false;
            _this.agGraph._emit("selection.node.remove", node);
        }
    }
    AgGraphSelection.prototype.clearNodes = function (node) {
        var _this = this;
        var selectedNodesCount = _this._nodes.length;
        _this._nodes.forEach(function (node) {
            node.selected = false;
        });
        _this._nodes = [];
        if (selectedNodesCount) {
            _this.agGraph._emit("selection.node.clear");
        }
    }
    AgGraphSelection.prototype.toggleLine = function (line) {
        var _this = this;
        if (line.selected) {
            _this.removeLine(line);
        } else {
            _this.addLine(line);
        }
    }
    AgGraphSelection.prototype.addLine = function (line) {
        var _this = this;
        var idx = _this._lines.indexOf(line);
        if (idx < 0) {
            _this._lines.push(line);
            line.selected = true;
            _this.agGraph._emit("selection.line.add", line);
        }
    }
    AgGraphSelection.prototype.removeLine = function (line) {
        var _this = this;
        var idx = _this._lines.indexOf(line);
        var removedLine = removeArrayItem(_this._lines, line);
        if (removedLine) {
            line.selected = false;
            _this.agGraph._emit("selection.line.remove", line);
        }
    }
    AgGraphSelection.prototype.clearLines = function (line) {
        var _this = this;
        var selectedLinesCount = _this._lines.length;
        _this._lines.forEach(function (line) {
            line.selected = false;
        });
        _this._lines = [];
        if (_this.selectedLinesCount) {
            _this.agGraph._emit("selection.line.clear");
        }
    }
    AgGraphSelection.prototype.togglePoint = function (point) {
        var _this = this;
        if (point.selected) {
            _this.removePoint(point);
        } else {
            _this.addPoint(point);
        }
    }
    AgGraphSelection.prototype.addPoint = function (point) {
        var _this = this;
        var idx = _this._points.indexOf(point);
        if (idx < 0) {
            _this._points.push(point);
            point.selected = true;
            _this.agGraph._emit("selection.point.add", point);
        }
    }
    AgGraphSelection.prototype.removePoint = function (point) {
        var _this = this;
        var idx = _this._points.indexOf(point);
        var removedPoint = removeArrayItem(_this._points, point);
        if (removedPoint) {
            point.selected = false;
            _this.agGraph._emit("selection.point.remove", point);
        }
    }
    AgGraphSelection.prototype.clearPoints = function (point) {
        var _this = this;
        var selectedPointsCount = _this._points.length;
        _this._points.forEach(function (point) {
            point.selected = false;
        });
        _this._points = [];
        if (_this.selectedPointsCount) {
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
        function dragNodeStart() {
            if (!agGraph.isEditing()) {
                return;
            }
            var mouse_x = d3.event.x;
            var mouse_y = d3.event.y;
            // 记录开始drag时，鼠标和node中心的距离
            tempData.offset = { x: mouse_x - _this.x, y: mouse_y - _this.y }
            tempData.pointsOffset = _this.anchorPoints.map(function (point) {
                return { x: mouse_x - point.x, y: mouse_y - point.y }
            });
        }
        function dragNodeMove() {
            if (!agGraph.isEditing()) {
                return;
            }
            var x = d3.event.x;
            var y = d3.event.y;
            _this.x = x - tempData.offset.x;
            _this.y = y - tempData.offset.y;
            _this.anchorPoints.forEach(function (point, idx) {
                point.x = x - tempData.pointsOffset[idx].x;
                point.y = y - tempData.pointsOffset[idx].y;
            });
        }
        function dragNodeEnd() {
            if (!agGraph.isEditing()) {
                return;
            }
            agGraph._emit("node.move", _this);
        }
        var dragNode = d3.drag()
            .on("start", dragNodeStart)
            .on("drag", dragNodeMove)
            .on("end", dragNodeEnd);
        dragNode.clickDistance(5);
        _this.$node = agGraph._$nodeGroup.append("g")
            .attr("node-id", _this.id)
            .classed("ag-graph-node", true);
        _this.$node.append("image").classed("ag-graph-node-image", true);
        _this.$node.call(dragNode)
            .on("click", function () {
                agGraph.selection.toggleNode(_this);
                d3.event.stopPropagation();
                agGraph._emit("node.click", _this);
            })
            .on("contextmenu", function () {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                agGraph._emit("node.rightClick", _this);
            });
    }

    AgGraphNode.prototype._render = function () {
        var _this = this;
        var $node = _this.$node;
        // 将node的 x，y 设置为$node的中心
        $node.attr("transform", "translate(" + (_this.x - _this.size / 2) + "," + (_this.y - _this.size / 2) + ")");
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
                .attr("r", 12);
            $badge.append("text").text(_this.badge).attr("y", 1);
        }

    };
    AgGraphNode.prototype.delete = function () {
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

    AgGraphNode.prototype.offset = function () {
        var rect = this.$node.select("image").node().getBoundingClientRect();
        return {
            x: rect.x,
            y: rect.y
        }
    }
    AgGraphNode.prototype.position = function () {
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
            points: [],
            pointsData: [],
        }, lineData);
        var _this = this;
        _this.agGraph = agGraph;
        var setterProperties = ["class", "selected"];//这些属性   这些属性的变化，需要重新绘制line
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
            // 获取line 的source到target 中心点的角度
            var deg = Math.PI * getPointsAngle({ x: _this.sourceNode.x, y: _this.sourceNode.y }, { x: _this.targetNode.x, y: _this.targetNode.y }) / 180;
            var sourceDiff = { x: ((_this.sourceNode.size / 2) + 4) * Math.cos(deg), y: ((_this.sourceNode.size / 2) + 4) * Math.sin(deg) };
            var targetDiff = { x: -((_this.targetNode.size / 2) + 4) * Math.cos(deg), y: -((_this.targetNode.size / 2) + 4) * Math.sin(deg) };
            var startPoint = { x: _this.sourceNode.x + sourceDiff.x, y: _this.sourceNode.y + sourceDiff.y };
            var endPoint = { x: _this.targetNode.x + targetDiff.x, y: _this.targetNode.y + targetDiff.y };
            _this.pointsData = [
                startPoint,
                getPointsCenter([startPoint, endPoint]),
                endPoint
            ];
        }

        _this.$line = agGraph._$lineGroup.append("g")
            .attr("line-id", _this.id)
            .on("click", function () {
                agGraph.selection.toggleLine(_this);
                d3.event.stopPropagation();
                agGraph._emit("line.click", _this);
            })
            .on("contextmenu", function () {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                agGraph._emit("line.rightClick", _this);
            });;
        _this.pointsData.forEach(function (pointData) {
            _this.points.push(new AgGraphPoint(pointData, _this));
        });
    }
    AgGraphLine.prototype._render = function (firstRender) {
        var _this = this;
        _this.$line.selectAll("*").remove();
        var $polyline = _this.$line.append('polyline')
            .attr('points', _this.pointsData.map(function (p) { return p.x + "," + p.y }).join(" "));
        if (_this.animate && firstRender) {
            $polyline.transition().duration(500)
                .attrTween("stroke-dasharray", function () {
                    var len = this.getTotalLength();
                    return function (t) { return (d3.interpolateString("0," + len, len + ",0"))(t) };
                }).on("end", function () {
                    $polyline.attr("stroke-dasharray", null);
                });
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
    AgGraphLine.prototype.delete = function () {
        var _this = this;
        var i = _this.points.length - 1;

        _this.points.forEach(function (point) {
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
            .attr("cy", _this.y)
            .attr("r", POINT_RADIUS);
        function dragPointStart() {
            if (d3.event.sourceEvent.shiftKey) {
                var newPointData = { x: _this.x, y: _this.y };

                var idx = _this.line.pointsData.indexOf(_this.pointData);
                var insertPointIdx;
                if (idx === _this.line.pointsData.length - 1) {
                    insertPointIdx = _this.line.pointsData.length - 1;
                } else {
                    insertPointIdx = idx + 1;
                }
                _this.line.pointsData.splice(insertPointIdx, 0, newPointData);
                var newPoint = new AgGraphPoint(newPointData, _this.line)
                _this.line.points.splice(insertPointIdx, 0, newPoint);
                _this.line.agGraph._emit("point.add", newPoint);
                // _this.line._render();
            }
            var mouse_x = d3.event.x;
            var mouse_y = d3.event.y;
            // 记录开始drag时，鼠标和Point中心的距离
            tempData.offset = { x: mouse_x - _this.x, y: mouse_y - _this.y }
        }
        function dragPointMove() {
            var x = d3.event.x;
            var y = d3.event.y;
            _this.x = x - tempData.offset.x;
            _this.y = y - tempData.offset.y;
        }
        function dragPointEnd() {
            _this.line.agGraph._emit("point.move", _this);
        }
        var dragPoint = d3.drag().on("start", dragPointStart).on("drag", dragPointMove);
        dragPoint.clickDistance(5);
        _this.$point.call(dragPoint)
            .on("click", function () {
                _this.line.agGraph.selection.togglePoint(_this);
                d3.event.stopPropagation();
                _this.line.agGraph._emit("point.click", _this);
            })
            .on("contextmenu", function () {
                d3.event.stopPropagation();
                d3.event.preventDefault();
                _this.line.agGraph._emit("point.rightClick", _this);
            });

    }
    AgGraphPoint.prototype._render = function () {
        var _this = this;
        _this.$point
            .attr("cx", _this.x)
            .attr("cy", _this.y)
            .classed("selected", _this.selected);

        // 重绘line
        _this.pointData.x = _this.x;
        _this.pointData.y = _this.y;
        _this.line._renderDebounce();
    }
    AgGraphPoint.prototype.delete = function () {
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

    AgGraphPath.prototype._getConnectedNodePoint = function (node1, node2) {
        var points = []
        var line = node1.lines.find(function (l) {
            return l.source === node2.id || l.target === node2.id;
        });
        if (line) {
            points = Array.from(line.pointsData);
            if (line.target === node1.id) {
                points.reverse();
            }
        }
        return points;
    }
    AgGraphPath.prototype._getPathNode = function () {
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
                currentNeighbors.forEach(function (preNode) {
                    neighborNodeTrees = neighborNodeTrees.concat(_this.agGraph.getNeighborNodes(preNode.node)
                        .filter(function (n) {
                            return !allNodeTree[n.id];
                        })
                        .map(function (n) {
                            return {
                                id: n.id,
                                preNode: preNode,
                                node: n
                            }
                        }));
                });
                neighborNodeTrees.forEach(function (n) {
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
    AgGraphPath.prototype._getPathPoints = function () {
        var _this = this;
        var source = _this.source;
        var target = _this.target;
        var pathNode = this._getPathNode();
        var pointsArrary = [];
        if (pathNode && pathNode.length) {
            pathNode.reduce(function (n1, n2) {
                pointsArrary.push(_this._getConnectedNodePoint(n1, n2));
                return n2;
            });
        }
        return pointsArrary;
    }
    AgGraphPath.prototype._renderLine = function (pointsArray) {
        var _this = this;
        if (_this._deleted) {
            return;
        }
        var $mark = _this.$path.select(".ag-graph-path-mark");
        var $arrow = $mark.select(".ag-graph-path-arrow");
        if (pointsArray.length) {
            var $line = _this.$path.append("polyline").attr('points', function () {
                return pointsArray[0].map(function (p) { return p.x + "," + p.y }).join(" ");
            });
            $line.transition()
                .duration($line.node().getTotalLength() * PATH_SPEED)
                .ease(function (v) { return v; })
                .attrTween("stroke-dasharray", function () {
                    var len = this.getTotalLength();
                    return function (t) {
                        var dasharrayString = (d3.interpolateString("0," + len, len + ",0"))(t)
                        var moveDistance = + dasharrayString.split(",")[0];
                        var movingPointInfo = getPointInfoAtLine(pointsArray[0], moveDistance);
                        if (movingPointInfo) {
                            $mark.attr("transform", "translate(" + movingPointInfo.x + "," + movingPointInfo.y + ")");
                            $arrow.attr("transform", "rotate(" + movingPointInfo.angel + ")");
                        }
                        return dasharrayString;
                    };
                }).on("end", function () {
                    $line.attr("stroke-dasharray", null);
                    pointsArray.shift()
                    _this._renderLine(pointsArray);
                });
        } else {
            if (_this.repeat) {
                setTimeout(function () {
                    _this.$path.selectAll("polyline").remove();
                    _this._renderLine(_this._getPathPoints());
                }, 500);
            }
        }

    }
    AgGraphPath.prototype._render = function () {
        var _this = this;
        var classes = ["ag-graph-path"];
        if (Array.isArray(_this.class)) {
            classes = classes.concat(_this.class)
        } else {
            classes.push(_this.class);
        }
        _this.$path.attr("class", classes.join(" "))
        var pointsArrary = _this._getPathPoints();
        if (pointsArrary.length) {
            _this.$path.style("display", "");
            _this.$path.selectAll("polyline").remove();
            _this._renderLine(pointsArrary);
        } else {
            this.$path.style("display", "none");
        }

    }

    AgGraphPath.prototype.delete = function () {
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
    }
    /**
     * 继承事件机制
     */
    AgGraph.prototype = Object.assign(EventPrototype, AgGraph.prototype);

    AgGraph.prototype.addNode = function (nodeData) {
        var _this = this;
        var node = new AgGraphNode(nodeData, _this);
        node._render();
        _this.nodes.push(node);
        _this._emit("node.add", node);
        return node;
    }

    AgGraph.prototype.getNeighborNodes = function (node) {
        var _this = this;
        // var node = nodeObj.node;
        var neighbors = [];
        node.lines.forEach(function (l) {
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

    AgGraph.prototype.getNode = function (id) {
        return this.nodes.find(function (n) {
            return n.id === id;
        });
    }
    AgGraph.prototype.addLine = function (lineData) {
        var _this = this;
        var line = new AgGraphLine(lineData, _this);
        line._render(true);
        _this.lines.push(line);
        _this._emit("line.add", line);
        return line;
    }
    AgGraph.prototype.getLine = function (id) {
        return this.lines.find(function (l) {
            return l.id === id;
        });
    }
    AgGraph.prototype.isEditing = function () {
        return this._isEditing;
    }
    AgGraph.prototype.startEdit = function () {
        this._isEditing = true;
        this.$svg.classed("editing", true);
        this.paths.forEach(function (path) {
            path.delete();
        })
    }

    AgGraph.prototype.endEdit = function () {
        this._isEditing = false;
        this.$svg.classed("editing", false);
    }
    AgGraph.prototype.addPath = function (path) {
        var _this = this;
        if (_this.isEditing()) {
            throw new Error("编辑模式无法添加路径");
        }
        var path = new AgGraphPath(path, _this);
        _this.paths.push(path);
        return path;
    }
    AgGraph.prototype.getPath = function (id) {
        return this.paths.find(function (p) {
            return p.id === id;
        })
    }
    AgGraph.prototype.getNodesData = function (callback) {
        return this.nodes.map(function (node) {
            return callback(node);
        });
    }
    AgGraph.prototype.getLinesData = function (callback) {
        return this.lines.map(function (line) {
            return callback(line);
        });
    }
    return AgGraph;
}, window);