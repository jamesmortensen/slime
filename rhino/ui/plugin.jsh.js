//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 * @param { slime.jrunscript.Packages } Packages
	 * @param { slime.$api.Global } $api
	 * @param { slime.jsh.Global } jsh
	 * @param { slime.jsh.plugin.$slime } $slime
	 * @param { slime.Loader } $loader
	 * @param { slime.jsh.plugin.plugin } plugin
	 */
	function(Packages,$api,jsh,$slime,$loader,plugin) {
		plugin({
			load: function() {
				/** @type { slime.jrunscript.ui.Script } */
				var script = $loader.script("module.js");
				var module = script({
					exit: function(status) {
						Packages.java.lang.System.exit(status);
					},
					javafx: Boolean($slime.classpath.getClass("javafx.embed.swing.JFXPanel"))
				});
				jsh.ui = Object.assign(
					{
						javafx: Object.assign(
							module.javafx || {},
							{
								WebView: void(0)
							}
						)
					},
					{
						askpass: void(0),
						application: void(0),
						Chrome: void(0),
						browser: void(0)
					}
				);
			}
		});

		plugin({
			isReady: function() {
				return Boolean(jsh.ui && jsh.java);
			},
			load: function() {
				/** @type { slime.jsh.ui.askpass.Script } */
				var script = $loader.script("askpass.js");
				jsh.ui.askpass = script({
					api: {
						java: jsh.java
					}
				});
			}
		})

		plugin({
			isReady: function() {
				return Boolean(jsh.io && jsh.java.log && jsh.ui.javafx && jsh.java.Thread && jsh.js.document);
			},
			load: function() {
				$loader.run("webview.js", {
					$loader: Object.assign($loader, {
						resource: function(path) {
							//	TODO	assumes resource exists
							return $loader.get(path);
						}
					}),
					$context: {
						log: jsh.java.log.named("slime.ui.javafx.webview"),
						api: {
							thread: {
								javafx: jsh.ui.javafx.run,
								create: function(f) {
									jsh.java.Thread.start({
										call: f
									});
								}
							},
							document: jsh.js.document
						}
					},
					$set: function(v) {
						jsh.ui.javafx.WebView = v;
					}
				});
			}
		});

		plugin({
			isReady: function() {
				return Boolean(jsh.ui && jsh.ui.javafx && jsh.ui.javafx.WebView && jsh.httpd && jsh.httpd.Tomcat && jsh.java);
			},
			load: function() {
				//	TODO	rename to slime.jsh.ui.internal.application.Exports
				/** @type { slime.jsh.ui.application.internal.Exports } */
				var api = $loader.module("application.js", { jsh: jsh });
				(function(v) {
					jsh.ui.javafx.WebView.application = $api.deprecate(v);
					jsh.ui.browser = $api.deprecate(v);
					jsh.ui.application = v;
				})(api.Application);

				//	TODO	was undocumented and thus apparently unused; not even exported. Moved to rhino/shell, maybe?
				//	jsh.ui.Chrome = api.Chrome;
			}
		})
	}
//@ts-ignore
)(Packages,$api,jsh,$slime,$loader,plugin)
