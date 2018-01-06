const fs = require('fs');
var agGraphMin = fs.readFileSync("dist/ag-graph.min.js", "utf-8");
fs.writeFileSync("website/assets/pluginunit/ag-graph/ag-graph.min.js", agGraphMin, { encoding: "utf-8" });
