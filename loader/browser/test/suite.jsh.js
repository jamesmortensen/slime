var parameters = jsh.script.getopts({
	options: {
		suite: jsh.file.Pathname,
		definition: jsh.file.Pathname,
		part: String,
		
		parameter: jsh.script.getopts.ARRAY(String),

		browser: String,
		interactive: false,
		"chrome:instance": jsh.file.Pathname,
		
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
	to: parameters.options.suite.file
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
// loader/browser/test/test/sample-suite.
// $HOME/.bash_profile

var resultServletFile = jsh.shell.jsh.src.getFile("loader/browser/test/browser.servlet.js");

var run = function(browser) {
	var tomcat = new jsh.httpd.Tomcat();
	tomcat.map({
		// TODO: make the below the default for goodness' sake
		path: "",
		resources: new jsh.file.Loader({
			directory: toShell.base
		}),
		servlets: {
			"/*": {
				load: function(scope) {
					jsh.shell.console("Serving " + toShell.base);
					var resultServlet = (function() {
						var rv = {};
						jsh.loader.run(resultServletFile.pathname, {
							httpd: scope.httpd,
							$parameters: {
								url: url
							},
							$exports: rv
						});
						return rv;
					})();

					scope.$exports.handle = scope.httpd.Handler.series(
						function(request) {
							jsh.shell.console("REQUEST: " + request.method + " " + request.path);
						},
						function(request) {
							if (!parameters.options.interactive) return resultServlet.handle(request);
						},
						new scope.httpd.Handler.Loader({
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
		// TODO: probably should just be suite.html, not suite.api.html
		var uri = "http://127.0.0.1:" + tomcat.port + "/" + toSuiteHtml.relative + "?suite=" + toSuite.relative + command;
		if (parameters.options.definition) {
			var toDefinition = jsh.file.navigate({
				from: parameters.options.suite.file,
				to: parameters.options.definition.file
			});
			uri += "&definition=" + toDefinition.relative
			if (parameters.options.part) {
				uri += "&part=" + parameters.options.part;
			}
		}
		parameters.options.parameter.forEach(function(argument) {
			uri += "&" + argument;
		});
		browser.start({
			uri: uri
		});
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

var toBrowser = function(argument) {
	if (argument == "chrome") {
		return new Chrome({
			location: parameters.options["chrome:instance"]
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
	var result = new jsh.http.Client().request({
		url: "http://127.0.0.1:" + running.port + "/" + url,
		evaluate: function(response) {
			var string = response.body.stream.character().asString();
			var json = JSON.parse(string);
			return json;
		}
	});
	var decoder = new jsh.unit.JSON.Decoder();
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