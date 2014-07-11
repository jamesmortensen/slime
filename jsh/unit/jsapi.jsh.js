//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	The Original Code is the jsh JavaScript/Java shell.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2011-2013 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

var parameters = jsh.script.getopts({
	options: {
		//	See api.html for documentation of these options
		jsapi: jsh.script.file.getRelativePath("../../loader/api"),
		
		module: jsh.script.getopts.ARRAY( String ),
		test: jsh.script.getopts.ARRAY( String ),
		
		notest: false,
		classpath: jsh.script.getopts.ARRAY( jsh.file.Pathname ),
		environment: jsh.script.getopts.ARRAY( String ),
		
		api: String,
		doc: jsh.file.Pathname
	}
});

if (!parameters.options.jsapi.directory) {
	jsh.shell.echo("Not a directory: -jsapi " + parameters.options.jsapi);
	jsh.shell.exit(1);
}

var modules = parameters.options.module.map( function(string) {
	var match = /^(.*)\@(.*)$/.exec(string);
	if (match == null) throw new Error("No match: " + string);
	//	TODO	some redundancy below which made adapting jsapi.js easier for now
	var rv = {
		//	TODO	refactor need for this out by moving calculation of relative path here
		base: jsh.shell.PWD,
		path: match[2],
		location: jsh.shell.PWD.getRelativePath(match[2])
	};
	if (match[1]) rv.namespace = match[1];
	return rv;
} );

parameters.options.classpath.forEach( function(pathname) {
	jsh.script.addClasses(pathname);
} );

var ENVIRONMENT = (function() {
	var rv = {};
	parameters.options.environment.forEach( function(item) {
		if (item.split("=").length == 2) {
			//	Interpret as assignment of string property to environment
			var tokens = item.split("=");
			jsh.shell.echo("Setting environment value " + tokens[0] + " to '" + tokens[1] + "'");
			jsh.js.Object.expando.set(rv,tokens[0],tokens[1]);
		} else if (item.split(":").length > 1) {
			var coloned = item.split(":");
			var pathname = jsh.file.Pathname(coloned.slice(1).join(":"));
			jsh.shell.echo("Loading environment value " + coloned[0] + " from " + pathname);
			jsh.js.Object.expando.set(rv,coloned[0],jsh.loader.module(pathname));
		} else {
			jsh.shell.echo("Setting environment value " + item);
			jsh.js.Object.expando.set(rv,item,{});
		}
	});
	return rv;
})();

var jsapi = jsh.loader.file(jsh.script.file.getRelativePath("jsapi.js"), {
	api: parameters.options.jsapi.directory,
	html: jsh.loader.file( parameters.options.jsapi.directory.getRelativePath("api.html.js"), new function() {
		var seq = 0;

		this.run = function(code,scope) {
			var source = code;
			if (typeof(source) == "string") {
				//	TODO	move this processing inside the jsh loader (or rhino loader?) so that it can be invoked with name/string
				//			properties. This code, after being moved to jsh loader, can then invoke rhino loader with name/_in
				//			created below then we would invoke jsh loader here with code = { name: ..., string: code }
				//	TODO	it seems likely a more useful name could be used here, perhaps using name of file plus jsapi:id path
				source = {
					name: "<eval>:" + String(++seq),
					_in: (function() {
						var out = new Packages.java.io.ByteArrayOutputStream();
						var writer = new Packages.java.io.OutputStreamWriter(out);
						writer.write(String(code));
						writer.flush();
						writer.close();
						return new Packages.java.io.ByteArrayInputStream(out.toByteArray());
					})()
				}
			}
			jsh.loader.run(source,scope);
		}
		
		if (jsh.$jsapi.$rhino.jsapi && jsh.$jsapi.$rhino.jsapi.script) {
			this.script = function(name,code,scope) {
				return jsh.$jsapi.$rhino.jsapi.script(name, String(code), scope);
			}
		}
	} ),
	jsdom: jsh.script.loader.file("jsdom.js"),
	jsapi: {
		getFile: function(path) {
			return jsh.script.file.getRelativePath(path).file;
		}
	},
	Scenario: jsh.loader.file( parameters.options.jsapi.directory.getRelativePath("unit.before.js") ).Scenario,
	console: jsh.loader.file( jsh.script.file.getRelativePath("jsunit.after.js"), {
		console: {
			println: function(s) {
				if (arguments.length == 0) {
					Packages.java.lang.System.out.println();
				} else {
					Packages.java.lang.System.out.println(s);
				}
			},
			print: function(s) {
				Packages.java.lang.System.out.print(s);
				Packages.java.lang.System.out.flush();
			}
		},
		verbose: true
	} ).console,
	ENVIRONMENT: ENVIRONMENT
});

if (!parameters.options.notest) {
	if (parameters.options.test.length) {
		parameters.options.test.forEach( function(test) {
			var getModule = function(path) {
				return {
					location: jsh.file.Pathname(path)
				}
			};

			var tokens = test.split(":");
			if (tokens.length == 1) {
				jsapi.tests.add(getModule(test));
			} else {
				jsapi.tests.add(getModule(tokens[0]),tokens.slice(1).join("."));
			}
		});
	} else {
		modules.forEach( function(module) {
			jsapi.tests.add(module);
		});
	}
	var UNIT_TESTS_COMPLETED = function(success) {
		if (!success) {
			jsh.shell.echo("Tests failed; exiting with status 1.", { stream: jsh.shell.stdio.error });
			jsh.shell.exit(1);
		}
	}
	jsapi.tests.run(UNIT_TESTS_COMPLETED);
}

if (parameters.options.doc) {
	if (parameters.options.api) {
		var list = [];
		modules.forEach( function(item) {
			list.push({ ns: item.namespace, base: item.base, path: item.path, location: item.location });
		} );
		jsapi.documentation({
			index: jsh.shell.PWD.getFile(parameters.options.api),
			//	TODO	hot platform-independent
			prefix: new Array(parameters.options.api.split("/").length).join("../"),
			modules: list,
			to: parameters.options.doc
		});		
	} else {
		var list = [];
		modules.forEach( function(item) {
			list.push({ ns: item.namespace, base: item.base, path: item.path, location: item.location });
		} );
		jsapi.doc({
			modules: list,
			to: parameters.options.doc
		});
	}
}