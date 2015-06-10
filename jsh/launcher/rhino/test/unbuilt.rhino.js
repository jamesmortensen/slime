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

//	Script to launch a script in an unbuilt jsh. Should be invoked via the jsh/etc/unbuilt.rhino.js tool; see that tool for
//	details

var $api;

if (typeof(this.slime) == "undefined") {
	if ($api && $api.script) {
		$api.script.resolve("../../../etc/api.jrunscript.js").load();
	} else {
		Packages.java.lang.System.err.println("This script should be invoked from the jsh/etc/unbuilt.rhino.js script; see that"
			+ " script for details."
		);
		Packages.java.lang.System.exit(1);
	}
}

if (!$api) {
	if (this.platform && this.debug && this.console) {
		$api = {
			io: {},
			debug: this.debug,
			console: this.console
		};
		$api.io.tmpdir = function() {
			return platform.io.createTemporaryDirectory();
		};
		$api.jdk = platform.jdk;
		$api.engine = {};
		$api.engine.runCommand = runCommand;
	} else {
		throw new Error("No $api, no platform");
	}
}

$api.debug.on = true;
$api.debug("Source: " + slime.src);

//	Build the launcher classes
var LAUNCHER_CLASSES = $api.io.tmpdir();
//	TODO	duplicated almost exactly in jsh/etc/build.rhino.js
slime.launcher.compile(LAUNCHER_CLASSES);

var RHINO_JAR = (function() {
	//	TODO	brutally plagiarized from jsh/etc/build.rhino.js
	var File = Packages.java.io.File;
	var rhinoContextClass = (function() {
		try {
			return Packages.java.lang.Class.forName("org.mozilla.javascript.Context")
		} catch (e) {
			return null;
		}
	})();
	if (!rhinoContextClass) {
		return null;
	}
	var RHINO_PATH = function() {
		//	This strategy for locating Rhino will cause problems if someone were to somehow run against something other than js.jar,
		//	like an un-jarred version
		var url = Packages.java.lang.Class.forName("org.mozilla.javascript.Context").getProtectionDomain().getCodeSource().getLocation().toString();
		var matcher = /^file\:(.*)/;
		if (matcher.exec(url)[1].substring(2,3) == ":") {
			//	this is a windows path of the form /C:/ ...
			return matcher.exec(url)[1].substring(1);
		} else {
			return matcher.exec(url)[1];
		}
	}();
	$api.debug("RHINO_PATH = " + RHINO_PATH);
	return new File(RHINO_PATH).getCanonicalPath();
})();
//	TODO	duplicates logic in jsh/etc/build.rhino.js, but with very different strategy
//	apparently we do not have to have Rhino in the classpath here because it is in the system classpath
var LOADER_CLASSES = $api.io.tmpdir();
var toCompile = slime.src.getSourceFilesUnder(slime.src.getFile("loader/rhino/java"));
if (RHINO_JAR) toCompile = toCompile.concat(slime.src.getSourceFilesUnder(slime.src.getFile("loader/rhino/rhino")));
toCompile = toCompile.concat(slime.src.getSourceFilesUnder(slime.src.getFile("rhino/system/java")));
toCompile = toCompile.concat(slime.src.getSourceFilesUnder(slime.src.getFile("jsh/loader/java")));
if (RHINO_JAR) toCompile = toCompile.concat(slime.src.getSourceFilesUnder(slime.src.getFile("jsh/loader/rhino")));

$api.jdk.compile([
	"-d", LOADER_CLASSES
].concat(toCompile));

//	TODO	Obviously under Cygwin shell does not include the paths helper

var args = [];
args.push(Packages.java.lang.System.getProperty("java.home") + "/bin/java");
//	TODO	if JSH_SHELL_CONTAINER is jvm, debugger will not be run anywhere
if (this.AGENTLIB_JDWP && env.JSH_SHELL_CONTAINER != "jvm") {
	args.push("-agentlib:jdwp=" + this.AGENTLIB_JDWP);
}
if (env.JSH_SHELL_CONTAINER != "jvm" && env.JSH_JAVA_LOGGING_PROPERTIES) {
	args.push("-Djava.util.logging.config.file=" + env.JSH_JAVA_LOGGING_PROPERTIES)
}
if (env.JSH_SHELL_CONTAINER != "jvm" && env.JSH_JVM_OPTIONS) {
	args.push.apply(args,env.JSH_JVM_OPTIONS.split(" "));
}
var _arguments = (this.$api && $api.script) ? $api.arguments : arguments;
//	Allow sending arguments beginning with dash that will be interpreted as VM switches
while(_arguments.length > 0 && _arguments[0].substring(0,1) == "-") {
	args.push(_arguments.shift());
}
args.push(
	"-classpath", LAUNCHER_CLASSES,
	"inonit.script.jsh.launcher.Main"
);
if ($api.script) {
	args = args.concat(_arguments);
} else {
	for (var i=0; i<_arguments.length; i++) {
		args.push(_arguments[i]);
	}
}
args.push(
	{
		env: new (function() {
			var passthrough = ["JSH_SCRIPT_DEBUGGER","JSH_PLUGINS","JSH_LAUNCHER_DEBUG","JSH_JVM_OPTIONS","JSH_ENGINE","JSH_JAVA_LOGGING_PROPERTIES","JSH_RHINO_OPTIMIZATION","JSH_SHELL_CONTAINER","JSH_HASJAVAC"];
			for (var x in env) {
				if (passthrough.indexOf(x) != -1) {
					this[x] = env[x];
				} else if (/^JSH_/.test(x)) {
				} else {
					this[x] = env[x];
				}
			}
			if (env.JSH_SHELL_CONTAINER != "jvm") delete this.JSH_JVM_OPTIONS;
			if (RHINO_JAR) this.JSH_RHINO_CLASSPATH = RHINO_JAR;
			this.JSH_SLIME_SRC = slime.src.toString();
			this.JSH_RHINO_SCRIPT = slime.src.getPath("jsh/launcher/rhino/jsh.rhino.js");
			this.JSH_SHELL_CLASSPATH = LOADER_CLASSES;
			this.JSH_LIBRARY_SCRIPTS_LOADER = slime.src.getPath("loader");
			this.JSH_LIBRARY_SCRIPTS_RHINO = slime.src.getPath("loader/rhino");
			this.JSH_LIBRARY_SCRIPTS_JSH = slime.src.getPath("jsh/loader");
			this.JSH_LIBRARY_MODULES = slime.src.getPath(".");
		})()
		//	Cannot be enabled at this time; see issue 152
		,input: Packages.java.lang.System["in"]
	}
);

//Packages.java.lang.System.err.println("$api.script: " + this.$api.script);
Packages.java.lang.System.err.println("Running: " + args.join(" "));
Packages.java.lang.System.exit($api.engine.runCommand.apply(null, args));