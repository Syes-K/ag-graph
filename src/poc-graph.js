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

})('PocGraph', function () {
    var POINT_RADIUS = 4;
    var DEFAULT_NODE_SIZE = 30;
    var PROPERTY_CHANGE_DEBOUNCE_TIME = 10;
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
        obj["_" + property] = value;
        Object.defineProperty(obj, property, {
            get: function () {
                return obj["_" + property];
            },
            set: function (val) {
                var oldVal = obj["_" + property];
                obj["_" + property] = val;
                callback.apply(obj);
            }
        })
    }

    // 获取2个点的角度
    function getPointsAngle(position1, position2) {
        var x1 = position1.x, y1 = position1.y, x2 = position2.x, y2 = position2.y;
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
        }, _emit: function (name) {
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

    function PocGraphView(pocGraph) {
        var _this = this;
        
        _this.pocGraph = pocGraph;
        var rect = pocGraph.$svg.node().getBoundingClientRect();
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
            pocGraph._emit("view.viewBox.move");
        }
        var dragView = d3.drag()
            .on("start", dragSvgStart)
            .on("drag", dragSvgMove)
            .on("end", dragSvgEnd)
        dragView.clickDistance(5);
        _this.pocGraph.$svg.call(dragView);
    }
    /**
     * 设置viewbox
     */
    PocGraphView.prototype._setViewBox = function () {
        this.pocGraph.$svg.attr("viewBox", this.viewBox.join(" "));
    };
    /**
     * 设置svg的缩放比率
     * @param {number} scale  
     */
    PocGraphView.prototype._setScale = function () {
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

    function PocGraphSelection(pocGraph) {
        var _this = this;
        _this.pocGraph = pocGraph;
        _this.nodes = [];
        _this.lines = [];
        _this.points = [];
    }
    PocGraphSelection.prototype.toggleNode = function (node) {
        var _this = this;
        if (node.selected) {
            _this.removeNode(node);
        } else {
            _this.addNode(node);
        }
    }

    PocGraphSelection.prototype.addNode = function (node) {
        var _this = this;
        var idx = _this.nodes.indexOf(node);
        if (idx < 0) {
            _this.nodes.push(node);
            node.selected = true;
            _this.pocGraph._emit("selection.nodes.add", node);
        }
    }
    PocGraphSelection.prototype.removeNode = function (node) {
        var _this = this;
        var idx = _this.nodes.indexOf(node);
        if (idx >= 0) {
            this.nodes.splice(idx, 1);
            node.selected = false;
            _this.pocGraph._emit("selection.nodes.remove", node);
        }
    }
    PocGraphSelection.prototype.clearNodes = function (node) {
        var _this = this;
        var selectedNodesCount = _this.nodes.length;
        _this.nodes.forEach(function (node) {
            node.selected = false;
        });
        _this.nodes = [];
        if (selectedNodesCount) {
            _this.pocGraph._emit("selection.nodes.clear");
        }
    }
    PocGraphSelection.prototype.toggleLine = function (line) {
        var _this = this;
        if (line.selected) {
            _this.removeLine(line);
        } else {
            _this.addLine(line);
        }
    }
    PocGraphSelection.prototype.addLine = function (line) {
        var _this = this;
        var idx = _this.lines.indexOf(line);
        if (idx < 0) {
            _this.lines.push(line);
            line.selected = true;
            _this.pocGraph._emit("selection.lines.add", line);
        }
    }
    PocGraphSelection.prototype.removeLine = function (line) {
        var _this = this;
        var idx = _this.lines.indexOf(line);
        if (idx >= 0) {
            this.lines.splice(idx, 1);
            line.selected = false;
            _this.pocGraph._emit("selection.lines.remove", line);
        }
    }
    PocGraphSelection.prototype.clearLines = function (line) {
        var _this = this;
        var selectedLinesCount = _this.lines.length;
        _this.lines.forEach(function (line) {
            line.selected = false;
        });
        _this.lines = [];
        if (_this.selectedLinesCount) {
            _this.pocGraph._emit("selection.lines.clear");
        }
    }
    PocGraphSelection.prototype.togglePoint = function (point) {
        var _this = this;
        if (point.selected) {
            _this.removePoint(point);
        } else {
            _this.addPoint(point);
        }
    }
    PocGraphSelection.prototype.addPoint = function (point) {
        var _this = this;
        var idx = _this.points.indexOf(point);
        if (idx < 0) {
            _this.points.push(point);
            point.selected = true;
            _this.pocGraph._emit("selection.points.add", point);
        }
    }
    PocGraphSelection.prototype.removePoint = function (point) {
        var _this = this;
        var idx = _this.points.indexOf(point);
        if (idx >= 0) {
            this.points.splice(idx, 1);
            point.selected = false;
            _this.pocGraph._emit("selection.points.remove", point);
        }
    }
    PocGraphSelection.prototype.clearPoints = function (point) {
        var _this = this;
        var selectedPointsCount = _this.points.length;
        _this.points.forEach(function (point) {
            point.selected = false;
        });
        _this.points = [];
        if (_this.selectedPointsCount) {
            _this.pocGraph._emit("selection.points.clear");
        }
    }
    function PocGraphNode(nodeData, pocGraph) {
        nodeData = Object.assign({
            x: 0, y: 0, size: DEFAULT_NODE_SIZE, text: "", image: "",
            selected: false,
            lines: [],
            anchorPoints: []
        }, nodeData);
        var _this = this;
        _this.pocGraph = pocGraph;

        var setterProperties = ["x", "y", "size", "text", "image", "selected"];//这些属性的变化，需要重新绘制node
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
            var mouse_x = d3.event.x;
            var mouse_y = d3.event.y;
            // 记录开始drag时，鼠标和node中心的距离
            tempData.offset = { x: mouse_x - _this.x, y: mouse_y - _this.y }
            tempData.pointsOffset = _this.anchorPoints.map(function (point) {
                return { x: mouse_x - point.x, y: mouse_y - point.y }
            });
        }
        function dragNodeMove() {
            var x = d3.event.x;
            var y = d3.event.y;
            _this.x = x - tempData.offset.x;
            _this.y = y - tempData.offset.y;
            _this.anchorPoints.forEach(function (point, idx) {
                point.x = x - tempData.pointsOffset[idx].x;
                point.y = y - tempData.pointsOffset[idx].y;
            });
        }
        var dragNode = d3.drag().on("start", dragNodeStart).on("drag", dragNodeMove);
        dragNode.clickDistance(5);
        _this.$node = pocGraph.$nodeGroup.append("g")
            .attr("node-id", _this.id)
            .classed("poc-graph-node", true);
        _this.$node.append("image").classed("poc-graph-node-image", true);
        _this.$node.call(dragNode).on("click", function () {
            pocGraph.selection.toggleNode(_this);
            d3.event.stopPropagation();
        });
    }

    PocGraphNode.prototype._render = function () {
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
    };

    function PocGraphLine(lineData, pocGraph) {
        lineData = Object.assign({
            animate: false,
            color: "",
            class: [],
            selected: false,
            points: [],
            pointsData: [],
        }, lineData);
        var _this = this;
        _this.pocGraph = pocGraph;
        var setterProperties = ["color", "status", "selected"];//这些属性   这些属性的变化，需要重新绘制line
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

        _this.sourceNode = pocGraph.getNode(_this.source);
        _this.targetNode = pocGraph.getNode(_this.target);
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
            _this.pointsData = [
                { x: _this.sourceNode.x + sourceDiff.x, y: _this.sourceNode.y + sourceDiff.y },
                { x: _this.targetNode.x + targetDiff.x, y: _this.targetNode.y + targetDiff.y }
            ];
        }

        _this.$line = pocGraph.$lineGroup.append("g")
            .attr("line-id", _this.id)
            .classed("poc-graph-line", true)
            .on("click", function () {
                pocGraph.selection.toggleLine(_this);
                d3.event.stopPropagation();
            });
        _this.pointsData.forEach(function (pointData) {
            _this.points.push(new PocGraphPoint(pointData, _this));
        });
    }
    PocGraphLine.prototype._render = function (firstRender) {
        var _this = this;
        _this.$line.selectAll("*").remove();
        var $polyline = _this.$line.append('polyline')
            .attr('points', _this.pointsData.map(function (p) { return p.x + "," + p.y }).join(" "));
        if (_this.animate && firstRender) {
            $polyline.transition().duration(500)
                .attrTween("stroke-dasharray", function () {
                    var len = this.getTotalLength();
                    return function (t) { return (d3.interpolateString("0," + len, len + ",0"))(t) };
                }).on("end",function(){
                    $polyline.attr("stroke-dasharray",null);
                });
        }
        _this.$line.classed("selected", _this.selected);
    }

    function PocGraphPoint(pointData, line) {
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
            _this.anchorNode = _this.line.sourceNode;
        }
        if (idx === _this.line.pointsData.length - 1) {
            _this.line.targetNode.anchorPoints.push(_this);
            _this.anchorNode = _this.line.targetNode;
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
        _this.$point = line.pocGraph.$pointGroup.append("circle")
            .classed("poc-graph-point", true)
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
                _this.line.points.splice(insertPointIdx, 0, new PocGraphPoint(newPointData, _this.line));
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
        var dragPoint = d3.drag().on("start", dragPointStart).on("drag", dragPointMove);
        dragPoint.clickDistance(5);
        _this.$point.call(dragPoint).on("click", function () {
            _this.line.pocGraph.selection.togglePoint(_this);
            d3.event.stopPropagation();
        });

    }
    PocGraphPoint.prototype._render = function () {
        var _this = this;
        _this.$point
            .attr("cx", _this.x)
            .attr("cy", _this.y)
            .classed("selected", _this.selected);

        // 重绘line
        _this.pointData.x = _this.x;
        _this.pointData.y = _this.y;
        _this.line._render();
    }
    PocGraphPoint.prototype.delete = function () {
        var _this = this;
        _this.$point.remove();
        var idx = _this.line.points.indexOf(_this);
        _this.line.pocGraph.selection.removePoint(_this);
        _this.line.points.splice(idx, 1);
        _this.line.pointsData.splice(idx, 1);
        _this.line._render();
    }

    var svgTemplate = [
        '<svg style="width:100%;height:100%;">',
        '   <defs>',
        '       <filter id="node-selected" height="200%" width="200%">',
        '           <feGaussianBlur stdDeviation="2"/>',
        '           <feOffset dx="-6" dy="-6" />',
        '           <feMerge>',
        '               <feMergeNode/>',
        '               <feMergeNode in="SourceGraphic"/>',
        '           </feMerge>',
        '       </filter>',
        '       <path id="line-mark-arrow" d="M-4,-6 L4,0 L-4,6 L-4,-6">',
        '       </defs>',
        '   <g id="line-group"></g>',
        '   <g id="node-group"></g>',
        '   <g id="point-group"></g>',
        '</svg>'
    ];
    /**
     * 
     * @param { Object } config 
     * @param { string } config.container graph 容器选择器
     */
    function PocGraph(config) {
        var _this = this;
        _this.container = document.querySelector(config.container);
        if (_this.container) {
            _this.container.innerHTML = svgTemplate.join("\n");
            _this.$svg = d3.select(_this.container).select("svg");
            _this.$svg.on("click", function () {
                _this.selection.clearNodes();
            });
            _this.$nodeGroup = _this.$svg.select("#node-group");
            _this.$lineGroup = _this.$svg.select("#line-group");
            _this.$pointGroup = _this.$svg.select("#point-group");
            var rect = _this.$svg.node().getBoundingClientRect();
            _this.view = new PocGraphView(_this);
            _this.view.scale = 1;
            _this.graph = {
                nodes: [],
                lines: []
            };
            _this.selection = new PocGraphSelection(_this);
        } else {
            throw new Error("没有正确的graph容器!");
        }
    }
    /**
     * 继承事件机制
     */
    PocGraph.prototype = Object.assign(EventPrototype, PocGraph.prototype);

    PocGraph.prototype.addNode = function (nodeData) {
        var _this = this;
        var node = new PocGraphNode(nodeData, _this);
        node._render();
        _this.graph.nodes.push(node);
        _this._emit("graph.node.add");
        return node;
    }
    PocGraph.prototype.getNode = function (id) {
        return this.graph.nodes.find(function (n) {
            return n.id === id;
        });
    }
    PocGraph.prototype.addLine = function (lineData) {
        var _this = this;
        var line = new PocGraphLine(lineData, _this);
        line._render(true);
        _this.graph.lines.push(line);
        _this._emit("graph.line.add");
        return line;
    }


    return PocGraph
}, window);