const fs = require('fs');
var MarkdownIt = require('markdown-it');

// exports = function () {
var readme_md = fs.readFileSync("readme.md", "utf-8");
var api_html = fs.readFileSync("website/api.html", "utf-8");
var md = new MarkdownIt();
var result = md.render(readme_md);

var startIdx = api_html.indexOf("<!--readme.md-start-->");
var endIdx = api_html.indexOf("<!--readme.md-end-->");
var startStr = api_html.substr(0,startIdx)+"<!--readme.md-start-->";
var endStr = api_html.substr(endIdx);
api_html = startStr+ result +endStr;

fs.writeFileSync("website/api.html", api_html, { encoding: "utf-8" });
// };
