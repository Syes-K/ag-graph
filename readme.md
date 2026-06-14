# Ag Graph
An SVG graph drawing framework built on D3

## Quick Start
- Include D3 version 4.0.0 or above
```html
<script src="https://cdn.bootcss.com/d3/4.11.0/d3.js"></script>
```
- Include ag-graph styles and scripts in the page
```html
<link rel="stylesheet" href="directory-where-files-are-located/ag-graph.css">
<script src="directory-where-files-are-located/ag-graph.js"></script>
```

- The HTML needs a container for the graph
```html
<div id="graph-container"></div>
```

- Build the graph in JavaScript
```javascript
var agGraph = new AgGraph({ container: "#graph-container" }); // Create an agGraph instance
// Add a node; capture the returned node in a variable for later use
var node1 = agGraph.addNode({
    id: "n1",
    x: 0, y: 0, // Position
    size: 40, // Size
    image: "./images/plus.jpg", // Path to the image displayed on the node; adjust for your project
    text: "plus", // Text displayed on the node
    badge: "99" // Badge text
});
// Add a few more nodes
agGraph.addNode({ id: "n2", x: -50, y: 100, size: 40, image: "./images/plus.jpg", badge: "99" });
agGraph.addNode({ id: "n3", x: -150, y: -100, size: 40, image: "./images/plus.jpg" });
agGraph.addNode({ id: "n4", x: 100, y: 0, size: 50, image: "./images/message.jpg" });
// Add a line
var line1 = agGraph.addLine({
    id: "l1",
    source: "n2", // Source node of the line
    target: "n3", // Target node of the line
    animate: true // Whether to animate when drawing the line
});
```

## API

### AgGraph
Used to create an AgGraph instance; node and line operations are performed on the created instance.
###### Create an AgGraph instance
- Input config
```
{
    "container": string // DOM element selector
}
```
- Output `AgGraph`
- Example
```javascript
var agGraph = new AgGraph({ container: "#graph-container" })
```

### AgGraph Instance Methods
An AgGraph instance can be used to create nodes, lines, and more.

##### addNode
Add a node

- Input nodeData
```
{
	"id": string, // Node id
    "x": number, // Horizontal position of the node in the graph
    "y": number, // Vertical position of the node in the graph
    "size": number, // Node size
    "image": string, // Image displayed on the node (SVG images work best)
    "text": string, // Text displayed on the node
    "badge": string, // Badge text on the node
}
```
- Output `AgGraphNode` (see AgGraphNode instance API)
- Example
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
Get a node by id

- Input `id: string`
- Output `AgGraphNode`
- Example
```javascript
var node2 = agGraph.getNode("n2");
console.log(node2);
```

##### getNeighborNodes
Get nodes adjacent to a node

- Input `node:AgGraphNode`
- Output `AgGraphNode[]`
- Example
```javascript
var node2 = agGraph.getNeighborNodes("n2");
var neighbors = agGraph.getNode(node2);
console.log(neighbors);
```

##### addLine
Add a line

- Input lineData
```
{
    "id":string, // Line id
    "source": string, // Source node id of the line
    "target": string, // Target node id of the line
    "animate": boolean, // Whether to animate when drawing the line
    "class": string[], // Custom line styles (see custom styles API)
    "text": string, // Line text
    "pointsData": {"x":number,"y":number}[], // Positions of points along the line (if not set, auto-generated from source and target nodes)
}
```
- Output `AgGraphLine`
- Example
```css
.ag-graph-line.hot-line path {
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
    text: "related",
    customAttr1:{someProperty1: "some value"}
});
console.log(line1);
```

##### getLine
Get a line by id

- Input `id:string`
- Output `AgGraphLine`
- Example
```javascript
var line1 = agGraph.getLine("l1");
console.log(line1);
```

##### startEdit
Enable edit mode (nodes and points on lines can be clicked)

- Input none
- Output none
- Example
```javascript
agGraph.startEdit();
```

##### endEdit
End edit mode

- Input none
- Output none
- Example
```javascript
agGraph.endEdit();
```

##### isEditing
Get whether agGraph is in edit mode

- Input none
- Output `boolean`
- Example
```javascript
console.log(agGraph.isEditing());
```

##### addPath
Add an animated path

- Input pathData
```json
{
    "id": string, // Path id
    "source": string, // Source node id of the path
    "target": string, // Target node id of the path
    "repeat": boolean, // Whether to repeat the movement animation
    "class": string[] // Custom classes
}
```
- Output `AgGraphPath`
- Example
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
Get a path by id

- Input `id:string`
- Output `AgGraphPath`
- Example
```javascript
var path1 = agGraph.getPath("p1");
console.log(path1);
```

##### getNodesData
Get node data

- Input `callback:(node:AgGraphNode)=>any` // Callback that transforms AgGraphNode into the desired data
- Output `any[]`
- Example
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
Get line data

- Input `callback:(line:AgGraphLine)=>any` // Callback that transforms AgGraphLine into the desired data
- Output `any[]`
- Example
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

### AgGraph Instance Properties
Access all nodes, all lines, selected objects (node, line, point), and the view (overall graph viewport) directly from the AgGraph instance.

##### agGraph.view
- Output `AgGraphView` // See AgGraphView instance API

##### agGraph.selection
- Output `AgGraphSelection` // See AgGraphSelection instance API

##### agGraph.nodes
- Output `AgGraphNode[]` // All AgGraphNode instances on agGraph

##### agGraph.lines
- Output `AgGraphLine[]` // All AgGraphLine instances on agGraph

### AgGraphView Instance Methods

##### zoomIn: zoom in
- Input none
- Output none
- Example
```javascript
agGraph.view.zoomIn();
```

##### zoomOut: zoom out
- Input none
- Output none
- Example
```javascript
agGraph.view.zoomOut();
```

##### move: move the view
- Input distance to move
```
{
    "x":number, // X-axis offset
    "y":number // Y-axis offset
}
```
- Output none
- Example
```javascript
agGraph.view.move(20,10);
```

### AgGraphView Instance Properties

##### viewBox
Viewport size and offset of agGraph (equivalent to viewBox in SVG)

- Output
```json
[
    number, // Viewport x-axis offset
    number, // Viewport y-axis offset
    number, // Viewport width
    number, // Viewport height
]
```
- Example
```javascript
console.log(agGraph.view.viewBox);
```

##### scale
Viewport zoom scale ratio of agGraph

- Output `numebr`
- Example
```javascript
console.log(agGraph.view.scale);
```

### AgGraphSelection Instance Methods

##### nodes
Get all selected nodes (in selection order)

- Input none
- Output `AgGraphNode[]`
- Example
```javascript
console.log(agGraph.selection.nodes());
```

##### addNode
Add node instance(s) to selection

- Input `node:AgGraphNode|AgGraphNode[]`
- Output none
- Example
```javascript
var node1=agGraph.getNode("n1")
var node2=agGraph.getNode("n2")
var node3=agGraph.getNode("n3")
agGraph.selection.addNode([node1,node2]);
agGraph.selection.addNode(node3);
```

##### removeNode
Remove node instance(s) from selection

- Input `node:AgGraphNode|AgGraphNode[]`
- Output none
- Example
```javascript
var node2=agGraph.getNode("n2")
agGraph.selection.removeNode(node2);
agGraph.selection.removeNode(agGraph.selection.nodes);
```

##### toggleNode
Toggle node selection state

- Input `node:AgGraphNode`
- Output none
- Example
```javascript
var node2=agGraph.getNode("n2")
agGraph.selection.toggleNode(node2);
```

##### clearNodes
Clear all node selection states

- Input none
- Output none
- Example
```javascript
agGraph.selection.clearNodes();
```

##### lines
Get all selected lines (in selection order)

- Input none
- Output `AgGraphLine[]`
- Example
```javascript
console.log(agGraph.selection.lines());
```

##### addLine
Add line instance to selection

- Input `line:AgGraphLine`
- Output none
- Example
```javascript
var line2=agGraph.getLine("l2")
agGraph.selection.addLine(line2);
```

##### removeLine
Remove line instance from selection

- Input `line:AgGraphLine`
- Output none
- Example
```javascript
var line2=agGraph.getLine("l2")
agGraph.selection.removeLine(line2);
```

##### toggleLine
Toggle line selection state

- Input `line:AgGraphLine`
- Output none
- Example
```javascript
var line2=agGraph.getLine("l2")
agGraph.selection.toggleLine(line2);
```

##### clearLines
Clear all line selection states

- Input none
- Output none
- Example
```javascript
agGraph.selection.clearLines();
```

##### points
Get all selected points (in selection order)

- Input none
- Output `AgGraphPoint[]`
- Example
```javascript
console.log(agGraph.selection.points());
```
##### addPoint
Add point instance to selection

- Input `point:AgGraphPoint`
- Output none
- Example
```javascript
var line2=agGraph.getLine("l2")
agGraph.selection.addPoint(line2.points[0]);
```

##### removePoint
Remove point instance from selection

- Input `point:AgGraphPoint`
- Output none
- Example
```javascript
var selectedPoints=agGraph.selection.points()
agGraph.selection.removePoint(selectedPoints[0]);
```

##### togglePoint
Toggle point selection state

- Input `point:AgGraphPoint`
- Output none
- Example
```javascript
var line2=agGraph.getLine("l2")
agGraph.selection.togglePoint(line2.points[0]);
```

##### clearPoints
Clear all point selection states

- Input none
- Output none
- Example
```javascript
agGraph.selection.clearPoints();
```

### AgGraphNode Instance Methods

##### delete
Delete node

- Input none
- Output none
- Example
```javascript
var node2=agGraph.getNode("n2");
node2.delete();
```

##### offset
Get node offset relative to the browser viewport

- Input none
- Output
```
{
    "x":number, // X-axis offset
    "y":number // Y-axis offset
}
```
- Example
```javascript
var node2=agGraph.getNode("n2");
console.log(node2.offset());
```

##### position
Get node position relative to its offset parent

- Input none
- Output
```
{
    "x":number, // X-axis offset
    "y":number // Y-axis offset
}
```
- Example
```javascript
var node2=agGraph.getNode("n2");
console.log(node2.offset());
```

### AgGraphNode Instance Properties

##### agGraph
- Output  `AgGraph` // AgGraph instance the node belongs to

###### $node
- Output `d3.selection` // d3 element for the node

##### anchorPoints
- Output `AgGraphPoint[]` // Anchor points on lines connected to this node; they move when the node moves

##### id
- Output  `string` // Node id

##### lines
- Output  `AgGraphLine[]` // All lines connected to the node

##### badge
- Output  `string` // Node badge text

##### image
- Output  `string` // Node image URL

##### selected
- Output  `boolean` // Whether the node is selected

##### size
- Output  `number` // Node size

##### selected
- Output  `string` // Node id

##### text
- Output  `string` // Node text

##### x
- Output  `number` // Node x position on the graph

##### y
- Output  `number` // Node y position on the graph


### AgGraphLine Instance Methods

##### delete
Delete line

- Input none
- Output none
- Example
```javascript
var line1=agGraph.getNode("l1");
line1.delete();
```

### AgGraphLine Instance Properties

##### agGraph
- Output  `AgGraph` // AgGraph instance the line belongs to

###### $line
- Output `d3.selection` // d3 element for the line

###### animate
- Output `boolean` // Whether the line is drawn with animation

##### id
- Output  `string` // Line id

##### points
- Output  `AgGraphPoint[]` // All points on the line

##### pointsData
- Output  `{"x":number,"y":number}[]` // Raw point data on the line

##### source
- Output  `string` // Source node id of the line

##### sourceNode
- Output  `AgGraphNode` // Source node of the line

##### target
- Output  `string` // Target node id of the line

##### targetNode
- Output  `AgGraphNode` // Target node of the line

##### lineType
- Output  `"line"|"curve"` // Line shape (line: straight line, curve: curve)

##### class
- Output  `string[]` // Custom line styles

##### selected
- Output  `boolean` // Line selection state

##### text
- Output  `string` // Line text


### AgGraphPoint Instance Methods

##### delete
Delete line

- Input none
- Output none
- Example
```javascript
var line1=agGraph.getNode("l1");
line1.points[1].delete();
```

### AgGraphPoint Instance Properties

###### $point
- Output `d3.selection` // d3 element for the point

###### anchorNode
- Output `AgGraphNode` // Node the point is anchored to; the point moves when anchorNode moves.

###### line
- Output `AgGraphLine` // Line the point belongs to

###### pointData
- Output `{"x":number,"y":number}` // Raw point data

###### pointData
- Output `{"x":number,"y":number}` // Raw point data

###### selected
- Output `boolean` // Point selection state

##### x
- Output  `number` // Point x position on the graph

##### y
- Output  `number` // Point y position on the graph

### AgGraphPath Instance Methods

##### delete
Delete line

- Input none
- Output none
- Example
```javascript
var path1=agGraph.getPath("p1");
if(path1){
    path1.delete();
}
```

### AgGraphPath Instance Properties

###### id
- Output  `string` // Path id

###### $path
- Output `d3.selection` // d3 element for the path

###### agGraph
- Output  `AgGraph` // AgGraph instance the path belongs to

###### repeat
- Output `boolean` // Whether to repeat the animation

###### source
- Output `string` // Source node id

###### target
- Output `string` // Target node id

###### class
- Output `string[]` // Custom styles

### Event
Events on the AgGraph instance

##### node.add
Add node

- Parameters  `node:AgGraphNode` // Added node instance
- Example
```javascript
agGraph.on("node.add",function(node){
	console.log(node);
});
```

##### node.delete
Delete node

- Parameters  `node:AgGraphNode` // Deleted node instance
- Example
```javascript
agGraph.on("node.delete",function(node){
	console.log(node);
});
```

##### node.move
Move node

- Parameters  `node:AgGraphNode` // Moved node instance
- Example
```javascript
agGraph.on("node.move",function(node){
	console.log(node);
});
```

##### node.click
Click node

- Parameters  `node:AgGraphNode, position:{x:number,y:number}` // Clicked node instance, click position
- Example
```javascript
agGraph.on("node.click",function(node, position){
	console.log(node, position);
});
```

##### node.rightClick
Right-click node

- Parameters  `node:AgGraphNode, position:{x:number,y:number}` // Right-clicked node instance, click position
- Example
```javascript
agGraph.on("node.rightClick",function(node, position){
	console.log(node,position);
});
```

##### line.add
Add line

- Parameters  `line:AgGraphLine` // Added line instance
- Example
```javascript
agGraph.on("line.add",function(line){
	console.log(line);
});
```

##### line.delete
Delete line

- Parameters  `line:AgGraphLine` // Deleted line instance
- Example
```javascript
agGraph.on("line.delete",function(line){
	console.log(line);
});
```

##### line.click
Click line

- Parameters  `line:AgGraphLine, position:{x:number,y:number}` // Clicked line instance, click position
- Example
```javascript
agGraph.on("line.click",function(line, position){
	console.log(line, position);
});
```

##### line.rightClick
Right-click line

- Parameters  `line:AgGraphLine, position:{x:number,y:number}` // Right-clicked line instance, click position
- Example
```javascript
agGraph.on("line.rightClick",function(line, position){
	console.log(line, position);
});
```

##### point.add
Add point on line

- Parameters  `point:AgGraphNode` // Added point instance
- Example
```javascript
agGraph.on("point.add",function(point){
	console.log(point);
});
```

##### point.delete
Delete point

- Parameters  `point:AgGraphNode` // Deleted point instance
- Example
```javascript
agGraph.on("point.delete",function(point){
	console.log(point);
});
```

##### point.move
Move point

- Parameters  `point:AgGraphNode` // Moved point instance
- Example
```javascript
agGraph.on("point.move",function(point){
	console.log(point);
});
```

##### point.click
Click point

- Parameters  `point:AgGraphNode` // Clicked point instance
- Example
```javascript
agGraph.on("point.click",function(point){
	console.log(point);
});
```

##### view.move
Move view

- Parameters  `view:AgGraphView` // Moved view
- Example
```javascript
agGraph.on("view.move",function(view){
	console.log(view.viewBox);
});
```

##### view.zoom
Zoom view

- Parameters  `view:AgGraphView` // Zoomed view
- Example
```javascript
agGraph.on("view.zoom",function(view){
	console.log(view.scale);
});
```

##### view.click
Click view

- Parameters  `view:AgGraphView, position:{x:number,y:number}` // Clicked view, click position
- Example
```javascript
agGraph.on("view.click",function(view, position){
	console.log(view, position);
});
```

##### view.rightClick
Right-click view

- Parameters  `view:AgGraphView, position:{"x":number,"y":number}, offset:{"x":number,"y":number}` // Right-clicked view, click position, offset relative to the browser viewport
- Example
```javascript
agGraph.on("view.rightClick",function(view, position, offset){
	console.log(view, position, offset);
});
```

##### selection.node.add
Add nodes to selection

- Parameters  `addedNodes:AgGraphNode[]` // Added nodes
- Example
```javascript
agGraph.on("selection.node.add",function(addedNodes){
	console.log(addedNodes);
});
```

##### selection.node.remove
Remove nodes from selection

- Parameters  `removedNodes:AgGraphNode[]` // Removed nodes
- Example
```javascript
agGraph.on("selection.node.remove",function(removedNodes){
	console.log(removedNodes);
});
```

##### selection.node.clear
Clear all node selection states

- Parameters none
- Example
```javascript
agGraph.on("selection.node.clear",function(){
	console.log(agGraph.selection.nodes());
});
```

##### selection.line.add
Add lines to selection

- Parameters  `addedLines:AgGraphLine[]` // Added lines
- Example
```javascript
agGraph.on("selection.line.add",function(selectedLines,addedLines){
	console.log(addedLines);
});
```

##### selection.line.remove
Remove lines from selection

- Parameters  `removeLines:AgGraphLine[]` // Removed lines
- Example
```javascript
agGraph.on("selection.line.remove",function(removeLines){
	console.log(removeLines);
});
```

##### selection.line.clear
Clear all line selection states

- Parameters none
- Example
```javascript
agGraph.on("selection.line.clear",function(){
	console.log(agGraph.selection.lines());
});
```

##### selection.point.add
Add points to selection

- Parameters  `addPoints:AgGraphPoint[]` // Added points
- Example
```javascript
agGraph.on("selection.point.add",function(addPoints){
	console.log(addPoints);
});
```

##### selection.point.remove
Remove points from selection

- Parameters  `removedPoints:AgGraphPoint[]` // Removed points
- Example
```javascript
agGraph.on("selection.point.remove",function(removedPoints){
	console.log(removedPoints);
});
```

##### selection.point.clear
Clear all point selection states

- Parameters none
- Example
```javascript
agGraph.on("selection.node.clear",function(){
	console.log(agGraph.selection.points());
});
```
