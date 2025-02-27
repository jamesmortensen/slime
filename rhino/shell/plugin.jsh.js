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
	 * @param { slime.jsh.Global } jsh
	 * @param { slime.jsh.plugin.$slime } $slime
	 * @param { slime.Loader } $loader
	 * @param { slime.jsh.plugin.plugin } plugin
	 */
	function(Packages,$api,jsh,$slime,$loader,plugin) {
		plugin({
			isReady: function() {
				return Boolean(jsh.js && jsh.document && jsh.js.document && jsh.web && jsh.java && jsh.io && jsh.file);
			},
			load: function() {
				/**
				 *
				 * @param { slime.jrunscript.runtime.io.OutputStream } outputStream
				 * @returns { slime.jrunscript.shell.context.OutputStream }
				 */
				var toShellContextOutputStream = function(outputStream) {
					return {
						character: function() {
							return outputStream.character();
						},
						java: {
							adapt: function() {
								return outputStream.java.adapt();
							}
						},
						split: function(other) {
							return outputStream.split(other);
						}
					}
				};

				var stdio = {
					input: jsh.io.Streams.java.adapt($slime.getStdio().getStandardInput()),
					output: toShellContextOutputStream(jsh.io.Streams.java.adapt($slime.getStdio().getStandardOutput())),
					error: toShellContextOutputStream(jsh.io.Streams.java.adapt($slime.getStdio().getStandardError()))
				}

				var code = {
					/** @type { slime.jrunscript.shell.Script } */
					module: $loader.script("module.js")
				}

				var mContext = {
					api: {
						js: jsh.js,
						java: jsh.java,
						io: jsh.io,
						file: jsh.file,
						document: jsh.js.document,
						httpd: void(0),
						xml: {
							parseFile: function(file) {
								return new jsh.document.Document({ string: file.read(String) });
							}
						},
						ui: void(0)
					},
					_properties: $slime.getSystemProperties(),
					_environment: $slime.getEnvironment(),
					kotlin: ($slime.getLibraryFile("kotlin")) ? {
						compiler: jsh.file.Pathname( String($slime.getLibraryFile("kotlin/bin/kotlinc").getAbsolutePath()) ).file
					} : null,
					stdio: stdio
				};

				var module = code.module(mContext);

				if (!module.properties) throw new TypeError();

				/**
				 * @type { slime.jsh.shell.internal.Context }
				 */
				var context = {
					api: {
						js: jsh.js
						,java: jsh.java
						,io: jsh.io
						,file: jsh.file
						,script: void(0)
					},
					stdio: stdio,
					_getSystemProperties: function() {
						return $slime.getSystemProperties();
					},
					exit: function(code) {
						$slime.exit(code);
					},
					jsh: function(configuration,script,args) {
						var _invocation = $slime.getInterface().invocation(
							script.pathname.java.adapt(),
							jsh.java.toJavaArray(args,Packages.java.lang.String,function(s) {
								return new Packages.java.lang.String(s);
							})
						);
						return $slime.jsh(configuration,_invocation)
					}
				};

				//	TODO	necessary because dependencies are entangled here
				Object.defineProperty(context.api, "script", {
					get: function() {
						return jsh.script;
					}
				});

				$loader.run(
					"jsh.js",
					{
						$context: context,
						$exports: module
					}
				);

				/** @type { slime.js.Cast<slime.jsh.shell.Exports & { getopts: any }> } */
				var toJsh = $api.fp.cast;

				jsh.shell = toJsh(module);
			}
		});

		plugin({
			isReady: function() {
				return Boolean(jsh.shell && jsh.ui && jsh.shell.os);
			},
			load: function() {
				if (jsh.shell.os.sudo) jsh.shell.os.sudo.gui = function(p) {
					if (!p) p = { prompt: void(0) };
					if (!p.prompt) p.prompt = "Account password for " + jsh.shell.environment.USER + ":";
					return function() {
						return jsh.ui.askpass.gui({ prompt: p.prompt });
					};
				}
				if (jsh.shell.os.inject) jsh.shell.os.inject({ ui: jsh.ui });
			}
		});

		plugin({
			isReady: function() {
				return Boolean(jsh.shell && jsh.httpd);
			},
			load: function() {
				jsh.shell.browser.inject({ httpd: jsh.httpd });
			}
		});

		plugin({
			isReady: function() {
				return Boolean(jsh.js && jsh.shell && jsh.shell.jsh && jsh.script)
			},
			load: function() {
				jsh.shell.jsh.debug = function(p) {
					var isRhino = (function() {
						//	TODO	probably a way to get this from rhino/jrunscript/api.js
						if (!jsh.java.getClass("org.mozilla.javascript.Context")) return false;
						if (!Packages.org.mozilla.javascript.Context.getCurrentContext()) return false;
						return true;
					})();

					//	TODO	probably want to build these arguments better so that other jsh.shell.jsh arguments like stdio and
					//			environment can also be used and still work

					var evaluate = function(result) {
						jsh.shell.exit(result.status);
					};

					if (isRhino) {
						jsh.shell.jsh({
							script: jsh.script.file,
							arguments: jsh.script.arguments,
							environment: jsh.js.Object.set({}, jsh.shell.environment, {
								JSH_DEBUG_SCRIPT: "rhino"
							}),
							evaluate: evaluate
						})
					} else {
						jsh.shell.jsh({
							script: jsh.shell.jsh.src.getFile("jsh/tools/ncdbg.jsh.js"),
							arguments: [jsh.script.file.toString()].concat(jsh.script.arguments),
							evaluate: evaluate
						});
					}
				}
			}
		});
	}
//@ts-ignore
)(Packages,$api,jsh,$slime,$loader,plugin);
