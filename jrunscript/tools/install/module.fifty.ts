//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

/**
 * Provides support for downloading and installing software.
 */
namespace slime.jrunscript.tools.install {
	export interface Context {
		client?: slime.jrunscript.http.client.object.Client
		api: {
			shell: slime.jrunscript.shell.Exports
			file: slime.jrunscript.file.Exports
			http: slime.jrunscript.http.client.Exports
		}
		/**
		 * The directory in which to store downloaded files.
		 */
		downloads: slime.jrunscript.file.Directory
	}

	export namespace test {
		export const scope = (
			function(fifty: slime.fifty.test.kit) {
				const $api = fifty.global.$api;
				const jsh = fifty.global.jsh;

				var scope: { [x: string]: any } = {};
				scope.downloads = jsh.shell.TMPDIR.createTemporary({ directory: true });

				var defaults = {
					api: {
						shell: jsh.shell,
						http: jsh.http,
						file: jsh.file,
						Error: jsh.js.Error
					},
					downloads: scope.downloads
				};

				scope.load = function(p) {
					if (!p) p = {};
					var context = $api.Object.compose(defaults);
					context.api.shell = $api.Object.compose(context.api.shell);
					if (p.downloads) {
						context.downloads = p.downloads;
					}
					return fifty.$loader.module("module.js", context);
				}

				scope.module = function(p) {
					return scope.load(p);
				};

				scope.api = scope.load();

				scope.harness = (function createHarness() {
					var tmpdir = jsh.shell.TMPDIR.createTemporary({ directory: true });
					tmpdir.getRelativePath("directory").createDirectory();
					tmpdir.getRelativePath("directory/file").write("text", { append: false });

					var tmpdest = jsh.shell.TMPDIR.createTemporary({ directory: true });

					var rv = {
						local: tmpdest,
						tar: void(0),
						renamed: void(0),
						zip: void(0)
					};

					if (jsh.shell.PATH.getCommand("tar")) {
						jsh.shell.run({
							command: "tar",
							arguments: ["czvf", tmpdest.getRelativePath("directory.tar.gz"), "directory"],
							directory: tmpdir
						});

						rv.tar = tmpdest.getFile("directory.tar.gz");
						rv.renamed = rv.tar.copy(tmpdest.getRelativePath("renamed.tar.gz"));
					}

					jsh.file.zip({
						from: tmpdir,
						to: tmpdest.getRelativePath("directory.zip")
					});
					rv.zip = tmpdest.getFile("directory.zip");
					return rv;
				})();

				if (jsh.httpd.Tomcat) {
					var server = jsh.httpd.Tomcat.serve({ directory: scope.harness.local });
					scope.server = server;
				} else {
					scope.server = null;
				}

				//	TODO	provide within test framework and make return location / directory / file as desired
				scope.tmpdir = function() {
					var tmp = jsh.shell.TMPDIR.createTemporary({ directory: true }).pathname;
					tmp.directory.remove();
					return tmp;
				};

				return scope;
			}
		//@ts-ignore
		)(fifty);
	}

	export interface Format {
		extract: (f: slime.jrunscript.file.File, d: slime.jrunscript.file.Directory) => void
		getDestinationPath: (basename: string) => string
	}

	export interface Exports {
		format: {
			zip: Format
			gzip?: Format
		}

		get: (
			p: { file?: slime.jrunscript.file.File, url?: string, name?: string },
			events?: slime.$api.events.Function.Receiver
		) => slime.jrunscript.file.File

		install: (p: {
			name?: string,
			getDestinationPath?: (file: slime.jrunscript.file.File) => string,
			url?: any,
			file?: slime.jrunscript.file.File,
			format?: Format,
			to: slime.jrunscript.file.Pathname,
			replace?: boolean
		}, events?: $api.events.Function.Receiver) => slime.jrunscript.file.Directory

		/**
		 * @deprecated
		 */
		gzip: any

		/**
		 * @deprecated
		 */
		zip: any

		apache: any

		/**
		 * @deprecated
		 */
		$api: any
	}

	(
		function(
			fifty: slime.fifty.test.kit
		) {
			const verify = fifty.verify;
			const jsh = fifty.global.jsh;
			const module = test.scope.module;
			const server = test.scope.server;

			fifty.tests.get = function() {
				if (server) {
					var downloads = jsh.shell.TMPDIR.createTemporary({ directory: true });
					var api = module({ downloads: downloads });
					var messages: object[] = [];
					var file = api.get({
						url: "http://127.0.0.1:" + server.port + "/directory.tar.gz"
					}, {
						console: function(e) {
							messages.push(e);
						}
					});
					var TOSTRING = function() {
						return { string: this.toString() };
					};
					var messageStartsWith = function(string) {
						return function() {
							return Boolean(this.detail.substring(0,string.length) == string);
						}
					};
					verify(file).is.type("object");
					verify(downloads).getFile("directory.tar.gz").is.not(null);
					verify(downloads).getFile("directory.tar.gz").evaluate(TOSTRING).string.is(file.toString());
					verify(messages,"messages").is(messages);
					verify(messages).length.is(2);
					verify(messages)[0].evaluate(messageStartsWith("Downloading")).is(true);
					verify(messages)[0].evaluate(messageStartsWith("Found")).is(false);
					verify(messages)[1].evaluate(messageStartsWith("Wrote")).is(true);
				}
			}
		}
	//@ts-ignore
	)(fifty);

	(
		function(
			Packages: slime.jrunscript.Packages,
			fifty: slime.fifty.test.kit
		) {
			const verify = fifty.verify;
			const jsh = fifty.global.jsh;
			const api: { install: any, format: any, apache: any } = test.scope.api;
			const server = test.scope.server;
			const harness = test.scope.harness;
			const tmpdir: () => slime.jrunscript.file.Pathname = test.scope.tmpdir;
			const downloads: slime.jrunscript.file.Directory = test.scope.downloads;
			const mock = test.scope.mock;

			fifty.tests.install = function() {

				fifty.run(function replace() {
					const harness = test.scope.harness;

					var install = function(to,replace?) {
						return function(p) {
							p.install({
								file: harness.zip,
								to: to,
								replace: replace
							});
						}
					};

					var clean = jsh.shell.TMPDIR.createTemporary({ directory: true }).pathname;
					clean.directory.remove();
					verify(api).evaluate(install(clean)).threw.nothing();

					verify(api).evaluate(install(clean,true)).threw.nothing();

					verify(api).evaluate(install(clean)).threw.type(Error);
				});

				fifty.run(function present() {
					verify(api).is.type("object");
					if (jsh.shell.PATH.getCommand("tar")) {
						verify(api).evaluate(function() { return this.format.gzip; }).is.type("object");
						verify(api).evaluate(function() { return this.gzip; }).is.type("function");
					}
				})
			};

			fifty.tests.tar = function() {
				//	Test .tar format
				var tmp = jsh.shell.TMPDIR.createTemporary({ directory: true }).pathname;
				tmp.directory.remove();

				if (harness.tar) {
					api.install({
						file: harness.tar,
						format: api.format.gzip,
						to: tmp
					});

					verify(tmp).directory.getFile("file").evaluate(function(p) { return p.read(String); }).is("text");

					//	Test a file with different download name can also be expanded, using getDestinationPath()
					(function() {
						var tmp = jsh.shell.TMPDIR.createTemporary({ directory: true }).pathname;
						tmp.directory.remove();
						api.install({
							file: harness.renamed,
							format: api.format.gzip,
							to: tmp,
							getDestinationPath: function() { return "directory"; }
						});
						verify(tmp).directory.getFile("file").evaluate(function(p) { return p.read(String); }).is("text");
					})();
				}

				//	Test a downloaded file
				if (server && harness.tar) (function() {
					var tmp = tmpdir();
					verify(downloads).getFile("directory.tar.gz").is(null);
					api.install({
						url: "http://127.0.0.1:" + server.port + "/directory.tar.gz",
						format: api.format.gzip,
						to: tmp
					});
					verify(downloads).getFile("directory.tar.gz").is.not(null);
					verify(tmp).directory.getFile("file").evaluate(function(p) { return p.read(String); }).is("text");
				})();

				//	TODO	ensure when a copy has already been downloaded, the cached version is used
			}

			fifty.tests.zip = function() {
				//	Test ZIP format
				if (server) {
					(function() {
						var tmp = tmpdir();
						verify(downloads).getFile("directory.zip").is(null);
						api.install({
							url: "http://127.0.0.1:" + server.port + "/directory.zip",
							format: api.format.zip,
							to: tmp
						});
						verify(downloads).getFile("directory.zip").is.not(null);
						verify(tmp).directory.getFile("file").evaluate(function(p) { return p.read(String); }).is("text");
					})();
				}
			};

			fifty.tests.apache = function() {
				var scope = {
					mock: void(0)
				};
				if (jsh.httpd.Tomcat) {
					var mock = new jsh.httpd.Tomcat();
					mock.map({
						path: "/",
						servlets: {
							"/*": {
								load: function(scope) {
									Packages.java.lang.System.err.println("custom servlet loading ...");
									scope.$exports.handle = function(request) {
										Packages.java.lang.System.err.println("Got request ...");
										var host = request.headers.value("host");
										Packages.java.lang.System.err.println("host = " + host);
										if (host == "www.apache.org") {
											if (request.path == "dyn/closer.cgi") {
												return {
													status: { code: 200 },
													body: {
														type: "application/json",
														string: JSON.stringify({
															preferred: "http://apache.inonit.com/"
														})
													}
												};
											}
										}
										if (host == "apache.inonit.com") {
											return {
												status: { code: 200 },
												body: fifty.$loader.get(request.path) as slime.jrunscript.runtime.Resource
											};
										}
									};
									Packages.java.lang.System.err.println("custom servlet loaded.");
								}
							}
						},
						resources: null
					});
					mock.start();
					scope.mock = mock;
				} else {
					scope.mock = null;
				}

				if (jsh.httpd.Tomcat) {
					verify(api).apache.is.type("object");
					verify(api).apache.evaluate.property("find").is.type("function");
					verify(mock).is.type("object");

					var PROXY = {
						http: {
							host: "127.0.0.1",
							port: mock.port
						}
					};

					var mockdownloads = fifty.jsh.file.directory();
					var mockclient = new jsh.http.Client({
						proxy: PROXY
					});
					var mockapi = fifty.$loader.module("module.js", {
						client: mockclient,
						api: {
							shell: jsh.shell,
							http: jsh.http,
							file: jsh.file,
							Error: jsh.js.Error
						},
						downloads: mockdownloads
					});

					var GET_API_HTML = function() { return this.getFile("module.fifty.ts") };
					var EQUALS = function(string) { return function() { return this.read(String) == string; } };
					verify(mockdownloads).evaluate(GET_API_HTML).is(null);
					var file: object = mockapi.apache.find({ path: "module.fifty.ts" });
					var string = fifty.$loader.get("module.fifty.ts").read(String);
					verify(file).evaluate(EQUALS(string)).is(true);
					verify(mockdownloads).evaluate(GET_API_HTML).is.not(null);
					verify(mockdownloads).getFile("module.fifty.ts").evaluate(EQUALS(string)).is(true);
				}

				//	TODO	does Fifty have a destroy mechanism?
				if (scope.mock) scope.mock.stop();
			}
		}
	//@ts-ignore
	)(Packages,fifty);


	(
		function(
			fifty: slime.fifty.test.kit
		) {
			fifty.tests.suite = function() {
				fifty.run(fifty.tests.get);
				fifty.run(fifty.tests.install);
				fifty.run(fifty.tests.tar);
				fifty.run(fifty.tests.zip);
				fifty.run(fifty.tests.apache);

				//	TODO	does Fifty have a destroy mechanism?
				const scope = test.scope;
				if (scope.server) scope.server.stop();
			}
		}
	//@ts-ignore
	)(fifty);
}