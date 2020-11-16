//@ts-check
(
	/**
	 * @param { $api } $api
	 * @param { { library: { verify: slime.definition.verify.Exports }, console: slime.fifty.test.internal.Console } } $context
	 * @param { (value: slime.fifty.test.internal.run) => void } $export
	 */
	function($api,$context,$export) {
		var Verify = $context.library.verify.Verify;
		var console = $context.console;

		/**
		 *
		 * @param { { parent?: slime.fifty.test.internal.Scope } } [p]
		 * @returns { slime.fifty.test.internal.Scope }
		 */
		function Scope(p) {
			if (!p) p = {};

			return new function() {
				this.success = true;

				this.depth = function() {
					return (p.parent) ? p.parent.depth() + 1 : 0;
				};

				this.fail = function() {
					this.success = false;
					if (p.parent) p.parent.fail();
				}

				this.toString = function() {
					return "Scope: " + this.depth();
				}

				this.start = function(name) {
					console.start(this, name);
				}

				this.end = function(name,result) {
					console.end(this, name, result);
				}

				/** @type { slime.definition.verify.Scope["test"] } */
				this.test = function(f) {
					var result = f();
					if (result.success === false) {
						this.fail();
					} else if (result.success === true) {
						//	do nothing
					} else {
						throw new TypeError();
					}
					console.test(this, result.message, result.success);
				}
			}
		}

		function getPropertyPathFrom(target) {
			return function(value) {
				if (value === target) return [];
				for (var x in target) {
					var found = getPropertyPathFrom(target[x])(value);
					if (found) return [x].concat(found);
				}
				return null;
			}
		}

		var scope;
		var verify;

		var runner = function(tests) {
			return function(code,name,argument) {
				if (!code) throw new TypeError("Cannot run scope " + code);
				if (!name) name = $api.Function.result(
					getPropertyPathFrom(tests)(code),
					function(array) {
						return (array) ? array.join(".") : array;
					}
				);
				if (!name) name = "run";
				if (scope) {
					scope.start(name);
				} else {
					console.start(null, name);
				}
				var was = {
					scope: scope,
					verify: verify
				};
				scope = Scope({ parent: scope });
				verify = Verify(scope);
				code(argument);
				var result = scope.success;
				scope = was.scope;
				verify = was.verify;
				if (scope) {
					scope.end(name,result);
				} else {
					console.end(null, name, result);
				}
				return result;
			}
		};

		var parsePath = function(path) {
			var tokens = path.split("/");
			return {
				folder: tokens.slice(0, tokens.length-1).join("/") + "/",
				file: tokens[tokens.length-1]
			}
		};

		var load = function recurse(loader,path,part,argument) {
			if (!part) part = "suite";

			var global = (function() { return this; })();

			var tests = {
				types: {}
			};

			var fifty = {
				global: global,
				$loader: loader,
				run: runner(tests),
				load: function(at,part,argument) {
					var path = parsePath(at);
					recurse(loader.Child(path.folder), path.file, part, argument);
				},
				tests: tests,
				verify: function() {
					return verify.apply(this,arguments);
				}
			};

			var scope = {
				fifty: fifty
			}

			//	TODO	deprecate
			Object.assign(scope, {
				global: fifty.global,
				$loader: fifty.$loader,
				run: fifty.run,
				load: fifty.load,
				tests: fifty.tests,
				verify: fifty.verify
			});

			//	TODO	deprecate
			Object.assign(scope, {
				jsh: global.jsh
			});

			loader.run(
				path,
				scope
			);

			/** @type { any } */
			var target = scope.tests;
			part.split(".").forEach(function(token) {
				target = $api.Function.optionalChain(token)(target)
			});
			if (typeof(target) == "function") {
				/** @type { (argument: any) => void } */
				var callable = target;
				return runner(tests)(callable, path + ":" + part,argument);
			} else {
				throw new TypeError("Not a function: " + part);
			}
		}

		$export(
			/** @type { slime.fifty.test.internal.run } */
			function(loader,path,part) {
				return load(loader,path,part);
			}
		)
	}
//@ts-ignore
)($api,$context,$export);
