# Ag Graph
一个基于点d3构建的svg graph 图形绘制框架

## 快速构建
- 引入d3 4.0.0 以上版本
```html
<script src="https://cdn.bootcss.com/d3/4.11.0/d3.js"></script>
```
- 在页面中引入ag-grpah 样式和脚本
```html
<link rel="stylesheet" href="文件所在目录/ag-graph.css">
<script src="文件所在目录/ag-graph.js"></script>
```

- 在html中需要一个graph的容器
```html
<div id="graph-container"></div>
```
- js中构建graph

```javascript
var agGraph = new AgGraph({ container: "#graph-container" }); // 创建agGraph实例
// 添加一个节点 可以用变量接受添加的节点以便后续的处理
var node1 = agGraph.addNode({
    id: "n1",
    x: 0, y: 0, // 位置信息
    size: 40, // 大小
    image: "./images/plus.jpg", // 节点显示的图片的路径。根据您的项目实际情况修改
    text: "plus", // 节点显示的文本
    badge: "99" // 徽章文本
});
// 再添加几个节点
agGraph.addNode({ id: "n2", x: -50, y: 100, size: 40, image: "./images/plus.jpg", badge: "99" });
agGraph.addNode({ id: "n3", x: -150, y: -100, size: 40, image: "./images/plus.jpg" });
agGraph.addNode({ id: "n4", x: 100, y: 0, size: 50, image: "./images/message.jpg" });

添加一条连线
var line1 = agGraph.addLine({
    id: "l1",
    source: "n2", // 连线的开始节点
    target: "n3", // 连线的结束节点
    animate: true // 绘制连线的时候是否开启动画
});
```

## API

### AgGraph
用来创建AgGraph实例，在创建的实例上才能进行node，line 的各种操作。
###### 创建AgGraph实例
- 输入 config
```
{
    "container": string // dom元素选择器
}
```
- 输出 `AgGraph`
- 例
```javascript
var agGraph = new AgGraph({ container: "#graph-container" })
```

### AgGraph实例对象方法
AgGraph实例对象可以用来创建节点，连线，等

##### addNode
    添加节点
- 输入 nodeData
```
{
	"id": string, // 节点id
    "x": number, // 节点在graph中的后坐标位置
    "y": number, // 节点在graph中的纵坐标位置
    "size": number, // 节点的大小
    "image": string, // 节点显示的图片(svg图片效果更佳)
    "text": string, // 节点显示的文本
    "badge": string, // 节点位置文本
}
```
- 输出 `AgGraphNode` (参考AgGraphNode实例 api)
- 例
```javascript
var node2 = agGraph.addNode({
    id: "n2",
    x: -50, y: 100, size: 40,
    image: "./images/plus.jpg", badge: "99",
    customAttr1:{someProperty1: "some value"}
});
console.log(node2);
```

##### getNode
通过id获取节点
- 输入 `id:string`
- 输出 `AgGraphNode`
- 例
```javascript
var node2 = agGraph.getNode("n2");
console.log(node2);
```

##### getNeighborNodes
获取node节点相邻的节点
- 输入 `node:AgGraphNode`
- 输出 `AgGraphNode[]`
- 例
```javascript
var node2 = agGraph.getNeighborNodes("n2");
var neighbors = agGraph.getNode(node2);
console.log(neighbors);
```

##### addLine
添加连线
- 输入 lineData
```
{
    "id":string, // 连线id
    "source": string, // 连线的开始节点id
    "target": string, // 连线的结束节点id
    "animate": boolean, // 是否使用动画来绘制连线
    "class": string[], // 连线的自定义样式(参考自定义样式api)
    "pointsData": {"x":number,"y":number}[], // 连线上的各个点位置(如果不设置，则通过source和target对应的node自动生成)
}
```
- 输出 `AgGraphLine`
- 例
```css
.ag-graph-line.hot-line polyline {
  stroke: #49ac19;
}
```
```javascript
agGraph.addNode({
    id: "n1",
    x: 0, y: 0, size: 40,
    image: "./images/plus.jpg", text: "plus"
});
agGraph.addNode({
    id: "n2",
    x: -50, y: 100, size: 40,
    image: "./images/plus.jpg", badge: "99"
});
var line1 = agGraph.addLine({
    id: "l1", source: "n1",
    target: "n2",class:["hot-line"],
    animate: true,
    customAttr1:{someProperty1: "some value"}
});
console.log(line1);
```

##### getLine
通过id获取连线
- 输入 `id:string`
- 输出 `AgGraphLine`
- 例
```javascript
var line1 = agGraph.getLine("l1");
console.log(line1);
```

##### startEdit
开启编辑模式(可以一点节点和连线上的点)
- 输入 无
- 输出 无
- 例
```javascript
agGraph.startEdit();
```
##### endEdit
结束编辑模式
- 输入 无
- 输出 无
- 例
```javascript
agGraph.endEdit();
```
##### isEditing
获取是否agGraph是否是编辑状态
- 输入 无
- 输出 `boolean`
- 例
```javascript
console.log(agGraph.isEditing());
```
##### addPath
添加一条移动的路径
- 输入 pathData
```json
{
    "id": string, // path id
    "source": string, // path 的开始节点id
    "target": string, // path的结束节点id
    "repeat": boolean, // 是否重复播放移动的动画
    "class": string[] // 自定义的class
}
```
- 输出 `AgGraphPath`
- 例
```javascript
agGraph.addPath({
    id: "p1",
    source: "n1",
    target: "n3",
    repeat: false,
    class: ["status-1"]
});
```

##### getPath
通过id获取连线
- 输入 `id:string`
- 输出 `AgGraphPath`
- 例
```javascript
var path1 = agGraph.getPath("p1");
console.log(path1);
```
##### getNodesData
获取节点的数据
- 输入 `callback:(node:AgGraphNode)=>any` // 将AgGraphNode转换成需要的数据回调函数
- 输出 `any[]`
- 例
```javascript
var data = agGraph.getNodesData(function(node){
    var nodeData = {
        id: node.id,
        position: [node.x,node.y],
        size: node.size,
        customAttr1:node.customAttr1
    }
    return nodeData;
});
console.log(data);
```

##### getLinesData
获取连线的数据
- 输入 `callback:(line:AgGraphLine)=>any` // 将AgGraphLine转换成需要的数据回调函数
- 输出 `any[]`
- 例
```javascript
var data = agGraph.getLinesData(function(line){
    var lineData = {
        id: line.id,
        points:line.pointsData,
        source:line.source,
        target:line.target,
    };
    return lineData;
});
console.log(data);
```

### AgGraph实例对象属性
可以直接获取AgGraph实例对象的所有node，所有line，选中的各个对象(node，line，point),以及view(整体graph的视图)

##### agGraph.view
- 输出 `AgGraphView` //参考AgGraphView实例api

##### agGraph.selection
- 输出 `AgGraphSelection` //参考AgGraphSelection实例api

##### agGraph.nodes
- 输出 `AgGraphNode[]` //agGraph上的所有AgGraphNode实例

##### agGraph.lines
- 输出 `AgGraphLine[]` //agGraph上的所有AgGraphLine实例

### AgGraphView 实例方法

##### zoomIn:放大视图
- 输入 无
- 输出 无
- 例
```javascript
agGraph.view.zoomIn();
```
##### zoomOut:缩小视图
- 输入 无
- 输出 无
- 例
```javascript
agGraph.view.zoomOut();
```
##### move:方法视图
- 输入 移动的距离
```
{
    "x":number, // x轴偏移量
    "y":number // y轴偏移量
}
```
- 输出 无
- 例
```javascript
agGraph.view.move(20,10);
```

### AgGraphView实例属性

###### viewBox
agGraph的视窗大小和偏移(相当于svg中的viewbox)
- 输出
```
[
    number, // 视窗x轴偏移量
    number, // 视窗y轴偏移量
    number, // 视窗宽度
    number, // 视窗高度
]
```
- 例
```javascript
console.log(agGraph.view.viewBox);
```


###### scale
agGraph的视窗放大缩小比率
- 输出 `numebr`
- 例
```javascript
console.log(agGraph.view.scale);
```

### AgGraphSelection实例方法

##### nodes
获取所有选中的node(按照选择的顺序排列)
- 输入 无
- 输出 `AgGraphNode[]`
- 例
```javascript
console.log(agGraph.selection.nodes());
```

##### addNode
将node实例添加到选择状态中
- 输入 `node:AgGraphNode|AgGraphNode[]`
- 输出 无
- 例
```javascript
var node1=agGraph.getNode("n1")
var node2=agGraph.getNode("n2")
var node3=agGraph.getNode("n3")
agGraph.selection.addNode([node1,node2]);
agGraph.selection.addNode(node3);
```
##### removeNode
将node实例添加从选择状态中移除
- 输入 `node:AgGraphNode|AgGraphNode[]`
- 输出 无
- 例
```javascript
var node2=agGraph.getNode("n2")
agGraph.selection.removeNode(node2);
agGraph.selection.removeNode(agGraph.selection.nodes);
```

##### toggleNode
切换node的选择状态
- 输入 `node:AgGraphNode`
- 输出 无
- 例
```javascript
var node2=agGraph.getNode("n2")
agGraph.selection.toggleNode(node2);
```

##### clearNodes
清除所有node的选择状态
- 输入 无
- 输出 无
- 例
```javascript
agGraph.selection.clearNodes();
```

##### lines
获取所有选中的line(按照选择的顺序排列)
- 输入 无
- 输出 `AgGraphLine[]`
- 例
```javascript
console.log(agGraph.selection.lines());
```
##### addLine
将line实例添加到选择状态中
- 输入 `line:AgGraphLine`
- 输出 无
- 例
```javascript
var line2=agGraph.getLine("l2")
agGraph.selection.addLine(line2);
```
##### removeLine
将line实例添加从选择状态中移除
- 输入 `line:AgGraphLine`
- 输出 无
- 例
```javascript
var line2=agGraph.getLine("l2")
agGraph.selection.removeLine(line2);
```

##### toggleLine
切换line的选择状态
- 输入 `line:AgGraphLine`
- 输出 无
- 例
```javascript
var line2=agGraph.getLine("l2")
agGraph.selection.toggleLine(line2);
```

##### clearLines
清除所有line的选择状态
- 输入 无
- 输出 无
- 例
```javascript
agGraph.selection.clearLines();
```


##### points
获取所有选中的point(按照选择的顺序排列)
- 输入 无
- 输出 `AgGraphPoint[]`
- 例
```javascript
console.log(agGraph.selection.points());
```
##### addPoint
将point实例添加到选择状态中
- 输入 `point:AgGraphPoint`
- 输出 无
- 例
```javascript
var line2=agGraph.getLine("l2")
agGraph.selection.addPoint(line2.points[0]);
```
##### removePoint
将point实例添加从选择状态中移除
- 输入 `point:AgGraphPoint`
- 输出 无
- 例
```javascript
var selectedPoints=agGraph.selection.points()
agGraph.selection.removePoint(selectedPoints[0]);
```

##### togglePoint
切换point的选择状态
- 输入 `point:AgGraphPoint`
- 输出 无
- 例
```javascript
var line2=agGraph.getLine("l2")
agGraph.selection.togglePoint(line2.points[0]);
```

##### clearPoints
清除所有point的选择状态
- 输入 无
- 输出 无
- 例
```javascript
agGraph.selection.clearPoints();
```


### AgGraphNode实例方法

##### delete
删除node节点
- 输入 无
- 输出 无
- 例
```javascript
var node2=agGraph.getNode("n2");
node2.delete();
```
##### offset
获取node节点相对于浏览器视窗的偏移
- 输入 无
- 输出
```
{
    "x":number, // x轴方向偏移
    "y":number // y轴方向偏移
}
```
- 例
```javascript
var node2=agGraph.getNode("n2");
console.log(node2.offset());
```
##### position
获取node节点相对于定位父元素的偏移
- 输入 无
- 输出
```
{
    "x":number, // x轴方向偏移
    "y":number // y轴方向偏移
}
```
- 例
```javascript
var node2=agGraph.getNode("n2");
console.log(node2.offset());
```

### AgGraphNode实例属性

##### agGraph
- 输出  `AgGraph` // 节点所属的 AgGraph实例

###### $node
- 输出 `d3.selection` // 节点对应的d3元素

##### anchorPoints
- 输出 `AgGraphPoint[]` // 连接节点的连线中停靠在节点上的点，节点移动时，这些点也会移动

##### id
- 输出  `string` // 节点的id

##### lines
- 输出  `AgGraphLine[]` // 连接节点的所有连线

##### badge
- 输出  `string` // 节点的徽章文本

##### image
- 输出  `string` // 节点图片的地址

##### selected
- 输出  `boolean` // 节点的是否被选中

##### size
- 输出  `number` // 节点的大小

##### selected
- 输出  `string` // 节点的id

##### text
- 输出  `string` // 节点的文本

##### x
- 输出  `number` // 节点在graph上x轴的位置

##### y
- 输出  `number` // 节点在graph上y轴的位置


### AgGraphLine实例方法

##### delete
删除连线
- 输入 无
- 输出 无
- 例
```javascript
var line1=agGraph.getNode("l1");
line1.delete();
```

### AgGraphLine实例属性

##### agGraph
- 输出  `AgGraph` // 连线所属的 AgGraph实例

###### $line
- 输出 `d3.selection` // 连线对应的d3元素

###### animate
- 输出 `boolean` // 绘制连线时是否有动画效果

##### id
- 输出  `string` // 连线的id

##### points
- 输出  `AgGraphPoint[]` // 连线上的所有点

##### pointsData
- 输出  `{"x":number,"y":number}[]` // 连线上点的原始数据

##### source
- 输出  `string` // 连线开始节点id

##### sourceNode
- 输出  `AgGraphNode` // 连线开始节点

##### target
- 输出  `string` // 连线结束节点id

##### targetNode
- 输出  `AgGraphNode` // 连线结束节点

##### class
- 输出  `string[]` // 连线自定义样式

##### selected
- 输出  `boolean` // 连线选择状态


### AgGraphPoint实例方法

##### delete
删除连线
- 输入 无
- 输出 无
- 例
```javascript
var line1=agGraph.getNode("l1");
line1.points[1].delete();
```

### AgGraphPoint实例属性

###### $point
- 输出 `d3.selection` // 点对应的d3元素

###### anchorNode
- 输出 `AgGraphNode` // 点停靠的节点 ，anchorNode 移动时，该点也会移动。

###### line
- 输出 `AgGraphLine` // 点所在的连线

###### pointData
- 输出 `{"x":number,"y":number}` // 点的源数据

###### pointData
- 输出 `{"x":number,"y":number}` // 点的源数据

###### selected
- 输出 `boolean` // 点的选中状态

##### x
- 输出  `number` // 点在graph上x轴的位置

##### y
- 输出  `number` // 点在graph上y轴的位置

### AgGraphPath实例方法

##### delete
删除连线
- 输入 无
- 输出 无
- 例
```javascript
var path1=agGraph.getPath("p1");
if(path1){
    path1.delete();
}
```
### AgGraphPath实例属性

###### id
- 输出  `string` // 路径的id

###### $path
- 输出 `d3.selection` // 路径对应的d3元素

###### agGraph
- 输出  `AgGraph` // 连线所属的 AgGraph实例

###### repeat
- 输出 `boolean` // 是否重复播放动画

###### source
- 输出 `string` // 开始的节点id

###### target
- 输出 `string` // 结束的节点id

###### class
- 输出 `string[]` // 自定义的样式

### Event
AgGraph实例的各种event

##### node.add
添加节点
- 参数  `node:AgGraphNode` // 添加的节点实例
- 例
```javascript
agGraph.on("node.add",function(node){
	console.log(node);
});
```
##### node.delete
删除节点
- 参数  `node:AgGraphNode` // 删除的节点实例
- 例
```javascript
agGraph.on("node.delete",function(node){
	console.log(node);
});
```
##### node.move
移动节点
- 参数  `node:AgGraphNode` // 移动的节点实例
- 例
```javascript
agGraph.on("node.move",function(node){
	console.log(node);
});
```
##### node.click
点击节点
- 参数  `node:AgGraphNode` // 点击的节点实例
- 例
```javascript
agGraph.on("node.click",function(node){
	console.log(node);
});
```
##### node.rightClick
右键节点
- 参数  `node:AgGraphNode` // 右键的节点实例
- 例
```javascript
agGraph.on("node.rightClick",function(node){
	console.log(node);
});
```
##### line.add
添加连线
- 参数  `line:AgGraphLine` // 添加的连线实例
- 例
```javascript
agGraph.on("line.add",function(line){
	console.log(line);
});
```
##### line.delete
删除连线
- 参数  `line:AgGraphLine` // 删除的连线实例
- 例
```javascript
agGraph.on("line.delete",function(line){
	console.log(line);
});
```
##### line.click
点击连线
- 参数  `line:AgGraphLine` // 点击的连线实例
- 例
```javascript
agGraph.on("line.click",function(line){
	console.log(line);
});
```
##### line.rightClick
右键连线
- 参数  `line:AgGraphLine` // 右键的连线实例
- 例
```javascript
agGraph.on("line.rightClick",function(line){
	console.log(line);
});
```

##### point.add
添加连线上的点
- 参数  `point:AgGraphNode` // 添加的点实例
- 例
```javascript
agGraph.on("point.add",function(point){
	console.log(point);
});
```
##### point.delete
删除点
- 参数  `point:AgGraphNode` // 删除的点实例
- 例
```javascript
agGraph.on("point.delete",function(point){
	console.log(point);
});
```
##### point.move
移动点
- 参数  `point:AgGraphNode` // 移动的点实例
- 例
```javascript
agGraph.on("point.move",function(point){
	console.log(point);
});
```
##### point.click
点击点
- 参数  `point:AgGraphNode` // 点击的点实例
- 例
```javascript
agGraph.on("point.click",function(point){
	console.log(point);
});
```
##### point.rightClick
右键点
- 参数  `point:AgGraphNode` // 右键的点实例
- 例
```javascript
agGraph.on("point.rightClick",function(point){
	console.log(point);
});
```
##### view.move
移动视图
- 参数  `view:AgGraphView` // 移动的视图
- 例
```javascript
agGraph.on("view.move",function(view){
	console.log(view.viewBox);
});
```
##### view.zoom
缩放视图
- 参数  `view:AgGraphView` // 缩放的视图
- 例
```javascript
agGraph.on("view.zoom",function(view){
	console.log(view.scale);
});
```
##### view.click
点击视图
- 参数  `view:AgGraphView` // 点击的视图
- 例
```javascript
agGraph.on("view.click",function(view){
	console.log(view);
});
```
##### view.rightClick
右键视图
- 参数  `view:AgGraphView, position:{"x":number,"y":number}, offset:{"x":number,"y":number}` // 右键的视图, 相对定位父元素的偏移, 相对浏览器视窗的偏移
- 例
```javascript
agGraph.on("view.rightClick",function(view, position, offset){
	console.log(view, position, offset);
});
```
##### selection.node.add
节点添加到选择状态
- 参数  `selectedNodes:AgGraphNode[],node:AgGraphNode` // 所有选中的节点,添加的节点
- 例
```javascript
agGraph.on("selection.node.add",function(selectedNodes,node){
	console.log(selectedNodes,node);
});
```
##### selection.node.remove
节点移除选择状态
- 参数  `selectedNodes:AgGraphNode[],node:AgGraphNode` // 所有选中的节点,移除的节点
- 例
```javascript
agGraph.on("selection.node.remove",function(selectedNodes,node){
	console.log(selectedNodes,node);
});
```
##### selection.node.clear
移除所有节点选择状态
- 参数 无
- 例
```javascript
agGraph.on("selection.node.clear",function(){
	console.log(agGraph.selection.nodes());
});
```
##### selection.line.add
连线添加到选择状态
- 参数  `selectedLines:AgGraphLine[],line:AgGraphLine` // 所有选中的连线,添加的连线
- 例
```javascript
agGraph.on("selection.line.add",function(selectedLines,line){
	console.log(selectedLines,line);
});
```
##### selection.line.remove
连线移除选择状态
- 参数  `selectedLines:AgGraphLine[],line:AgGraphLine` // 所有选中的连线,移除的连线
- 例
```javascript
agGraph.on("selection.line.remove",function(selectedLines,line){
	console.log(selectedLines,line);
});
```
##### selection.line.clear
移除所有连线选择状态
- 参数 无
- 例
```javascript
agGraph.on("selection.line.clear",function(){
	console.log(agGraph.selection.lines());
});
```
##### selection.point.add
节点添加到选择状态
- 参数  `selectedPoints:AgGraphPoint[],point:AgGraphPoint` // 所有选中的节点,添加的节点
- 例
```javascript
agGraph.on("selection.point.add",function(selectedPoints,point){
	console.log(selectedPoints,point);
});
```
##### selection.point.remove
节点移除选择状态
- 参数  `selectedPoints:AgGraphPoint[],point:AgGraphPoint` // 所有选中的节点,移除的节点
- 例
```javascript
agGraph.on("selection.point.remove",function(selectedPoints,point){
	console.log(selectedPoints,point);
});
```
##### selection.point.clear
移除所有节点选择状态
- 参数 无
- 例
```javascript
agGraph.on("selection.node.clear",function(){
	console.log(agGraph.selection.points());
});
```
