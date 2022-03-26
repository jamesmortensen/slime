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
	 */
	function(Packages, $api, jsh) {
		jsh.shell.tools.tomcat.require();

		var parameters = jsh.script.getopts({
			options: {
				//	Runs a series of definitions
				suite: jsh.file.Pathname,

				//	Runs a single definition; optionally just a single part of that definition
				definition: jsh.file.Pathname,
				part: String,

				//	Necessary if the suite references pages outside the hierarchy defined by suite / launching page / SLIME installation
				base: jsh.file.Pathname,

				parameter: jsh.script.getopts.ARRAY(String),

				browser: String,
				interactive: false,

				"chrome:instance": jsh.file.Pathname,
				"chrome:debug:vscode": false,
				"chrome:debug:port": Number,

				view: "console"
			}
		});

		if (!parameters.options.browser) {
			parameters.options.browser = [
				jsh.unit.browser.installed[0].id
			];
		}

		if (parameters.options.part) {
			// TODO: Currently with the way the unit testing for paths is duct-taped together, non-interactively running part of a browser
			// suite does not work -- the browser does not exit -- for unknown reasons. Not really an important use case.
			parameters.options.interactive = true;
		}

		if (parameters.options.view == "chrome") {
			// TODO: For some reason "chrome" does not work; not that it would be useful, since tests are already being run in a browser
			jsh.shell.console("Unsupported: -view chrome [use 'console' or 'stdio']");
			jsh.shell.exit(1);
		}

		//	We need to serve from the common ancestor of:
		//	* the suite
		//	* the launching page
		//	* the SLIME installation that will load the page and run it

		if (parameters.options.definition && !parameters.options.suite) {
			parameters.options.suite = jsh.script.file.parent.getRelativePath("definition.suite.js");
		}

		var toSuite = jsh.file.navigate({
			from: jsh.shell.jsh.src.getFile("loader/browser/test/suite.js"),
			to: parameters.options.suite.file,
			base: (parameters.options.base) ? parameters.options.base.directory : void(0)
		});

		var testBase = toSuite.base;

		if (parameters.options.definition) {
			var toDefinition = jsh.file.navigate({
				from: testBase,
				to: parameters.options.definition.file
			});
			testBase = toDefinition.base;
		}

		var toShell = jsh.file.navigate({
			from: testBase,
			to: jsh.shell.jsh.src
		});

		var toResult = jsh.file.navigate({
			from: toShell.base,
			to: jsh.shell.jsh.src.getFile("loader/browser/test/suite.js"),
		});

		var toSuiteHtml = jsh.file.navigate({
			from: toResult.base,
			to: jsh.shell.jsh.src.getRelativePath("loader/browser/test/suite.html")
		});

		var url = toResult.relative.replace(/suite\.js/g, "result");

		// TODO: automated test cases for this script. Manual test cases for now:
		// rhino/jrunscript/api.js
		// loader/browser/test/test/sample.suite.js
		// $HOME/.bash_profile

		var $loader = new jsh.file.Loader({ directory: jsh.script.file.parent });

		var tomcat = new jsh.httpd.Tomcat();

		/**
		 *
		 * @param { slime.runtime.browser.test.internal.suite.Browser } browser
		 * @returns { slime.runtime.browser.test.internal.suite.Host }
		 */
		var run = function(browser) {
			//	TODO	first two lines are now copied to loader/browser/test/server.js
			tomcat.map({
				// TODO: make the below the default for goodness' sake
				path: "",
				resources: new jsh.file.Loader({
					directory: toShell.base
				}),
				servlets: {
					"/*": {
						load: function(scope) {
							//	This disables reloading for unit tests; should find a better way to do this rather than just ripping out the method
							delete scope.httpd.$reload;

							jsh.shell.console("Serving " + toShell.base);

							scope.$exports.handle = scope.httpd.Handler.series(
								function(request) {
									jsh.shell.console("REQUEST: " + request.method + " " + request.path);
									return void(0);
								},
								(
									(jsh.typescript)
										? (function() {
											var filesystemLoader = new jsh.file.Loader({
												directory: toResult.base
											});

											return function handleTypescript(request) {
												if (/\.ts$/.test(request.path)) {
													var resource = filesystemLoader.get(request.path);
													if (resource) {
														var compiled = jsh.typescript.compile(resource.read(String));
														return {
															status: { code: 200 },
															body: {
																type: "application/javascript",
																string: compiled
															}
														}
													}
												}
											}
										})()
										: $api.Function.returning(void(0))
								),
								(
									(!parameters.options.interactive)
										? (function createResultHandler() {
											/** @type { slime.loader.Script<slime.runtime.browser.test.results.Context,slime.runtime.browser.test.results.Factory> } */
											var resultServletFactory = $loader.factory("handler-results.js");

											var resultServletFile = resultServletFactory({
												library: {
													java: jsh.java,
													shell: jsh.shell
												}
											});

											return resultServletFile({
												url: url
											})
										})()
										: $api.Function.returning(void(0))
								),
								scope.httpd.Handler.Loader({
									loader: new jsh.file.Loader({
										directory: toResult.base
									})
								})
							)
						}
					}
				}
			});
			tomcat.start();
			jsh.shell.console("port = " + tomcat.port);
			jsh.shell.console("path = " + url);
			var command = (parameters.options.interactive) ? "" : "&command=run";
			jsh.java.Thread.start(function() {
				// TODO: query string by string concatenation is sloppy
				var uri = "http://127.0.0.1:" + tomcat.port + "/" + toSuiteHtml.relative + "?suite=" + toSuite.relative + command;
				if (parameters.options.definition) {
					var toDefinition = jsh.file.navigate({
						from: parameters.options.suite.file,
						to: parameters.options.definition.file
					});
					uri += "&definition=" + toDefinition.relative
				}
				if (parameters.options.part) {
					uri += "&part=" + parameters.options.part;
				}
				parameters.options.parameter.forEach(function(argument) {
					//	TODO	url-encode the below
					uri += "&" + argument;
				});
				try {
					browser.start({
						uri: uri
					});
				} catch (e) {
					jsh.shell.console(e);
					if (e.javaException) e.javaException.printStackTrace();
				}
			});
			return {
				port: tomcat.port
			};
		};

		var Browser = function(o) {
			var process;

			if (!o.open) {
				throw new Error("keys = " + Object.keys(o));
			}
			var open = o.open({
				start: function(p) {
					process = p;
				}
			});

			this.name = void(0);

			this.start = function(p) {
				open(p.uri);
			};

			this.kill = function() {
				jsh.shell.console("Killing " + o);
				process.kill();
			}
		};

		var Chrome = function(o) {
			var instance = new jsh.shell.browser.chrome.Instance({
				location: o.location
			});

			var kill;

			this.name = "Google Chrome";

			this.start = function(p) {
				instance.run({
					uri: p.uri,
					arguments: (function() {
						var rv = [];
						if (o.remoteDebugPort) rv.push("--remote-debugging-port=" + o.remoteDebugPort);
						return rv;
					})(),
					on: {
						start: function(e) {
							kill = function() {
								e.kill();
							}
						}
					}
				});
			};

			this.kill = function() {
				kill();
			}
		};

		/**
		 *
		 * @returns { slime.runtime.browser.test.internal.suite.Browser }
		 */
		var SeleniumChrome = function() {
			jsh.shell.tools.selenium.load();
			var _driver;
			return {
				name: "Chrome (Selenium)",
				start: function(p) {
					var _options = new Packages.org.openqa.selenium.chrome.ChromeOptions();
					_driver = new Packages.org.openqa.selenium.chrome.ChromeDriver(_options);
					_driver.get(p.uri);
				},
				kill: function() {
					_driver.quit();
				}
			}
		}

		var DockerSeleniumChrome = function() {
			jsh.shell.tools.selenium.load();
			var _driver;
			return {
				name: "Remote (Selenium)",
				start: function(p) {
					//	TODO	extend Properties to properly include superclass methods?
					//	TODO	remove need for the property manipulation by patching Selenium or transferring these global
					//			properties to be in the inonit.script.jsh.Main Java class itself; would they be available where
					//			needed?
					/** @type { any } */
					var _properties = Packages.java.lang.System.getProperties();
					var saved = {};
					var streams = ["stdin", "stdout", "stderr"];
					streams.forEach(function(name) {
						saved[name] = _properties.get("inonit.script.jsh.Main." + name);
						_properties.remove("inonit.script.jsh.Main." + name);
					});
					var _options = new Packages.org.openqa.selenium.chrome.ChromeOptions();
					_driver = new Packages.org.openqa.selenium.remote.RemoteWebDriver(new Packages.java.net.URL("http://localhost:4444/wd/hub"), _options);
					streams.forEach(function(name) {
						_properties.put("inonit.script.jsh.Main." + name, saved[name]);
					})
					_driver.get(p.uri.replace(/127\.0\.0\.1/g, "host.docker.internal"));
				},
				kill: function() {
					_driver.quit();
				}
			}
		}

		/**
		 *
		 * @param { string } argument
		 * @returns { slime.runtime.browser.test.internal.suite.Browser }
		 */
		var toBrowser = function(argument) {
			if (argument == "docker:selenium:chrome") {
				return DockerSeleniumChrome();
			}
			if (argument == "selenium:chrome") {
				return SeleniumChrome();
			}
			if (argument == "chrome") {
				var port = (function() {
					if (parameters.options["chrome:debug:port"]) return parameters.options["chrome:debug:port"];
					if (parameters.options["chrome:debug:vscode"]) return 9222;
				})();
				return new Chrome({
					location: parameters.options["chrome:instance"],
					remoteDebugPort: port
				});
			}
			var browsers = ["IE","Firefox","Safari"];
			for (var i=0; i<browsers.length; i++) {
				if (argument == browsers[i].toLowerCase()) {
					var rv = new Browser(jsh.unit.browser.installed[argument].delegate);
					rv.name = browsers[i];
					return rv;
				}
			}
		};

		var browser = toBrowser(parameters.options.browser);

		if (parameters.options.interactive) {
			run(browser);
		} else {
			var suite = new jsh.unit.Suite();
			jsh.shell.console("Requesting result.");
			var running = run(browser);
			/** @type { { events: any[] } } */
			var result = new jsh.http.Client().request({
				url: "http://127.0.0.1:" + running.port + "/" + url,
				evaluate: function(response) {
					var string = response.body.stream.character().asString();
					var json = JSON.parse(string);
					return json;
				}
			});
			var scenario = {
				name: browser.name,
				execute: function(scope,verify) {
					result.events.forEach(function(event) {
						// TODO: there is no documentation that verify.fire works and it is not obvious why it does
						verify.fire(event.type,event.detail);
					});
				}
			}
			suite.part(browser.name, scenario);
			browser.kill();
			jsh.unit.interface.create(suite, {
				view: parameters.options.view
			});
		}
	}
//@ts-ignore
)(Packages, $api, jsh);
