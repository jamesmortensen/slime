//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	The Original Code is the jsh JavaScript/Java shell.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2014 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

if (!jsh.httpd.Tomcat) {
	jsh.shell.console("Installing Tomcat into " + jsh.script.file + " shell ...");
	jsh.shell.jsh({
		script: jsh.script.file.parent.parent.getFile("jsh/tools/install/tomcat.jsh.js")
	});
	jsh.shell.jsh({
		fork: true,
		script: jsh.script.file,
		arguments: jsh.script.arguments,
		evaluate: function(result) {
			jsh.shell.exit(result.status);
		}
	});
}

var parameters = jsh.script.getopts({
	options: {
		java: jsh.script.getopts.ARRAY(jsh.file.Pathname),
		engine: jsh.script.getopts.ARRAY(String),
		part: String,
		noselfping: false,
		// TODO: review below arguments
		tomcat: jsh.file.Pathname,
		debug: false,
		view: "console",
		"chrome:profile": jsh.file.Pathname,
		port: Number
	},
	unhandled: jsh.script.getopts.UNEXPECTED_OPTION_PARSER.SKIP
});

// TODO: force CoffeeScript for verification?

if (!parameters.options.java.length) {
	parameters.options.java = [jsh.shell.java.home.pathname];
}

if (!parameters.options.engine.length) {
	parameters.options.engine = [""];
}

var Environment = jsh.script.loader.file("jrunscript-environment.js").Environment;

var environment = new Environment({
	src: jsh.script.file.parent.parent,
	noselfping: parameters.options.noselfping,
	tomcat: true,
	executable: true
});

var suite = new jsh.unit.html.Suite();

(function() {
	var rhinoArgs = (jsh.shell.jsh.lib.getFile("js.jar")) ? ["-rhino", jsh.shell.jsh.lib.getFile("js.jar")] : [];

	// TODO: this was intended to be used for each JRE, but was not implemented, so moving it outside the java loop for now
	var part = jsh.unit.Suite.Fork({
		name: "Launcher tests",
		run: jsh.shell.jsh,
		shell: environment.jsh.built.home,
		script: environment.jsh.src.getFile("jsh/launcher/test/suite.jsh.js"),
		arguments: [
			"-scenario",
			"-shell:unbuilt", environment.jsh.unbuilt.src,
			"-shell:built", environment.jsh.built.home,
			"-view", "stdio"
		].concat(rhinoArgs)
	});

	suite.add("launcher/suite", part);
})();

parameters.options.java.forEach(function(jre,index,jres) {
	var JRE = (jres.length > 1) ? String(index) : "jre";

	suite.add("jrunscript/" + JRE + "/engines", new jsh.unit.Suite.Fork({
		run: jsh.shell.jsh,
		shell: environment.jsh.built.home,
		script: jsh.script.file.parent.getFile("jrunscript-engines.jsh.js"),
		arguments: [
			"-view", "stdio"
		]
	}));

	parameters.options.engine.forEach(function(engine) {
		var searchpath = jsh.file.Searchpath([jre.directory.getRelativePath("bin"),jre.directory.getRelativePath("../bin")]);

		var launcher = searchpath.getCommand("jrunscript");
		var launch = (jsh.shell.jsh.home) ? [jsh.shell.jsh.home.getRelativePath("jsh.js")] : [jsh.shell.jsh.src.getRelativePath("rhino/jrunscript/api.js"), "jsh"];
		var engines = jsh.shell.run({
			command: launcher,
			arguments: launch.concat(["-engines"]),
			stdio: {
				output: String
			},
			evaluate: function(result) {
				return eval("(" + result.stdio.output + ")");
			}
		});

		if (engine && engines.indexOf(engine) == -1) {
			jsh.shell.echo("Skipping engine " + engine + "; not available under " + launcher);
		} else {
			var ENGINE = (engine) ? engine : "engine";
			jsh.shell.echo("Running " + jsh.shell.jsh.home + " with Java " + launcher + " and engine " + engine + " ...");

			var env = jsh.js.Object.set({}, jsh.shell.environment
				, (parameters.options.tomcat) ? { CATALINA_HOME: parameters.options.tomcat.toString() } : {}
				, (engine) ? { JSH_ENGINE: engine.toLowerCase() } : {}
				, (jsh.shell.rhino && jsh.shell.rhino.classpath) ? { JSH_ENGINE_RHINO_CLASSPATH: String(jsh.shell.rhino.classpath) } : ""
			);

			suite.add("jrunscript/" + JRE + "/" + ENGINE, jsh.unit.Suite.Fork({
				name: "Java tests for JRE " + JRE + " and engine " + ENGINE,
				run: jsh.shell.jsh,
				vmarguments: ["-Xms1024m"],
				shell: environment.jsh.src,
				script: jsh.script.file.parent.getFile("jrunscript.jsh.js"),
				arguments: [
					"-shell:built", environment.jsh.built.location,
					"-view", "stdio"
				].concat(
					(parameters.options.noselfping) ? ["-noselfping"] : []
				),
				environment: env
			}));
		}
	});
});

suite.add("jsh/launcher/internal", new jsh.unit.part.Html({
	pathname: environment.jsh.src.getRelativePath("jsh/launcher/internal.api.html"),
	environment: environment
}));

//	Browsers in precedence order: whichever is first in the array will be used if only one is being used
var browsers = jsh.unit.browser.installed;
suite.add("browsers", new function() {
	this.name = "Browser tests";

	this.parts = new function() {
		jsh.unit.browser.installed.forEach(function(browser) {
			this[browser.id] = jsh.unit.Suite.Fork({
				name: browser.name,
				run: jsh.shell.jsh,
				shell: environment.jsh.home,
				script: environment.jsh.src.getFile("loader/browser/test/suite.jsh.js"),
				arguments: [
					"-suite", environment.jsh.src.getFile("loader/browser/suite.js"),
					"-browser", browser.id,
					"-view", "stdio"
				].concat(parameters.arguments),
				// TODO: is setting the working directory necessary?
				directory: environment.jsh.src
			})
		},this);
	}
});
// var browserPart = jsh.unit.Suite.Fork({
// 	name: "Browser suites",
// 	run: jsh.shell.jsh,
// 	shell: environment.jsh.home,
// 	script: environment.jsh.src.getFile("loader/browser/suite.jsh.js"),
// 	arguments: [
// 		"-view", "stdio"
// 	].concat(parameters.arguments),
// 	// TODO: is setting the working directory necessary?
// 	directory: environment.jsh.src
// });
// suite.add("browser", browserPart);

suite.add("tools", {
	initialize: function() {
		environment.jsh.built.requireTomcat();
	},
	parts: {
		browser: {
			parts: new function() {
				this.api = {
					parts: {
						failure: {
							execute: function(scope,verify) {
								jsh.shell.jsh({
									shell: environment.jsh.built.home,
									script: environment.jsh.src.getFile("loader/api/ui/test/browser.jsh.js"),
									evaluate: function(result) {
										verify(result).status.is(0);
									}
								})
							}
						},
						success: {
							execute: function(scope,verify) {
								jsh.shell.jsh({
									shell: environment.jsh.built.home,
									script: environment.jsh.src.getFile("loader/api/ui/test/browser.jsh.js"),
									arguments: ["-success"],
									evaluate: function(result) {
										verify(result).status.is(0);
									}
								})
							}
						}
					}
				}

				this.suite = new jsh.unit.part.Html({
					pathname: jsh.shell.jsh.src.getRelativePath("loader/browser/test/suite.jsh.api.html")
				});
			}
		}
	}
});

jsh.unit.interface.create(suite.build(), new function() {
	if (parameters.options.view == "chrome") {
		this.chrome = {
			profile: parameters.options["chrome:profile"],
			port: parameters.options.port
		};
	} else {
		this.view = parameters.options.view;
	};

	this.path = (parameters.options.part) ? parameters.options.part.split("/") : void(0);
});
