//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	The Original Code is the jsh JavaScript/Java shell.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2012-2013 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

var parameters = jsh.script.getopts({
	options: {
		scenario: false,
		view: "console"
	}
});

//	TODO	currently this program can only be run in a built shell, because the packaging tool only works in a built shell

if (parameters.options.scenario) {
	jsh.loader.plugins(jsh.script.file.parent.parent.parent.parent.getRelativePath("loader/api"));
	jsh.loader.plugins(jsh.script.file.parent.parent.parent.parent.getRelativePath("jsh/unit"));
	var views = {
		child: function() {
			return new jsh.unit.view.Events({ writer: jsh.shell.stdio.output })
		},
		ui: function() {
			return new jsh.unit.view.WebView()
		},
		console: function() {
			return new jsh.unit.view.Console({ writer: jsh.shell.stdio.output })
		}
	};
	var scenario = new jsh.unit.Scenario({
		composite: true,
		name: jsh.script.file.pathname.basename,
		view: views[parameters.options.view]()
	});
	var packaged_JSH_SHELL_CLASSPATH = jsh.shell.TMPDIR.createTemporary({ directory: true }).getRelativePath(jsh.script.file.pathname.basename + ".jar");
	var engine = (jsh.shell.rhino) ? [] : ["-norhino"];
	jsh.shell.jsh({
		fork: true,
		script: jsh.shell.jsh.home.getFile("tools/package.jsh.js"),
		arguments: [
			"-script", jsh.script.file.pathname,
			"-to", packaged_JSH_SHELL_CLASSPATH
		].concat(engine)
	});
	var separator = String(Packages.java.lang.System.getProperty("line.separator"));
	scenario.add({ scenario: new function() {
		this.name = "unconfigured";

		this.execute = function(scope) {
			var unconfigured = jsh.shell.java({
				jar: packaged_JSH_SHELL_CLASSPATH.file,
				stdio: {
					output: String
				},
				evaluate: function(result) {
					return result.stdio.output.split(separator)[0];
				}
			});
			var verify = new jsh.unit.Verify(scope);
			verify(unconfigured).is(String(packaged_JSH_SHELL_CLASSPATH.java.adapt().toURI().toString()));
		};
	}});
//	testCommandOutput(packaged_JSH_SHELL_CLASSPATH, function(options) {
//		var outputUri = options.output.split(String(Packages.java.lang.System.getProperty("line.separator")))[0];
//		var _outputFile = new Packages.java.io.File(new Packages.java.net.URI(outputUri));
//		if (String(_outputFile.getCanonicalPath()) == String(packaged_JSH_SHELL_CLASSPATH.getCanonicalPath())) {
//			Packages.java.lang.System.err.println("Same URI: " + outputUri + " and " + packaged_JSH_SHELL_CLASSPATH.toURI());
//		} else {
//			Packages.java.lang.System.err.println("Output wrong; dumping stderr:");
//			Packages.java.lang.System.err.println(options.err);
//			Packages.java.lang.System.err.println("Output file: " + _outputFile + " canonical: " + _outputFile.getCanonicalPath());
//			Packages.java.lang.System.err.println("Correct file: " + packaged_JSH_SHELL_CLASSPATH);
//			throw new Error("Output wrong; different URI: it is [" + options.output + "] when expected was [" + packaged_JSH_SHELL_CLASSPATH.toURI() + "]");
//		}
//	//	checkOutput(options,[
//	//		String(packaged_JSH_SHELL_CLASSPATH.toURI()),
//	//		""
//	//	]);
//	});

	//	Test was disabled as failing, attempting to re-enable to fix issue 79
	scenario.add({
		scenario: new function() {
			this.name = "with JSH_SHELL_CLASSPATH";

			this.execute = function(scope) {
				var properties = {};
				if (jsh.shell.rhino && jsh.shell.rhino.classpath) {
					properties["jsh.engine.rhino.classpath"] = String(jsh.shell.rhino.classpath);
				}
				var output = jsh.shell.java({
					properties: properties,
					jar: packaged_JSH_SHELL_CLASSPATH.file,
					stdio: {
						output: String
					},
					environment: jsh.js.Object.set({}, jsh.shell.environment, {
						JSH_SHELL_CLASSPATH: jsh.shell.jsh.home.getRelativePath("lib/jsh.jar").toString()
//						,JSH_RHINO_CLASSPATH: String(jsh.shell.rhino.classpath)
						,JSH_LAUNCHER_DEBUG: "true"
					}),
					evaluate: function(result) {
						return result.stdio.output.split(separator);
					}
				});
				var verify = new jsh.unit.Verify(scope);
				verify(output)[0].is(String(jsh.shell.jsh.home.getRelativePath("lib/jsh.jar").java.adapt().toURI().toString()));
				jsh.shell.echo("Line 1: " + output[1]);
			}
		}
	});
	scenario.run();
} else {
	jsh.shell.echo(
		String(
			Packages.java.lang.Class.forName("inonit.script.jsh.Shell").getProtectionDomain().getCodeSource().getLocation().toString()
		)
	);
	jsh.shell.echo("Rhino context class: " + Packages.org.mozilla.javascript.Context);
}