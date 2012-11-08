var jsdom = jsh.script.loader.file("jsdom.js");

var BASE = jsh.script.getRelativePath("../..").directory;

var pages = {};
pages.jsh = {};
XML.ignoreWhitespace = false;
XML.prettyPrinting = false;
pages.jsh.unit = BASE.getFile("jsh/unit/api.html").read(XML);
var document = jsdom.Document.E4X(pages.jsh.unit);
var xhtml = "http://www.w3.org/1999/xhtml";
var root = document.get(function(node) {
	return node.name && node.name.local == "html";
})[0];
var head = root.get(function(node) {
	return node.name && node.name.local == "head";	
})[0];
debugger;
var css = head.get(function(node) {
	return node.name && node.name.local == "link" && /api\.css$/.test(node.getAttribute("href"));
})[0];
if (css) {
	head.remove(css);
}
var top = "../../loader/api/";
head.append(new jsdom.Element({
	name: {
		namespace: xhtml,
		local: "link"
	},
	attributes: [
		{ local: "rel", value: "stylesheet" },
		{ local: "type", value: "text/css" },
		{ local: "href", value: top + "api.css" }
	]
}));
debugger;

var verify = function(b) {
	if (!b) {
		throw new Error("Assertion failed.");
	}
};

var link = head.get(function(node) {
	return node.name && node.name.local == "link";
})[0];
verify(typeof(link) != "undefined");
verify(link.name.local == "link");
verify(link.getAttribute("rel") == "stylesheet");
