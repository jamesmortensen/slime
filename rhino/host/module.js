//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	The Original Code is the rhino/host SLIME module.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2010-2013 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

//	TODO	Document these three, when it is clear how to represent host objects in the documentation; or we provide native
//	script objects to wrap Java classes, which may be a better approach
$exports.getClass = $api.Function({
	before: $api.Function.argument.isString({ index: 0, name: "name" }),
	call: function(name) {
		if ($context.$rhino.classpath.getClass(name)) {
			return $context.$rhino.java.getJavaPackagesReference(name);
		}
		return null;
	}
});

var isJavaObject = function(object) {
	if (typeof(object) == "undefined") return false;
	if (typeof(object) == "string") return false;
	if (typeof(object) == "number") return false;
	if (typeof(object) == "boolean") return false;
	if (object == null) return false;
	//	TODO	Is the next line superfluous now?
	if ($context.$rhino.java.isJavaObjectArray(object)) return true;
	if ($context.$rhino.java.isJavaInstance(object)) return true;
	return false;
}
$exports.isJavaObject = isJavaObject;

if (typeof(Packages.org.mozilla.javascript.Context) == "function" && false) {
	$exports.Properties = function($properties) {
		return Packages.inonit.script.runtime.Properties.create($properties);
	}
} else {
	//	NASHORN	PropertyParent sometimes disappears in Nashorn so replacing it with an equivalent literal notation below for now.
	var PropertyParent = function() {
	}
	PropertyParent.prototype.toString = function() {
		return null;
	}
	
	$exports.Properties = function($properties) {
		var nashornTrace = function(s) {
			//Packages.java.lang.System.err.println(s);
		}
		nashornTrace("Properties constructor");
		var rv = {};
		var keys = $properties.propertyNames();
		while(keys.hasMoreElements()) {
			nashornTrace("key");
			var name = String(keys.nextElement());
			var value = String($properties.getProperty(name));
			nashornTrace(name + "=" + value);
			var tokens = name.split(".");
			var target = rv;
			for (var i=0; i<tokens.length-1; i++) {
				if (!target[tokens[i]]) {
					nashornTrace("token: " + tokens[i] + " is PropertyParent");
					target[tokens[i]] = {
						toString: function() {
							return null;
						}
					};
				} else if (typeof(target[tokens[i]]) == "string") {
					nashornTrace("token: " + tokens[i] + " is currently string; replacing with PropertyParent");
					var toString = (function(value) {
						return function() {
							return value;
						}
					})(target[tokens[i]]);
					if (false && typeof(PropertyParent) == "undefined") {
						nashornTrace("PropertyParent undefined");
						throw new TypeError("In Nashorn, PropertyParent is undefined.");
					}
					target[tokens[i]] = {
						toString: function() {
							return null;
						}
					};
					target[tokens[i]].toString = toString;
				} else {
					nashornTrace("target: " + tokens[i] + " found.");
				}
				target = target[tokens[i]];
			}
			if (!target[tokens[tokens.length-1]]) {
				nashornTrace("Last token: " + tokens[tokens.length-1] + " is string");
				target[tokens[tokens.length-1]] = value;
			} else {
				nashornTrace("Last token: " + tokens[tokens.length-1] + " is toString");
				target[tokens[tokens.length-1]].toString = (function(constant) {
					return function() {
						return constant;
					}
				})(value);
			}
		}
		nashornTrace("Properties constructor returning");
		return rv;
	};
}
$api.experimental($exports,"Properties");
$exports.Properties.adapt = function($properties) {
	return new $exports.Properties($properties);
}

var errors = new function() {
	var instance = new Packages.inonit.script.runtime.Throwables();

	this.fail = function(message) {
		instance.fail(message);
	}

	this.decorate = function(implementation) {
		var rv = function() {
			//	TODO	what if called as function?
			var literals = Array.prototype.map.call(arguments,function(a,i) {
				return "arguments["+i+"]";
			}).join(",");
			//	TODO	is this parameterized call already in js/object?
			var created = eval("new implementation(" + literals + ")");

			var tracer;
			try {
				instance.throwException(created.toString());
			} catch (e) {
				tracer = e;
			}
			var t = tracer.rhinoException;
			var stack = [];
			while(t != null) {
				var sw = new Packages.java.io.StringWriter();
				var pw = new Packages.java.io.PrintWriter(sw);
				if (t == tracer.rhinoException) {
					sw.write(t.getScriptStackTrace());
				} else {
					t.printStackTrace(pw);
				}
				pw.flush();
				var tstack = String(sw.toString()).split(String(Packages.java.lang.System.getProperty("line.separator")));
				if (t == tracer.rhinoException) {
					tstack = tstack.slice(1,tstack.length);
				}
				for (var i=0; i<tstack.length; i++) {
					if (/^Caused by\:/.test(tstack[i])) {
						break;
					}
					stack.push(tstack[i]);
				}
				t = t.getCause();
				if (t != null && String(t.getClass().getName()) == "inonit.script.runtime.Throwables$Exception") {
					t = null;
				}
			}
			//	TODO	clean up the first line, eliminating all the wrapping in WrappedException and Throwables.Exception
			//	TODO	clean up the top of the trace, removing the irrelevant Java lines and the first script line corresponding
			//			to this file
			//	TODO	get full stack traces if possible, rather than the limited version being provided now (which has ...more)
			//			however, could be impossible (getStackTrace may not be overridden while printStackTrace is).
			created.stack = stack;
			return created;
		}
		rv.prototype = implementation.prototype;
		return rv;
	};
}

$exports.fail = function(message) {
	errors.fail(message);
};
$api.experimental($exports,"fail");

if ($context.globals) {
	var global = (function() {
		var rv = this;
		while(rv.__parent__) {
			rv = rv.__parent__;
		}
		return rv;
	})();

	var errorNames = (function() {
		if (false) {
			//	Does not work; these properties are not enumerable, apparently
			var rv = [];
			for (var x in global) {
				if (global[x].prototype.__proto__ == global[x].prototype) {
					rv.push(x);
				}
			}
			return rv;
		} else {
			//	TODO	What is ConversionError? Does not seem to appear in the ECMA standard; is it a Rhino thing?
			//	TODO	What is InternalError? Does not seem to appear in the ECMA standard; is it a Rhino thing?
			return [
				"Error","ConversionError","EvalError","InternalError","RangeError","ReferenceError","SyntaxError","TypeError"
				,"URIError"
			];
		}
	})();

	errorNames.forEach( function(name) {
		if (!global[name]) {
			//	Probably just not defined in this engine
			//	TODO	log message or synthesize error or something
		} else {
			global[name] = errors.decorate(global[name]);
		}
	});
}

var createErrorType = function(p) {
	var rv = function(message) {
		this.message = message;
		this.name = p.name;
	};
	rv.prototype = new Error();
	rv = errors.decorate(rv);
	return rv;
}
$exports.ErrorType = createErrorType;
$api.experimental($exports,"ErrorType");

var experimental = function(name) {
	$exports[name] = items[name];
	$api.experimental($exports, name);
}

$exports.isJavaType = function(javaclass) {
	//	NASHORN	Used to have this function outside isJavaType but because of strange Nashorn issues with code loading it caused
	//			unit tests to fail at times
	var getJavaClassName = function(javaclass) {
		var toString = "" + javaclass;
		if (/\[JavaClass /.test(toString)) {
			return toString.substring("[JavaClass ".length, toString.length-1);
		} else {
			return null;
		}
	}

	//	NASHORN	Used to have this function outside isJavaType but because of strange Nashorn issues with code loading it caused
	//			unit tests to fail at times
	var $isJavaType = function(javaclass,object) {
		var className = getJavaClassName(javaclass);
		if (className == null) throw new TypeError("Not a class: " + javaclass);
		//	NASHORN	Used to call isJavaObject rather than $exports.isJavaObject
		if (!$exports.isJavaObject(object)) return false;
		var loaded = $exports.isJavaType.getNamedJavaClass(className);
		return loaded.isInstance(object);
	};
	
	if (arguments.length == 2) {
		warning("WARNING: Use of deprecated 2-argument form of isJavaType.");
		return $isJavaType(javaclass,arguments[1]);
	}
	return function(object) {
		return $isJavaType(javaclass,object);
	}
};
$exports.isJavaType.getNamedJavaClass = $context.$rhino.java.getNamedJavaClass;
$api.experimental($exports,"isJavaType");

$exports.Array = new function() {
	this.create = function(p) {
		var type = (p.type) ? p.type : Packages.java.lang.Object;
		var rv = Packages.java.lang.reflect.Array.newInstance(type,p.array.length);
		for (var i=0; i<p.array.length; i++) {
			rv[i] = p.array[i];
		}
		return rv;
	};

	this.adapt = function(_p) {
		//	TODO	probably can be done with Array.prototype.slice()
		var rv = [];
		for (var i=0; i<_p.length; i++) {
			rv[i] = _p[i];
		}
		return rv;
	}
};

var toJsArray = function(javaArray,scriptValueFactory) {
	if (typeof(javaArray) == "undefined" || javaArray == null) throw "Required: the Java array must not be null or undefined.";
	if (typeof(scriptValueFactory) == "undefined" || scriptValueFactory == null)
		throw "Required: the function to convert Java objects to ECMAScript objects must not be null or undefined.";
	var rv = new Array(javaArray.length);
	for (var i=0; i<javaArray.length; i++) {
		rv[i] = scriptValueFactory(javaArray[i]);
	}
	return rv;
}
$exports.toJsArray = $api.deprecate(toJsArray);

//	TODO	at least implement this in terms of $exports.Array.create
var toJavaArray = function(jsArray,javaclass,adapter) {
	if (!adapter) adapter = function(x) { return x; }
	var rv = new $context.$rhino.java.Array(javaclass,jsArray.length);
	for (var i=0; i<jsArray.length; i++) {
		rv[i] = adapter(jsArray[i]);
	}
	return rv;
};
$exports.toJavaArray = $api.deprecate(toJavaArray);

if ($context.globals && $context.globals.Array) {
	Array.java = {};
	deprecate(Array, "java");
	//	TODO	Review whether having the second argument be required makes sense
	Array.java.toScript = items.toJsArray;

	Array.prototype.toJava = $api.deprecate(function(javaclass) {
		return toJavaArray(this,javaclass);
	});
}

//	TODO	Below seems to be some kind of elaborate error-handling attempt; it merits examination at some point
//var execute = function(pathname) {
//	try {
//		jsh.execute(scope,pathname);
//	} catch (e) {
//		scope.$jsunit.success = false;
//		var context = Packages.org.mozilla.javascript.Context.getCurrentContext();
//		var errors = Packages.inonit.script.rhino.Engine.Errors.get(context);
//		var array = errors.getErrors();
//		var printedSomething = false;
//		for (var i=0; i<array.length; i++) {
//			var boilerplate = function(error) {
//				if (String(error.getMessage()).indexOf("Compilation produced") == 0) {
//					return true;
//				}
//				return false;
//			}
//			var error = array[i];
//			if (!boilerplate(error)) {
//				Packages.java.lang.System.err.println(
//					error.getSourceName()
//					+ ":" + error.getLineNumber()
//					+ ": " + error.getMessage()
//					+ "\n" + error.getLineSource()
//				);
//				printedSomething = true;
//			}
//		}
//		if (!printedSomething) {
//			Packages.java.lang.System.err.println(e);
//			for (var x in e) {
//				Packages.java.lang.System.err.println("e[" + x + "] = " + e[x]);
//			}
//		}
//		throw "Compilation errors in " + pathname;
//	}
//}

var Thread = function(p) {
	var synchronize = function(f) {
		return Packages.inonit.script.runtime.Threads.createSynchronizedFunction(arguments.callee.lock,f);
	};
	synchronize.lock = new Packages.java.lang.Object();

	var done = false;

	var debug = function(m) {
		if (arguments.callee.on) {
			Packages.java.lang.System.err.println(m);
		}
	}

	var runnable = new function() {
		this.run = function() {
			try {
				var rv = p.call();
				if (!done) {
					synchronize(function() {
						if (p.on && p.on.result) {
							p.on.result(rv);
						}
						debug("Returned: " + thread);
						done = true;
						synchronize.lock.notifyAll();
					})();
				}
			} catch (e) {
				var error = e;
				if (!done) {
					synchronize(function() {
						if (p.on && p.on.error) {
							p.on.error(error);
						}
						debug("Threw: " + thread);
						done = true;
						synchronize.lock.notifyAll();
					})();
				}
			}
		}
	}


	var thread = new Packages.java.lang.Thread(new JavaAdapter(Packages.java.lang.Runnable,runnable));

	thread.start();

	if (p && p.timeout) {
		debug("Starting timeout thread for " + thread + " ...");
		new arguments.callee({
			call: function() {
				debug(thread + ": Sleeping for " + p.timeout);
				Packages.java.lang.Thread.sleep(p.timeout);
				debug(thread + ": Waking from sleeping for " + p.timeout);
				if (!done) {
					synchronize(function() {
						if (p.on && p.on.timeout) {
							p.on.timeout();
						}
						debug("Timed out: " + thread);
						done = true;
						synchronize.lock.notifyAll();
					})();
				}
			}
		});
	}

	this.join = function() {
		synchronize(function() {
			debug("Waiting for " + thread);
			while(!done) {
				debug("prewait done = " + done + " for " + thread);
				synchronize.lock.wait();
				debug("postwait done = " + done + " for " + thread);
			}
		})();
		debug("Done waiting for " + thread);
	};
};

//	TODO	implement for Nashorn
if (typeof(Packages.org.mozilla.javascript.Context) == "function") {
	$exports.Thread = {};
	$exports.Thread.start = function(p) {
		return new Thread(p);
	}
	$exports.Thread.run = function(p) {
		var callee = arguments.callee;
		var on = new function() {
			var result = {};

			this.result = function(rv) {
				result.returned = { value: rv };
			}

			this.error = function(t) {
				result.threw = t;
			}

			this.timeout = function() {
				result.timedOut = true;
			}

			this.evaluate = function() {
				if (result.returned) return result.returned.value;
				if (result.threw) throw result.threw;
				if (result.timedOut) throw callee.TIMED_OUT;
			}
		};
		var o = {};
		for (var x in p) {
			o[x] = p[x];
		}
		o.on = on;
		var t = new Thread(o);
		t.join();
		return on.evaluate();
	};
	//	TODO	make the below a subtype of Error
	//	TODO	this indirection is necessary because Rhino debugger pauses when constructing new Error() if set to break on errors
	$exports.Thread.run.__defineGetter__("TIMED_OUT", function() {
		if (!arguments.callee.cached) {
			arguments.callee.cached = new Error("Timed out.");
		}
		return arguments.callee.cached;
	});
	$exports.Thread.thisSynchronize = function(f) {
		//	TODO	deprecate when Rhino 1.7R3 released; use two-argument version of the Synchronizer constructor in a new method called
		//			synchronize()
		return new Packages.org.mozilla.javascript.Synchronizer(f);
	};
	$exports.Thread.Monitor = function() {
		var lock = new Packages.java.lang.Object();

		this.Waiter = function(c) {
			return Packages.inonit.script.runtime.Threads.createSynchronizedFunction(lock, function() {
				while(!c.until.apply(this,arguments)) {
					lock.wait();
				}
				var rv = c.then.apply(this,arguments);
				lock.notifyAll();
				return rv;
			});
		}
	}
}

$exports.Environment = function(_environment) {
	var getter = function(value) {
		return function() {
			return value;
		};
	};

	var isCaseInsensitive = (function() {
		var jenv = _environment.getMap();
		var i = jenv.keySet().iterator();
		while(i.hasNext()) {
			var name = String(i.next());
			var value = String(jenv.get(name));
			if (name != name.toUpperCase()) {
				return String(_environment.getValue(name.toUpperCase())) == value;
			} else {
				return String(_environment.getValue(name.toLowerCase())) == value;
			}
		}
		return function(){}();
	})();

	var rv = {};
	var i = _environment.getMap().keySet().iterator();
	while(i.hasNext()) {
		var name = String(i.next());
		var value = String(_environment.getValue(name));
		if (isCaseInsensitive) {
			name = name.toUpperCase();
		}
		rv.__defineGetter__(name, getter(value));
	}
	return rv;
};