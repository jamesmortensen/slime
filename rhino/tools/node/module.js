$exports.Installation = function(o) {
	this.toString = function() {
		return "Node installation at " + o.directory;
	};
	
	var PATH = (function() {
		var elements = jsh.shell.PATH.pathnames.slice();
		elements.push(o.directory.getRelativePath("bin"));
		return jsh.file.Searchpath(elements);		
	})();
	
	this.run = function(p) {
		var command = (p.command) ? p.project.getFile("node_modules/.bin/" + p.command) : o.directory.getFile("bin/node");
		jsh.shell.run({
			command: command,
			arguments: p.arguments,
			directory: p.directory,
			environment: jsh.js.Object.set({}, jsh.shell.environment, p.environment, {
				PATH: PATH.toString()
			}),
			evaluate: p.evaluate
		});
	}
	
	this.npm = function(p) {
		var DEFAULT_PATH = (p.PATH) ? p.PATH : jsh.shell.PATH;
		var elements = DEFAULT_PATH.pathnames.slice();
		elements.unshift(o.directory.getRelativePath("bin"));
		var PATH = jsh.file.Searchpath(elements);
		jsh.shell.run({
			command: o.directory.getFile("bin/npm"),
			arguments: (function(rv) {
				rv.push(p.command);
				rv.push.apply(rv,p.arguments);
				return rv;
			})([]),
			environment: jsh.js.Object.set({}, jsh.shell.environment, p.environment, {
				PATH: PATH.toString()
			}),
			directory: p.project
		});
	}
};