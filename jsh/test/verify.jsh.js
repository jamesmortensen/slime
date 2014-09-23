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

var parameters = jsh.script.getopts({
	options: {
		java: jsh.script.getopts.ARRAY(jsh.file.Pathname),
		engine: jsh.script.getopts.ARRAY(String),
		slime: jsh.script.file.parent.parent.parent.pathname,
		tomcat: jsh.file.Pathname,
		browser: false,
		debug: false
	},
	unhandled: jsh.script.getopts.UNEXPECTED_OPTION_PARSER.SKIP
});

if (!parameters.options.java.length) {
	parameters.options.java = [jsh.shell.java.home.pathname];
}

if (!parameters.options.engine.length) {
	parameters.options.engine = [""];
}

if (!parameters.options.slime) {
	jsh.shell.echo("Required: -slime");
	jsh.shell.exit(1);
}

if (!jsh.java.Thread && (parameters.options.chrome || parameters.options.firefox)) {
	jsh.shell.echo("Cannot run browser verification in shell without multithreading (use Rhino).");
	jsh.shell.exit(1);
}

parameters.options.java.forEach(function(jre) {
	parameters.options.engine.forEach(function(engine) {
		var searchpath = jsh.file.Searchpath([jre.directory.getRelativePath("bin")]);

		var launcher = searchpath.getCommand("java");

		var engines = jsh.shell.run({
			command: launcher,
			arguments: [
				"-jar", jsh.shell.jsh.home.getRelativePath("jsh.jar"),
				"-engines"
			],
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
			jsh.shell.echo("Running with Java " + launcher + " and engine " + engine + " ...");

			jsh.shell.run({
				command: launcher,
				arguments: [
					"-jar", jsh.shell.jsh.home.getRelativePath("jsh.jar"),
					parameters.options.slime.directory.getRelativePath("jsh/test/suite.jsh.js").toString()
				],
				directory: parameters.options.slime.directory,
				environment: jsh.js.Object.set({}, jsh.shell.environment
					, (parameters.options.tomcat) ? { CATALINA_HOME: parameters.options.tomcat.toString() } : {}
					, (engine) ? { JSH_ENGINE: engine.toLowerCase() } : {}
				)
			});
		}
	});
});

if (parameters.options.browser) {
	jsh.shell.run({
		command: jsh.file.Searchpath([parameters.options.java[0].directory.getRelativePath("bin")]).getCommand("java"),
		arguments: [
			"-jar", jsh.shell.jsh.home.getRelativePath("jsh.jar"),
			parameters.options.slime.directory.getRelativePath("jsh/test/browser.jsh.js").toString()
		].concat(parameters.arguments),
		directory: parameters.options.slime.directory,
		environment: jsh.js.Object.set({}, jsh.shell.environment
			, (parameters.options.tomcat) ? { CATALINA_HOME: parameters.options.tomcat.toString() } : {}
		)
	});
}

jsh.shell.echo();
jsh.shell.echo("Finished at " + new Date());