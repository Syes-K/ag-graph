const fs = require('fs');
var MarkdownIt = require('markdown-it');

// exports = function () {
	var s = fs.readFileSync("changeLog.md", "utf-8");
	var md = new MarkdownIt();
	var result = md.render(s);
	console.log(result);
// };
