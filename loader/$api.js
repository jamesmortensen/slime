//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
//	TODO	get rid of the wildcarded properties in $exports by adding all properties to $api.d.ts
	/**
	 * @param { slime.runtime.internal.$engine } $engine
	 * @param { slime.runtime.internal.Code } $slime
	 * @param { slime.$api.Global } $exports
	 */
	function($engine,$slime,$exports) {
		var load = function(name,$context) {
			var $exports = {};
			$engine.execute(
				$slime.getRuntimeScript(name),
				{
					$platform: $engine,
					$context: $context,
					$exports: $exports,
					$export: function(v) {
						$exports = v;
					}
				},
				null
			);
			return $exports;
		};

		var factory = function(name) {
			/**
			 *
			 * @param { any } $context
			 * @returns { any }
			 */
			var rv = function($context) {
				return load(name, $context);
			}
			return rv;
		}

		var code = {
			/** @type { slime.loader.Product<slime.runtime.internal.mime.Context,slime.$api.mime.Export> } */
			mime: factory("mime.js"),
			/** @type { slime.loader.Product<slime.runtime.internal.events.Context,slime.runtime.internal.events.Export> } */
			events: factory("events.js")
		};

		Object.assign($exports, load("$api-flag.js"));

		var events = code.events({
			deprecate: $exports.deprecate
		});

		(function() {
			var old = {};
			Object.assign(old, load("$api-Function-old.js", { deprecate: $exports.deprecate }));
			Object.assign($exports, load("$api-Function.js", { $api: $exports, events: events, old: old, deprecate: $exports.deprecate }));
		})();

		$exports.debug = {
			//	TODO	try to get rid of ignore below
			//@ts-ignore
			disableBreakOnExceptionsFor: function(f) {
				if ($exports.debugger) {
					var rv = function() {
						var enabled = $exports.debugger.breakOnExceptions;
						if (enabled) {
							$exports.debugger.breakOnExceptions = false;
						}
						try {
							return f.apply(this,arguments);
						} finally {
							if (enabled) {
								$exports.debugger.breakOnExceptions = true;
							}
						}
					}
					return rv;
				} else {
					//	TODO	unclear what should be done here, but forcing a debugger pause is probably not right
					//	debugger;
					return f;
				}
			}
		};

		$exports.Filter = Object.assign(
			function(f) {
			},
			{
				and: void(0),
				or: void(0),
				not: void(0),
				property: void(0)
			}
		);
		$exports.Filter.and = $exports.Function.Predicate.and;
		$exports.Filter.or = $exports.Function.Predicate.or;
		$exports.Filter.not = $exports.Function.Predicate.not;
		$exports.Filter.property = {
			is: function(name,value) {
				return function(v) {
					return v[name] === value;
				}
			},
			equals: function(name,value) {
				return function(v) {
					return v[name] == value;
				}
			}
		};

		$exports.Map = {};
		$exports.Map.property = function(name) {
			return function(v) {
				return v[name];
			};
		};

		$exports.Reduce = {};
		$exports.Reduce.sum = function(array,map) {
			return array.reduce(function(sum,element) {
				return sum + map(element);
			},0);
		};

		$exports.Method = {};
		$exports.Method.property = function() {
			var name = arguments;
			return function() {
				var rv = this;
				for (var i=0; i<name.length; i++) {
					rv = rv[name[i]];
				}
				return rv;
			}
		};

		$exports.Constructor = {};

		$exports.Constructor.decorated = function(original,decorator) {
			if (!decorator) return original;
			var rv = function() {
				var invokedAsConstructor = this.constructor == arguments.callee;
				if (false) {
					var delimited = "";
					for (var i=0; i<arguments.length; i++) {
						if (i > 0) {
							delimited += ",";
						}
						delimited += "arguments[" + i + "]";
					}
					var defaulted = eval("new original(" + delimited + ")");
					var decorated = decorator.apply(defaulted,arguments);
					if (typeof(decorated) == "object" && decorated !== null) {
						return decorated;
					}
					return defaulted;
				} else {
					var rv = (invokedAsConstructor) ? this : {};
					var functions = [original,decorator];
					for (var i=0; i<functions.length; i++) {
						if (invokedAsConstructor) {
							rv.constructor = functions[i];
						}
						var returned = functions[i].apply(rv,arguments);
						if (typeof(returned) == "object" && returned !== null) {
							rv = returned;
						}
					}
					if (rv != this) return rv;
				}
			};
			rv.toString = function() {
				return original.toString() + " decorated with " + decorator.toString();
			}
			return rv;
		};
		$exports.Constructor.invoke = function(p) {
			if (!p.arguments) p.arguments = [];
			var code = "new p.constructor(" +
				p.arguments.map(function() {
					return "p.arguments[" + arguments[1] + "]";
				}).join(",")
			+ ")";
			//	TODO	in contexts like Nashorn, can we use a different API to execute this script? Currently, ncdbg rejects the script name created by this.
			return eval(code);
		};

		$exports.Constructor.global = function() {
			var construct = function() {
				return $exports.Constructor.invoke({
					constructor: this,
					arguments: Array.prototype.slice.call(arguments)
				});
			};

			if (Object.defineProperty) {
				Object.defineProperty(
					Function.prototype,
					"construct",
					{
						value: construct,
						enumerable: false,
						writable: true
					}
				);
			} else {
				//	TODO	or should we refuse to do it? Fail silently? Error?
				Function.prototype.construct = construct;
			}
		}
		$exports.Key = {};
		$exports.Key.by = function(p) {
			var rv = {};
			var create = function(key) {
				rv[key] = (p.count) ? 0 : [];
			};
			var add = function(key,value) {
				if (p.count) {
					rv[key]++;
				} else {
					rv[key].push(value);
				}
			};

			var toStringKey = function(key) {
				if (p.codec) {
					key = p.codec.encode(key);
				}
				return key;
			}

			if (p.keys) {
				p.keys.forEach(function(key) {
					create(toStringKey(key));
				});
			}
			p.array.forEach(function(element) {
				var key = toStringKey(p.key(element));
				if (!rv[key]) create(key);
				add(key,element);
			});
			return rv;
		};

		$exports.Iterable = new function() {
			var getIterator = function(p) {
				if (p.array) {
					return new function() {
						var index = 0;

						this.next = function() {
							if (index < p.array.length) {
								return {
									value: p.array[index++],
									done: false
								};
							} else {
								return {
									done: true
								};
							}
						};
					}
				} else {
					throw new Error("Unimplemented: iterator for " + p);
				}
			}

			/** @type { slime.$api.Global["Iterable"]["groupBy"] } */
			this.groupBy = function(p) {
				var iterator = getIterator(p);

				var rv = {};

				var create = function(key) {
					rv[key] = (p.count) ? 0 : [];
				};

				var add = function(key,value) {
					if (typeof(rv[key]) == "undefined") create(key);
					if (p.count) {
						rv[key]++;
					} else {
						rv[key].push(value);
					}
				};

				var toStringKey = function(group) {
					if (p.codec) {
						group = p.codec.encode(group);
					}
					return group;
				};

				if (p.groups) {
					p.groups.forEach(function(group) {
						create(toStringKey(group));
					});
				}

				var next = iterator.next();
				while(!next.done) {
					var element = next.value;
					var group = p.group(element);
					var key = toStringKey(group);
					add(key,element);
					next = iterator.next();
				}

				return (function() {
					var list;

					return {
						array: function() {
							if (!list) {
								list = [];
								for (var x in rv) {
									var decode = (p.codec && p.codec.decode) ? p.codec.decode : function(x) { return x; };
									var group = decode(x);
									var element = { group: group };
									if (p.count) {
										element.count = rv[x];
									} else {
										element.array = rv[x];
									}
									list.push(element);
								}
								return list;
							}
						}
					}
				})();
			};

			this.match = function(p) {
				var first = p.left;
				var second = p.right;
				var firstRemain = [];
				var secondRemain = second.slice();
				var pairs = [];
				for (var i=0; i<first.length; i++) {
					var match = null;
					for (var j=0; j<secondRemain.length && !match; j++) {
						match = p.matches(first[i],secondRemain[j]);
						if (match) {
							pairs.push({
								left: first[i],
								right: secondRemain[j]
							});
							secondRemain.splice(j,1);
						}
					}
					if (!match) firstRemain.push(first[i]);
				}
				if (p.unmatched && p.unmatched.left) {
					firstRemain.forEach(function(item) {
						p.unmatched.left(item);
					});
				}
				if (p.unmatched && p.unmatched.right) {
					secondRemain.forEach(function(item) {
						p.unmatched.right(item);
					});
				}
				if (p.matched) pairs.forEach(function(pair) {
					p.matched(pair);
				});
				return {
					unmatched: {
						left: firstRemain,
						right: secondRemain
					},
					matched: pairs
				};
			};
		};

		var Properties = (function implementProperties() {
			var withPropertiesResult = function(was) {
				return function() {
					var rv = was.apply(this,arguments);
					decorateArray(rv);
					return rv;
				};
			};

			var decorateArray = function(array) {
				["filter"].forEach(function(name) {
					array[name] = withPropertiesResult(Array.prototype[name]);
				});
				array.object = function() {
					return $exports.Object({ properties: this });
				};
			};

			return function(array) {
				decorateArray(array);
				return array;
			}
		})();

		$exports.Properties = function() {
			var array = (function() {
				if (arguments.length == 0) return [];
				if (!arguments[0]) throw new TypeError("Must be object.");
				if (arguments[0].array) return arguments[0].array;
				if (arguments[0].object) {
					var rv = [];
					for (var x in arguments[0].object) {
						//	TODO	could use Object.defineProperty to defer evaluation of o[x]
						rv.push({ name: x, value: arguments[0].object[x] });
					}
					return rv;
				}
				throw new Error();
			}).apply(null, arguments);

			return Properties(array);
		};

		$exports.Object = Object.assign(
			/**
			 * @param { { properties: {name: string, value: any }[] } } p
			 * @returns { { [x: string]: any } }
			 */
			function(p) {
				var rv = {};
				if (p.properties) {
					for (var i=0; i<p.properties.length; i++) {
						rv[p.properties[i].name] = p.properties[i].value;
					}
				}
				return rv;
			}, {
				compose: void(0),
				properties: void(0),
				property: void(0),
				optional: void(0)
			}
		);
		$exports.Object.compose = function() {
			var args = [{}];
			for (var i=0; i<arguments.length; i++) {
				args.push(arguments[i]);
			}
			return Object.assign.apply(Object,args);
		};
		$exports.Object.property = function() {
			var rv = this;
			for (var i=0; i<arguments.length; i++) {
				rv = rv[arguments[i]];
			}
			return rv;
		};
		$exports.Object.optional = function(v) {
			if (arguments.length == 0) throw new TypeError();
			if (arguments.length == 1) throw new TypeError();
			var rv = v;
			for (var i=1; i<arguments.length; i++) {
				if (rv === null || typeof(rv) == "undefined") return void(0);
				//	string, boolean, number; just fail for now, pending further definition
				if (typeof(rv) != "object") throw new TypeError();
				rv = rv[arguments[i]];
			}
			return rv;
		};
		$exports.Object.properties = function(o) {
			//	Returns an array consisting of:
			//	name:
			//	value:
			//		See http://www.ecma-international.org/ecma-262/5.1/#sec-11.2.1 property accessors
			//		Name 'value' comes because these are defined in terms of [[GetValue]]
			var rv = [];
			for (var x in o) {
				//	TODO	could use Object.defineProperty to defer evaluation of o[x]
				rv.push({ name: x, value: o[x] });
			}
			return Properties(rv);
		};

		$exports.Array = {
			build: function(f) {
				var rv = [];
				f(rv);
				return rv;
			}
		}

		$exports.Value = function(v,name) {
			return new function() {
				this.property = function() {
					return $exports.Value($exports.Object.property.apply(v,arguments),((name)?name:"") + "." + Array.prototype.join.call(arguments,"."))
				};

				this.require = function() {
					if (!v) {
						throw new TypeError(name + " is required");
					}
				}
			}
		};

		/**
		 * @template T
		 * @param { { name: string, extends: new () => Error } } p
		 * @returns { new (message: string, properties: object) => T }
		 */
		var ErrorType = function(p) {
			var Supertype = (p.extends) ? p.extends : Error;
			/**
			 * @constructor
			 * @param { string } message
			 * @param { object } [properties]
			 */
			function Subtype(message,properties) {
				if (this instanceof Subtype) {
					this.name = p.name;
					this.message = (typeof(message) == "string") ? message : "";
					Object.assign(this, properties);
				} else {
					return new Subtype(message);
				}
			}
			Subtype.prototype = $exports.debug.disableBreakOnExceptionsFor(function() {
				var rv = new Supertype();
				delete rv.stack;
				return rv;
			})();
			var rv = Subtype;
			if ($engine.Error && $engine.Error.decorate) {
				rv = $engine.Error.decorate(rv);
			}
			//@ts-ignore
			return rv;
		};

		$exports.Error = {
			//	TODO	see whether we can get rid of this
			//@ts-ignore
			Type: ErrorType
		}

		$exports.Events = Object.assign(
			events.create,
			{
				Function: events.Function,
				toHandler: events.toHandler,
				action: events.action
			}
		);

		//	TODO	switch implementation to use load()
		$exports.threads = (function($context) {
			var $exports = {};
			$engine.execute($slime.getRuntimeScript("threads.js"), { $context: $context, $exports: $exports }, null);
			return $exports;
		})($exports);

		/** @type { slime.$api.mime.Export } */
		var mime = code.mime({
			Function: $exports.Function,
			deprecate: $exports.deprecate
		});

		$exports.mime = mime;

		return $exports;
	}
//@ts-ignore
)($engine,$slime,{})
