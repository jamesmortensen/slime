//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 * @param { slime.jsh.plugin.$slime } $slime
	 * @param { slime.jsh.Global } jsh
	 * @param { slime.jsh.plugin.plugin } plugin
	 * @param { slime.Loader } $loader
	 */
	function($slime, jsh, plugin, $loader) {
		plugin({
			isReady: function() {
				return Boolean(jsh.loader && jsh.loader.addFinalizer && jsh.js && jsh.java && jsh.io);
			},
			load: function() {
				/** @type { slime.jrunscript.file.Context } */
				var context = {
					$pwd: $slime.getSystemProperty("user.dir"),
					addFinalizer: jsh.loader.addFinalizer,
					api: {
						js: jsh.js,
						java: jsh.java,
						io: jsh.io
					},
					pathext: void(0),
					cygwin: void(0)
				};

				//	Windows
				var environment = jsh.java.Environment($slime.getEnvironment());
				if (environment.PATHEXT) {
					context.pathext = environment.PATHEXT.split(";");
				}

				//	Cygwin
				$loader.run("plugin.jsh.cygwin.js", { $slime: $slime, context: context });

				/** @type { slime.jrunscript.file.Script } */
				var script = $loader.script("module.js");

				jsh.file = script(context);
			}
		})
	}
//@ts-ignore
)($slime, jsh, plugin, $loader)
