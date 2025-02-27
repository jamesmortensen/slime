//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 *
	 * @param { slime.jrunscript.Packages } Packages
	 * @param { slime.$api.Global } $api
	 * @param { slime.jrunscript.java.tools.Context } $context
	 * @param { slime.jrunscript.java.tools.Exports } $exports
	 */
	function(Packages,$api,$context,$exports) {
		/** @type { { file: slime.jrunscript.file.Exports, shell: slime.jrunscript.shell.Exports } } */
		var jsh = {
			file: $context.api.file,
			shell: $context.api.shell
		};

		/**
		 *
		 * @returns { { command: (args: string[]) => number } }
		 */
		function getJavaCompiler() {
			if (Packages.javax.tools.ToolProvider.getSystemJavaCompiler()) {
				return new function() {
					this.command = function javac(args) {
						return Packages.javax.tools.ToolProvider.getSystemJavaCompiler().run(
							null, null, null,
							$context.api.java.Array.create({
								type: Packages.java.lang.String,
								array: args.map(function(s) { return new Packages.java.lang.String(s); })
							})
						)
					}
				};
			} else {
				var toolpath = jsh.file.Searchpath([ jsh.shell.java.home.getRelativePath("bin") ]);
				if (toolpath.getCommand("javac")) {
					return new function() {
						this.command = function(args) {
							return jsh.shell.run({
								command: toolpath.getCommand("javac"),
								arguments: args,
								evaluate: function(result) {
									return result.status;
								}
							});
						}
					}
				}
			}
		}

		//	We do not want to pre-load the Java compiler as it is way too slow to do so.
		//	TODO	verify that this setup does not load it
		$exports.__defineGetter__("javac", $api.experimental($context.api.js.constant(function() {
			var javac = getJavaCompiler();

			if (!javac) return function(){}();
			/** @type { slime.jrunscript.java.tools.Exports["javac"] } */
			var rv = function(p) {
				/** @type { string[] } */
				var args = [];
				//	TODO	add documentation and test
				if (p.debug === true) {
					args.push("-g");
				}
				//	TODO	accept destination that is directory object, not just Pathname
				if (p.destination) {
					//	TODO	figure out what to do with recursive
					p.destination.createDirectory({
						ifExists: function(dir) {
							return false;
						},
						recursive: false
					});
					args.push("-d", p.destination.toString());
				}
				if (p.classpath && p.classpath.pathnames.length) {
					args.push("-classpath", p.classpath.toString());
				}
				if (p.sourcepath && p.sourcepath.pathnames.length) {
					args.push("-sourcepath", p.sourcepath.toString());
				}
				if (p.source) {
					args.push("-source", p.source);
				}
				if (p.target) {
					args.push("-target", p.target);
				}
				if (p.arguments) {
					args = args.concat(p.arguments.map(function(file) {
						return file.toString();
					}));
				}
				var status = javac.command(args);
				var evaluate = (p.evaluate) ? p.evaluate : function(result) {
					if (status) {
						if (p && p.on && p.on.exit) {
							p.on.exit({
								status: status,
								arguments: args
							})
						}
						throw new Error("Exit status: " + status);
					} else {
						return {
							status: status,
							arguments: args
						};
					}
				};
				return evaluate({
					status: status,
					arguments: args
				});
			};
			return rv;
		})));

		$exports.Jar = function(o) {
			var _peer = (function(o) {
				if (o.file) {
					return new Packages.java.util.jar.JarFile(
						o.file.pathname.java.adapt()
					);
				}
			})(o);

			this.manifest = (function() {
				var _manifest = _peer.getManifest();
				var _main = _manifest.getMainAttributes();
				var _entries = _main.entrySet().iterator();
				var rv = {
					main: {}
				};
				while(_entries.hasNext()) {
					var _entry = _entries.next();
					rv.main[String(_entry.getKey())] = String(_entry.getValue());
				}
				return rv;
			})();
		};
	}
//@ts-ignore
)(Packages,$api,$context,$exports);
