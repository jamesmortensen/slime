//	LICENSE
//	The contents of this file are subject to the Mozilla Public License Version 1.1 (the "License"); you may not use
//	this file except in compliance with the License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
//	
//	Software distributed under the License is distributed on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either
//	express or implied. See the License for the specific language governing rights and limitations under the License.
//	
//	The Original Code is the jsh JavaScript/Java shell.
//	
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2010 the Initial Developer. All Rights Reserved.
//	
//	Contributor(s):
//	END LICENSE

var jsapi = new Namespace("http://www.inonit.com/jsapi");

var getApiHtml = function(moduleMainPathname) {
	if (moduleMainPathname.directory) {
		return moduleMainPathname.directory.getFile("api.html");
	} else if (moduleMainPathname.file) {
		var basename = moduleMainPathname.file.pathname.basename;
		var directory = moduleMainPathname.file.parent;
		var jsName = /(.*)\.js$/.exec(basename);
		if (jsName) {
			return directory.getFile(jsName[1]+".api.html");
		} else {
			return directory.getFile(basename+".api.html");
		}
	}
}

$exports.tests = new function() {
	var testGroups = [];

	var ApiHtmlTests = function(html) {
		var scripts = [];

		for each (var item in html..script) {
			var type = String(item.@type);
			var prefix = "application/x.jsapi#";
			if (type.substring(0,prefix.length) == prefix) {
				scripts.push({ type: type.substring(prefix.length), element: item });
			}
		}

		this.scripts = function(type) {
			if (type) {
				var rv = scripts;
				rv = rv.filter(function(s) {
					return s.type == type;
				});
				return rv.map( function(s) {
					return s.element;
				});
			} else {
				return scripts;
			}
		}
	}

	var moduleToItem = function(moduleDescriptor,unit) {
		return new function() {
			var modulepath = moduleDescriptor.location;
			this.name = modulepath.toString();

			if (!modulepath.directory && !modulepath.file) throw "Not found: " + modulepath;
			var html = getApiHtml(modulepath);
			if (html) {
				this.suite = new ApiHtmlTests(html.read(XML));
			}

			this.namespace = moduleDescriptor.namespace;

			var loadApiHtml = function(api,html,contextScript) {
				//	Interpret unit tests from document
				if (!parameters.options.notest) {
					(function() {
						var $unit = api.$unit;
						var $jsapi = api.$jsapi;
						var $java = api.$java;
						var $module = api.$module;
						var $platform = jsh.$jsapi.$platform;
						var $api = jsh.$jsapi.$api;

						var scopes = html.scripts("scope");
						for (var i=0; i<scopes.length; i++) {
							eval(String(scopes[i]));
						}

						api.$unit.context = eval(String(contextScript));

						if (api.$unit.context) {
							api.$unit.create = function() {
								var module = api.module;

								var initializes = html.scripts("initialize");
								api.$unit.initialize = function() {
									for (var i=0; i<initializes.length; i++) {
										eval(String(initializes[i]));
									}
								}

								var tests = html.scripts("tests");
								api.$unit.execute = function(scope) {
									for (var i=0; i<tests.length; i++) {
										var name = (tests[i].@jsapi::id.length()) ? String(tests[i].@jsapi::id) : null;
										if (unit && (name != unit)) continue;
										scope.scenario(new function() {
											this.name = (name) ? name : "<script>";
											this.execute = function(scope) {
												try {
													eval(String(tests[i]));
												} catch (e) {
													throw "Error evaluating: " + String(tests[i]) + ": " + e;
												}
											}
										});
									}
								}
							}
						} else {
							api.$unit.create = function() {
								api.$unit.initialize = function(scope) {
								}

								api.$unit.execute = function(scope) {
								}
							}
						}
					})();
				}
			}

			this.loadTestsInto = function(scope,contextScript) {
				if (this.suite) {
					loadApiHtml(scope,this.suite,contextScript);
				}
			}

			this.loadWith = function(context) {
				return jsh.loader.module(modulepath, (context) ? context : {});
			}

			this.getResourcePathname = function(path) {
				if (modulepath.directory) return modulepath.directory.getRelativePath(path);
				if (modulepath.file) return modulepath.file.parent.getRelativePath(path);
				throw "Unimplemented";
			}
		}
	}

	this.add = function(module,unit) {
		testGroups.push(moduleToItem(module,unit));
	}

	this.run = function(successWas) {
		var SCOPE = new function() {
			var $newTemporaryDirectory = function() {
				var path = Packages.java.lang.System.getProperty("java.io.tmpdir");
				var pathname = new Packages.java.text.SimpleDateFormat("yyyy.MM.dd.HH.mm.ss.SSS").format( new Packages.java.util.Date() );
				var dir = new Packages.java.io.File(new Packages.java.io.File(path), "jsunit/" + pathname);
				dir.mkdirs();
				return dir;
			}

			this.$java = {
				io: {
					newTemporaryDirectory: $newTemporaryDirectory
				}
			};

			this.$jsapi = {
				module: function(name,context) {
					if (typeof(name) == "object" && typeof(context) == "string") {
						jsh.shell.echo("DEPRECATED: $jsapi.module(" + arguments[1] +") called with context,name");
						return arguments.callee.call(this,arguments[1],arguments[0]);
					}
					var MODULES = $context.MODULES;
					if (MODULES[name+"/"]) {
						//	Forgot trailing slash; fix; this ability may later be removed
						debugger;
						name += "/";
					}
					if (!MODULES[name]) return null;
					return jsh.loader.module(MODULES[name].location,context);
				},
				//	TODO	Probably the name of this call should reflect the fact that we are returning a native object
				environment: $context.ENVIRONMENT,
				newTemporaryDirectory: function() {
					var $path = $newTemporaryDirectory();
					var pathstring = String($path.getCanonicalPath());
					var os = jsh.file.filesystems.os.Pathname(pathstring);
					return (jsh.file.filesystems.cygwin) ? jsh.file.filesystems.cygwin.toUnix(os).directory : os.directory;
				},
				disableBreakOnExceptions: function(f) {
					return function() {
						var isBreak = $host.getDebugger().isBreakOnExceptions();
						$host.getDebugger().setBreakOnExceptions(false);
						var rv = f.apply(this,arguments);
						$host.getDebugger().setBreakOnExceptions(isBreak);
						return rv;
					}
				}
			};
		};

		var $scenario = new $context.Scenario();
		$scenario.name = "Unit tests";
		$scenario.suites = [];
		$scenario.execute = function(topscope) {
			jsh.shell.echo("Environments present: " + Object.keys($context.ENVIRONMENT));
			//	var item is expected to be $scope.$unit
			this.suites.forEach( function(suite) {
				var scope = {
					$java: SCOPE.$java,
					$jsapi: SCOPE.$jsapi,
					$module: new function() {
						this.getResourcePathname = function(path) {
							return suite.item.getResourcePathname(path);
						}
					},
					$platform: jsh.$jsapi.$platform,
					$api: jsh.$jsapi.$api
				};
				var contexts = suite.item.suite.scripts("context");
				if (contexts.length == 0) {
					contexts = [<script>{"{}"}</script>];
				}
				for (var i=0; i<contexts.length; i++) {
					scope.$unit = new function() {
						var contextId = (contexts[i].@jsapi::id.length() > 0) ? " (" + contexts[i].@jsapi::id + ")" : "";
						this.name = suite.item.name + "-" + String(i) + contextId;
					}
					try {
						suite.item.loadTestsInto(scope,contexts[i]);

						scope.module = suite.item.loadWith(scope.$unit.context);

						scope.$unit.create();
					} catch (e) {
						//	Do not let initialize() throw an exception, which it might if it assumes we successfully loaded the module
						scope.$unit.initialize = function() {
						}
						scope.$unit.execute = function(scope) {
							throw e;
						}
					}
					topscope.scenario( scope.$unit )
				}
			} );
		}

		testGroups.forEach( function(item) {
			jsh.shell.echo("Processing: " + item.name + ((item.namespace) ? (" " + item.namespace) : ""));
			$scenario.suites.push({ item: item });
		} );

		successWas($scenario.run( $context.console ));
	}
}

$exports.doc = function(modules,to) {
	var destination = to.createDirectory({
		ifExists: function(dir) {
			dir.remove();
			return true;
		},
		recursive: true
	});

	["api.css","api.js"].forEach( function(name) {
		destination.getRelativePath(name).write($context.api.getFile(name).read(jsh.io.Streams.binary));
	});

	XML.ignoreWhitespace = false;
	XML.prettyPrinting = false;

	var index = $context.jsapi.getFile("index.html").read(XML);

	//	TODO	parameterize the below rather than hard-coding
	index.head.title = "API Documentation";
	index.body.h1 = "API Documentation";

	delete index.body.table.tbody.tr[0];

	var doc = {};

	modules.forEach( function(item) {
		var xhtml = getApiHtml(item.location).read(XML);
		doc[item.path] = xhtml;
	});

	modules.forEach( function(item) {
		if (item.ns) {
			jsh.shell.echo("Generating documentation for " + item.ns + " from module at " + item.location + " ...");
			var xhtml = getApiHtml(item.location).read(XML);
			xhtml.head.appendChild(<link rel="stylesheet" type="text/css" href="api.css" />);
			xhtml.head.appendChild(<script type="text/javascript" src="api.js">{"/**/"}</script>);

			xhtml.body.insertChildAfter(null,<a href="index.html">Documentation Home</a>);

			var contextDiv = xhtml..div.(h1 == "Context");
			if (contextDiv.length()) {
				contextDiv.parent().replace(contextDiv.childIndex(),<></>);
				//	Why does the below not work?
				//delete contextDiv.parent()[contextDiv.childIndex()];
			}

			//	TODO	document and enhance this ability to import documentation from other files
			for each (var e in xhtml..*.(@jsapi::reference.length() > 0)) {
				var x = e;
				while(x.@jsapi::reference.length() > 0) {
					x = eval(String(x.@jsapi::reference));
				}
				e.setChildren(x.children());
			}

			var pagename = "ns." + item.ns + ".html";
			destination.getRelativePath(pagename).write(xhtml.toXMLString());

			index.body.table.tbody.appendChild(<tr><td><a href={pagename}>{item.ns}</a></td><td>{String(xhtml.head.title)}</td></tr>)
		}
	});

	destination.getRelativePath("index.css").write(
		$context.jsapi.getFile("index.css").read(jsh.io.Streams.binary),
		{ append: false }
	);
	destination.getRelativePath("index.html").write(index.toXMLString());
}