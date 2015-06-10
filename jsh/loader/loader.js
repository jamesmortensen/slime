//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//
//	The Original Code is the jsh JavaScript/Java shell.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2014 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

(function() {
	//	TODO	naming conventions are inconsistent in this stuff; look at how there are addClasses methods and classpath.add().
	//			generally speaking, should probably match the rhinoLoader API across all of these representations of it

	//	TODO	The name prefix used below is duplicative of the one in js/debug/plugin.jsh.js, so not DRY currently
	var _log = function(_logger,_level,mask) {
		var substitutions = Array.prototype.slice.call(arguments,3);
		if (_logger.isLoggable(_level)) {
			var _message = Packages.java.lang.String.format(mask, substitutions);
			_logger.log(_level, _message);
		}
	}

	$host.$api.deprecate.warning = function(o) {
		var name = arguments.callee.javaLogName;
		var _level = Packages.java.util.logging.Level.WARNING;
		var _logger = Packages.java.util.logging.Logger.getLogger(name);
		var _traceLevel = Packages.java.util.logging.Level.FINE;
		if (o.callee) {
			if (o.object && o.property) {
				_log(_logger, _level, "Use of deprecated method %s of object %s", String(o.property), String(o.object));
			} else {
				_log(_logger, _level, "Use of deprecated function %s", String(o.callee));
			}
		} else if (o.object && o.property) {
			_log(_logger, _level, "Access to deprecated property %s of object %s", String(o.property), String(o.object));
		}
		if (_logger.isLoggable(_traceLevel)) {
			_log(_logger, _traceLevel, "Stack trace of deprecated usage:\n%s", String(new Error().stack));
		}
		debugger;
	};
	$host.$api.deprecate.warning.javaLogName = "inonit.script.jsh.Shell.log.$api.deprecate";
//	var rhinoLoader = $host;

//	this.bootstrap = function(path,context) {
//		var loader = new rhinoLoader.Loader({
//			_code: $host.loader.getBootstrapModule(path)
//		});
//		return loader.module("module.js", context);
//	}

	var getCode = function(code) {
		if (typeof(code) == "undefined") throw new TypeError("'code' must not be undefined.");
		if (code === null) throw new TypeError("'code' must not be null.");
		//	This check determines whether the object is a Pathname; is there a way to do that in the rhino/file module itself?
		//	TODO	presumably the run/file methods should only support file objects, not directories or pathnames not
		//			corresponding to files ... or else what should they do if the file is not found? Maybe file could return
		//			null or something ... but run would probably have to fail silently, which is not good unless it is
		//			explicitly specified
		if (code.java && code.java.adapt() && $host.classpath.getClass("java.io.File").isInstance(code.java.adapt())) {
			return {
				name: code.toString(),
				_in: new Packages.java.io.FileInputStream(code.java.adapt())
			};
		} else {
			return code;
		}
	}

	return new function() {
		this.plugin = new function() {
			this.read = function(_code,scope) {
				var loader = new $host.Loader({ _source: _code.getScripts() });
				return loader.run("plugin.jsh.js", scope);
			};
			this.run = function(_code,path,scope,target) {
				$host.run(
					{
						_source: _code.getScripts(),
						path: path
					},
					scope,
					target
				);
			};
			this.file = function(_code,path,context) {
				return $host.file(
					{
						_source: _code.getScripts(),
						path: path
					},
					context
				);
			};
			this.module = function(_code,main,context) {
				var loader = new $host.Loader({ _code: _code });
				return loader.module(main, context);
			};
			this._stream = function(_code,path) {
				var _codeSourceFile = _code.getScripts().getFile(path);
				if (_codeSourceFile) return _codeSourceFile.getInputStream();
				return null;
			};
			this.addClasses = function(_code) {
				$host.classpath.add(_code.getClasses());
			}
		}

		this.run = function(code,scope,target) {
			return $host.run(getCode(code),scope,target);
		}

		this.file = function(code,$context) {
			return $host.file(getCode(code),$context);
		}

		this.module = function(pathname) {
			var format = {};
			if (pathname.directory) {
				if (!pathname.directory.getFile("module.js")) {
					return null;
				}
				format.base = pathname.java.adapt();
				format.name = "module.js";
			} else if (pathname.file && /\.slime$/.test(pathname.basename)) {
				format.slime = pathname.java.adapt();
				format.name = "module.js";
			} else if (pathname.file) {
				format.base = pathname.parent.java.adapt();
				format.name = pathname.basename;
			} else {
				return null;
			}
			var p = {};
			if (arguments.length == 2) {
				p.$context = arguments[1];
			}
			var loader = (function(format) {
				if (format.slime) return new $host.Loader({ _packed: format.slime });
				if (format.base) return new $host.Loader({ _unpacked: format.base });
				throw new TypeError("Unreachable code: format.slime and format.base null in jsh loader's module()");
			})(format);
			var args = [format.name].concat(Array.prototype.slice.call(arguments,1));
			return loader.module.apply(loader,args);
		}

		this.classpath = new function() {
			this.toString = function() {
				return $host.classpath.toString();
			}

			this.add = function(_file) {
				$host.classpath.add(Packages.inonit.script.engine.Code.Source.create(_file));
			};

			this.get = function(name) {
				return $host.classpath.getClass(name);
			}
		};

		this.namespace = function(name) {
			return $host.namespace(name);
		}
	}
})()