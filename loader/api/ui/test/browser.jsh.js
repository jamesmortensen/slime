//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

(
	function() {
		var parameters = jsh.script.getopts({
			options: {
				interactive: false,
				"chrome:data": jsh.file.Pathname,
				"debug:devtools": false,
				port: Number,
				success: false
			}
		});

		var SLIME = new jsh.file.Loader({ directory: jsh.script.file.parent.parent.parent.parent.parent });

		var lock = new jsh.java.Thread.Monitor();

		var result = {
			success: void(0),
			received: function(v) {
				jsh.shell.console("Received result from client: " + v);
				var self = this;
				//	TODO	lock.Waiter may not have intelligent 'this' handling
				lock.Waiter({
					until: function() { return true; },
					then: function() {
						self.success = v;
					}
				})();
			}
		};

		var tomcat = new jsh.httpd.Tomcat({ port: parameters.options.port });
		tomcat.map({
			path: "/",
			servlets: {
				"/*": {
					load: function(scope) {
						scope.$exports.handle = function(request) {
							if (request.path == "loader/api/ui/test/result") {
								var json = request.body.stream.character().asString();
								jsh.shell.console("Got result JSON=" + json);
								result.received(JSON.parse(json));
								return { status: { code: 200 } };
							}
							if (SLIME.get(request.path)) {
								return {
									status: { code: 200 },
									body: SLIME.get(request.path)
								}
							} else {
								return {
									status: { code: 404 }
								}
							}
						}
					}
				}
			}
		});
		tomcat.start();

		jsh.shell.console("Started Tomcat.");

		var chrome = new jsh.shell.browser.chrome.Instance({
			location: parameters.options["chrome:data"],
			proxy: new jsh.shell.browser.ProxyConfiguration({
				port: tomcat.port
			}),
			devtools: parameters.options["debug:devtools"]
		});

		if (parameters.options.interactive) {
			chrome.run({
				uri: "http://api-ui-test/loader/api/ui/test/browser.html" + ((parameters.options.success) ? "?success" : "")
			});
		} else {
			var opened;

			var on = {
				start: function(p) {
					new lock.Waiter({
						until: function() {
							return true;
						},
						then: function() {
							opened = new function() {
								this.close = function() {
									jsh.shell.echo("Killing browser process " + p + " ...");
									p.kill();
									jsh.shell.echo("Killed.");
								}
							}
						}
					})();
				}
			};

			chrome.launch({
				uri: "http://api-ui-test/loader/api/ui/test/browser.html?unit.run" + ((parameters.options.success) ? "&success" : ""),
				on: on
			});

			jsh.shell.console("Chrome launched.");

			new lock.Waiter({
				until: function() { return Boolean(opened); },
				then: function() {
					jsh.shell.console("opened = " + opened);
				}
			})();

			new lock.Waiter({
				until: function() { return typeof(result.success) != "undefined" },
				then: function() {
				}
			})();

			jsh.shell.console("result.success = " + result.success);
			opened.close();
			if (result.success === parameters.options.success) {
				jsh.shell.console("Success: " + result.success);
				jsh.shell.exit(0);
			} else {
				jsh.shell.console("Failure: result=" + result.success + ", not " + parameters.options.success);
				jsh.shell.exit(1);
			}
		}
	}
)();
