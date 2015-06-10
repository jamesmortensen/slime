//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//
//	The Original Code is the jsh JavaScript/Java shell.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2015 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

$api.debug = function(message) {
	if (arguments.callee.on) Packages.java.lang.System.err.println(message);
};

$api.console = function(message) {
	Packages.java.lang.System.err.println(message);
}

var slime = new function() {
	this.src = new function() {
		this.toString = function() {
			return $api.script.resolve("../../../..").toString();
		};

		this.getPath = function(path) {
			return $api.script.resolve("../../../../" + path).toString();
		}

		this.getFile = function(path) {
			return $api.script.resolve("../../../../" + path).file;
		}

		this.getSourceFilesUnder = function getSourceFilesUnder(dir,rv) {
			if (typeof(rv) == "undefined") {
				rv = [];
			}
			var files = dir.listFiles();
			if (!files) return [];
			for (var i=0; i<files.length; i++) {
				if (files[i].isDirectory() && String(files[i].getName()) != ".hg") {
					getSourceFilesUnder(files[i],rv);
				} else {
					if (files[i].getName().endsWith(".java")) {
						rv.push(files[i]);
					}
				}
			}
			return rv;
		};
	};

	var platform = new function() {
		this.jdk = new function() {
			var tried = false;
			var compiler;

			this.compile = (function(array) {
				if (!tried) {
					Packages.java.lang.System.err.println("Loading Java compiler ...");
					compiler = Packages.javax.tools.ToolProvider.getSystemJavaCompiler();
					tried = true;
				}
				if (compiler) {
					return function(args) {
						$api.debug("Compiling with: " + args);
						var jarray = Packages.java.lang.reflect.Array.newInstance($api.java.getClass("java.lang.String"),args.length);
						for (var i=0; i<jarray.length; i++) {
							jarray[i] = new Packages.java.lang.String(args[i]);
						}
						var status = compiler.run(
							Packages.java.lang.System["in"],
							Packages.java.lang.System.out,
							Packages.java.lang.System.err,
							jarray
						);
						if (status) {
							throw new Error("Compiler exited with status " + status + " with inputs " + args.join(","));
						}
					}
				}
			})();
		}
	};

	$api.jdk = platform.jdk;

	$api.platform = platform;

	this.launcher = new function() {
		this.compile = function(to) {
			platform.jdk.compile([
				"-d", LAUNCHER_CLASSES,
				"-sourcepath", slime.src.getPath("rhino/system/java") + Packages.java.io.File.pathSeparator + slime.src.getPath("jsh/launcher/rhino/java"),
				slime.src.getPath("jsh/launcher/rhino/java/inonit/script/jsh/launcher/Main.java")
			]);
		}
	}
};