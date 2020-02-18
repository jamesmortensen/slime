var parameters = jsh.script.getopts({
	options: {
		"node:debug": false
	}
})

if (jsh.shell.tools.node.install) {
	jsh.shell.tools.node.install();
} else {
	//	For now, not updating; current implementation removes node_modules
	//	jsh.shell.tools.node.update();
}

//	TODO	can next two blocks be modularized?

if (!jsh.shell.tools.node.modules.installed.typescript) {
	jsh.shell.console("TypeScript not installed; installing ...");
	jsh.shell.tools.node.modules.install({ name: "typescript" });
}

if (!jsh.shell.tools.node.modules.installed["@microsoft/tsdoc"]) {
	jsh.shell.console("tsdoc not installed; installing ...");
	jsh.shell.tools.node.modules.install({ name: "@microsoft/tsdoc" });
}

jsh.shell.tools.node.run({
	arguments: function(rv) {
		if (parameters.options["node:debug"]) rv.push("--inspect-brk");
		rv.push(jsh.script.file.parent.getRelativePath("tsdoc.node.js"));
	}
});
