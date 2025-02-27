//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//	TODO	clean up the plugin; rename plugin.jsh.api.html and include jsh.tomcat.js in this file or one with a better name
//@ts-check
(
	/**
	 * @param { slime.jrunscript.Packages } Packages
	 * @param { any } JavaAdapter
	 * @param { slime.jsh.plugin.$slime } $slime
	 * @param { slime.$api.Global } $api
	 * @param { slime.jsh.Global } jsh
	 * @param { slime.jsh.plugin.plugin } plugin
	 * @param { slime.old.Loader } $loader
	 */
	function(Packages,JavaAdapter,$slime,$api,jsh,plugin,$loader) {
		plugin({
			isReady: function() {
				return Boolean(jsh.js && jsh.web && jsh.java && jsh.java.log && jsh.io && jsh.io.mime && jsh.shell && jsh.file);
			},
			load: function() {
				if (!jsh.httpd) {
					jsh.httpd = {
						Resources: void(0),
						plugin: void(0),
						tools: void(0),
						nugget: void(0),
						spi: void(0)
					};
				}

				var keygen = function(p) {
					var pathname = jsh.shell.HOME.getRelativePath(".inonit/jsh/etc/keystore");
					if (!pathname.file) {
						pathname.parent.createDirectory({
							exists: function(dir) {
								return false;
							},
							recursive: true
						});
						if (!p) p = {};
						if (!p.dname) p.dname = {};
						//	"CN=Embedded Tomcat, OU=jsh, O=SLIME, L=Unknown, ST=Unknown, C=Unknown";
						if (!p.dname.cn) p.dname.cn = "Embedded Tomcat";
						if (!p.dname.ou) p.dname.ou = "jsh";
						if (!p.dname.o) p.dname.o = "SLIME";
						if (!p.dname.l) p.dname.l = "Unknown";
						if (!p.dname.st) p.dname.st = "Unknown";
						if (!p.dname.c) p.dname.c = "Unknown";
						var dname = ["cn","ou","o","l","st","c"].map(function(name) {
							return name.toUpperCase() + "=" + p.dname[name];
						}).join(", ");
						// jsh.shell.run({
						// 	command: jsh.shell.java.keytool,
						// 	arguments: [
						// 		"-genkey",
						// 		"-noprompt",
						// 		"-alias", "tomcat",
						// 		"-dname", dname,
						// 		//	TODO	is this the right place? for built shells?
						// 		"-keystore", pathname.toString(),
						// 		"-storepass", "inonit",
						// 		"-keypass", "inonit"
						// 	]
						// });
						jsh.shell.run({
							command: jsh.shell.java.keytool,
							arguments: [
								"-genkey",
								"-noprompt",
								"-alias", "tomcat",
								"-dname", dname,
								"-keyalg", "RSA",
								//	TODO	is this the right place? for built shells?
								"-keystore", pathname.toString(),
								"-storepass", "inonit",
								"-keypass", "inonit"
							]
						});
					}
					return jsh.shell.HOME.getFile(".inonit/jsh/etc/keystore");
				}

				/**
				 *
				 * @param { slime.jrunscript.file.File } file
				 * @returns { slime.mime.Type }
				 */
				function getMimeType(file) {
					var type = jsh.io.mime.Type.fromName(file.pathname.basename);
					if (type) return type;
					type = jsh.io.mime.Type.guess({
						name: file.pathname.basename
					});
					if (type) return type;
				}

				jsh.httpd.nugget = {};
				jsh.httpd.nugget.getMimeType = getMimeType;

				jsh.httpd.spi = {
					argument: void(0)
				};

				/** @type { slime.jsh.httpd.Exports["spi"]["argument"] } */
				jsh.httpd.spi.argument = function(resources,servlet) {
					if (servlet["$loader"]) throw new Error("servlet.$loader provided");

					/** @returns { slime.jrunscript.file.File } */
					var toFile = function(servlet) {
						return servlet;
					};

					/** @type { (servlet: slime.jsh.httpd.servlet.descriptor) => servlet is slime.jsh.httpd.servlet.byLoad } */
					var isByLoad = function(servlet) {
						return Boolean(servlet["load"]);
					}

					/** @type { (servlet: slime.jsh.httpd.servlet.descriptor) => servlet is slime.jsh.httpd.servlet.byFile } */
					var isByFile = function(servlet) {
						return Boolean(servlet["file"]);
					}

					if (servlet["pathname"] && servlet["directory"] === false) {
						servlet = { file: toFile(servlet) };
					}

					var byLoader = function($loader,path) {
						return function(scope) {
							$loader.run(path, scope);
						}
					};

					var getResourceLoader = function(resources) {
						if (!resources) return null;
						if (resources.get && resources.Child) return resources;
						if (resources.loader) return $api.deprecate(function() {
							return resources.loader;
						})();
					};

					resources = getResourceLoader(resources);

					/**
					 *	@param { { load: (scope: slime.servlet.Scope) => void, $loader?: slime.old.Loader } } o
					 */
					var returning = function(o) {
						return Object.assign(o, { resources: resources });
					};

					if (isByLoad(servlet)) {
						return returning({
							load: servlet.load
						});
					} else if (isByFile(servlet)) {
						var file = servlet.file;
						return returning({
							$loader: new jsh.file.Loader({
								directory: servlet.file.parent,
								type: getMimeType
							}),
							load: function(scope) {
								jsh.loader.run(file.pathname, scope);
							}
						});
					} else if (servlet.resource) {
						var prefix = servlet.resource.split("/").slice(0,-1).join("/");
						if (prefix) prefix += "/";
						var $loader = resources.Child(prefix);
						return returning({
							$loader: $loader,
							load: byLoader($loader, servlet.resource.substring(prefix.length))
						});
					} else {
						throw new Error("Bad argument.");
					}
				};

				jsh.httpd.Resources = $loader.module("plugin.jsh.resources.js", {
					getMimeType: getMimeType,
					jsh: jsh
				});

				var CATALINA_HOME = (function() {
					if (jsh.shell.environment.CATALINA_HOME) return jsh.file.Pathname(jsh.shell.environment.CATALINA_HOME).directory;
					if (jsh.shell.jsh.lib && jsh.shell.jsh.lib.getSubdirectory("tomcat")) return jsh.shell.jsh.lib.getSubdirectory("tomcat");
				})();

				//	TODO	allow system property in addition to environment variable?
				var TOMCAT_CLASS = (function() {
					var TOMCAT_CLASS = jsh.java.getClass("org.apache.catalina.startup.Tomcat");
					if (!TOMCAT_CLASS && CATALINA_HOME) {
						[
							"bin/tomcat-juli.jar", "lib/servlet-api.jar", "lib/tomcat-util.jar", "lib/tomcat-api.jar", "lib/tomcat-coyote.jar",
							"lib/catalina.jar"
							,"lib/annotations-api.jar"
							//	below added for Tomcat 8
							,"lib/tomcat-jni.jar"
							,"lib/tomcat-util-scan.jar"
							,"lib/jaspic-api.jar"
						].forEach(function(path) {
							jsh.loader.java.add(CATALINA_HOME.getRelativePath(path));
						});
						TOMCAT_CLASS = jsh.java.getClass("org.apache.catalina.startup.Tomcat");
					}
					return TOMCAT_CLASS;
				})();

				jsh.java.log.named("jsh.httpd").CONFIG("When trying to load Tomcat: class = %s CATALINA_HOME = %s", TOMCAT_CLASS, CATALINA_HOME);

				if (TOMCAT_CLASS) {
					var Tomcat = (
						/**
						 * @param { Parameters<slime.jsh.httpd.Exports["Tomcat"]>[0] } p
						 */
						function(p) {
							if (!p) p = {};
							var tomcat = new Packages.org.apache.catalina.startup.Tomcat();

							/** @returns { slime.jrunscript.file.Directory } */
							var castToDirectory = function(node) {
								return node;
							}

							var base = (p.base) ? p.base : castToDirectory(jsh.shell.TMPDIR.createTemporary({ directory: true, prefix: "tomcat" }));

							var getOpenPort = function() {
								var address = new Packages.java.net.ServerSocket(0);
								var rv = address.getLocalPort();
								address.close();
								return rv;
							};

							var port = (p.port) ? p.port : getOpenPort();

							var rv = {};

							if (p.https) {
								var _https = new Packages.org.apache.catalina.connector.Connector();
								//	Do we need protocol? https://www.namecheap.com/support/knowledgebase/article.aspx/9441/33/installing-an-ssl-certificate-on-tomcat/
								var hport = (p.https.port) ? p.https.port : getOpenPort();
								_https.setPort(hport);
								//	maxThreads
								_https.setScheme("https");
								_https.setSecure(true);
								_https.setAttribute("SSLEnabled", "true");
								//	TODO	some DRY violations; see keygen() above
								if (!p.https.keystore) {
									var file = keygen();
									_https.setAttribute("keystoreFile", file.toString());
									_https.setAttribute("keystorePass", "inonit");
									_https.setAttribute("keyAlias", "tomcat");
								} else {
									_https.setAttribute("keystoreFile", p.https.keystore.file.toString());
									_https.setAttribute("keystorePass", p.https.keystore.password);
									_https.setAttribute("keystoreType", "PKCS12");
								}
								_https.setAttribute("clientAuth", "false");
								_https.setAttribute("sslProtocol", "TLS");
								tomcat.getService().addConnector(_https);
								rv.https = {
									port: hport
								};
							} else {
								rv.https = void(0);
							}

							tomcat.setBaseDir(base.toString());

							//	In Tomcat 7, we could just do this:
							//	tomcat.setPort(port);
							//	HTTP was the default connector, and was created automatically.

							//	In Tomcat 8, we need to add the connector explicitly, at least when HTTPS is present
							var _http = new Packages.org.apache.catalina.connector.Connector();
							_http.setPort(port);
							_http.setScheme("http");
							tomcat.getService().addConnector(_http);

							var api = {
								$api: $api,
								js: jsh.js,
								java: jsh.java,
								io: jsh.io,
								web: jsh.web,
								//	TODO	explain; is this unnecessary for jsh servlets? May want to refactor types in api.js to
								//			reflect this
								loader: void(0)
							};

							var server = (
								function() {
									/** @type { slime.servlet.internal.server.Script } */
									var script = $loader.script("server.js");
									return script({
										api: api
									});
								}
							)();

							var addContext = function(path,base) {
								return tomcat.addContext(path, base.pathname.java.adapt().getCanonicalPath());
							};

							/**
							 * @param { any } context - Tomcat native Java context object
							 * @param { slime.old.Loader } resources
							 * @param { string } pattern
							 * @param { string } servletName
							 * @param { slime.jsh.httpd.servlet.descriptor } servletDeclaration
							 */
							var addServlet = function(context,resources,pattern,servletName,servletDeclaration) {
								var servletImplementation = jsh.httpd.spi.argument(resources,servletDeclaration);
								Packages.org.apache.catalina.startup.Tomcat.addServlet(context,servletName,new JavaAdapter(
									Packages.javax.servlet.http.HttpServlet,
									new function() {
										//	TODO	could use jsh.io here
										var servlet;

										this.init = function() {
											/** @type { { $host: slime.servlet.internal.$host.jsh } } */
											var apiScope = {
												$host: {
													context: {
														stdio: {
															output: function(string) {
																jsh.shell.echo(string);
															},
															error: function(string) {
																jsh.shell.console(string);
															}
														}
													},

													parameters: (servletDeclaration.parameters) ? servletDeclaration.parameters : {},

													loaders: {
														api: $loader.Child("server/"),
														script: servletImplementation.$loader,
														container: servletImplementation.resources
													},

													Loader: {
														tools: {
															toExportScope: jsh.io.old.loader.tools.toExportScope
														}
													},

													loadServletScriptIntoScope: function(scope) {
														servletImplementation.load(scope);
													},

													$slime: $slime,

													server: server,
													api: api,

													script: function(script) {
														servlet = script;
													}
												}
											};
											$loader.run("api.js", apiScope);
										};

										this.service = function(_request,_response) {
											servlet.service(_request,_response);
										}

										this.destroy = function() {
											servlet.destroy();
										}
									}
								));
								if (typeof(context.addServletMapping) == "function") {
									//	Tomcat 7
									context.addServletMapping(pattern,servletName);
								} else if (typeof(context.addServletMappingDecoded) == "function") {
									//	Tomcat 9
									context.addServletMappingDecoded(pattern,servletName,false);
								} else {
									throw new Error("Unable to locate API for adding servlet mapping to embedded Tomcat")
								}
							};

							/** @type { slime.jsh.httpd.Tomcat["map"] } */
							rv.map = function(m) {
								if (typeof(m.path) == "string" && m.servlets) {
									var context = addContext(m.path,base);
									var id = 0;
									for (var pattern in m.servlets) {
										addServlet(context,m.resources,pattern,"slime" + String(id++),m.servlets[pattern])
									}
								} else if (typeof(m.path) == "string" && m.webapp) {
									tomcat.getEngine().setParentClassLoader(tomcat.getEngine().getClass().getClassLoader());
									var context = tomcat.addWebapp(m.path, m.webapp.java.adapt().getCanonicalPath());
									jsh.shell.console("Added " + context);
								}
							};

							/** @type { slime.jsh.httpd.Tomcat["servlet"] } */
							rv.servlet = function(declaration) {
								addServlet(addContext("",base),declaration.resources,"/*","slime",declaration);
							};

							var started = false;

							rv.start = function() {
								if (!started) {
									tomcat.start();
									started = true;
								}
							}

							rv.run = function() {
								if (!started) {
									tomcat.start();
									started = true;
								}
								var run = function() {
									tomcat.getServer().await();
									started = false;
								};
								var fork = false;
								if (fork) {
									jsh.java.Thread.start({ call: run });
								} else {
									run();
								}
							}

							rv.stop = function() {
								tomcat.stop();
								//	Destroy was not needed with Tomcat 7, but is needed with 9 (unknown whether needed with 8.5)
								tomcat.destroy();
								started = false;
							}

							return {
								base: base,
								port: port,
								https: rv.https,
								map: rv.map,
								servlet: rv.servlet,
								start: rv.start,
								run: rv.run,
								stop: rv.stop
							}
						}
					);

					jsh.httpd.Tomcat = Object.assign(Tomcat, { serve: void(0) });

					jsh.httpd.Tomcat.serve = function(p) {
						var loader = new jsh.file.Loader({ directory: p.directory });
						var getMimeType = function(path) {
							var rv = jsh.httpd.nugget.getMimeType(p.directory.getFile(path));
							if (rv && rv.media == "application" && rv.subtype == "x.typescript") return "text/plain";
							return rv;
						}
						var tomcat = jsh.httpd.Tomcat(p);
						tomcat.map({
							path: "",
							servlets: {
								"/*": {
									load: function(scope) {
										//	TODO	convert to Handler.Loader?
										scope.$exports.handle = function(request) {
											var resource = loader.get(request.path);
											if (resource) {
												return {
													status: {
														code: 200
													},
													headers: [],
													body: {
														type: getMimeType(request.path),
														stream: resource.read(jsh.io.Streams.binary)
													}
												};
											} else {
												return {
													status: {
														code: 404
													}
												}
											}
										};
									}
								}
							}
						});
						tomcat.start();
						return tomcat;
					};

					jsh.httpd.plugin = {
						tools: void(0)
					};
					jsh.httpd.plugin.tools = function() {
						jsh.loader.plugins($loader.Child("tools/"));
					}
				}
			}
		});
	}
//@ts-ignore
)(Packages,JavaAdapter,$slime,$api,jsh,plugin,$loader)
