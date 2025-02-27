//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

interface Function {
	construct: any
}

/**
 * The `$api` object is provided to all code loaded by the platform loader. It provides basic JavaScript language functionality.
 *
 * The `$api.fp` namespace provides functional programming constructs. See {@link slime.$api.fp}.
 *
 * Various `$api` methods can "flag" APIs for callers, causing a configurable callback to be executed when they are invoked, to warn
 * the users that the APIs are deprecated or experimental. See the `deprecate` and `experimental` functions of {@link Global |
 * `$api`}.
 */
namespace slime.$api {
	(
		function(fifty: slime.fifty.test.Kit) {
			fifty.tests.exports = fifty.test.Parent();
			fifty.tests.manual = {};
		}
	//@ts-ignore
	)(fifty);

	export interface Global {
		debug: {
			disableBreakOnExceptionsFor: <T extends slime.external.lib.es5.Function>(f: T) => T
		}

		Filter: {
			/**
			 * @deprecated Use {@link slime.$api.Global["filter"]["and"]}. }
			 */
			and: slime.$api.fp.Exports["Predicate"]["and"]

			/**
			 * @deprecated Use {@link slime.$api.Global["filter"]["or"]}. }
			 */
			or: slime.$api.fp.Exports["Predicate"]["or"]
		}

	}

	export interface Global {
		Key: {
			by: {
				<K,T>(p: {
					count: true
					keys?: K[]
					codec?: slime.Codec<K,string>
					key: (t: T) => K
					array: T[]
				}): {
					[key: string]: number
				}

				<K,T>(p: {
					keys?: K[]
					codec?: slime.Codec<K,string>
					key: (t: T) => K
					array: T[]
				}): {
					[key: string]: T[]
				}
			}
		}
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;
			const api = fifty.global.$api;

			fifty.tests.exports.Key = function() {
				var array = [
					{ a: 1, b: 2 },
					{ a: 1, b: 3 },
					{ a: 2, b: 4 },
					{ a: 1, b: 5 }
				];

				var lists = api.Key.by({
					key: function(value) {
						return value.a;
					},
					array: array
				});
				verify(lists)[1].length.is(3);
				verify(lists)[2].length.is(1);

				var counts = api.Key.by({
					key: function(value) {
						return value.a;
					},
					count: true,
					array: array
				});
				verify(counts)[1].is(3);
				verify(counts)[2].is(1);
				verify(counts).evaluate.property(3).is(void(0));

				var countKeys = api.Key.by({
					keys: [1,2,3],
					key: function(value) {
						return value.a;
					},
					count: true,
					array: array
				});
				verify(countKeys)[1].is(3);
				verify(countKeys)[2].is(1);
				verify(countKeys)[3].is(0);
			}
		}
	//@ts-ignore
	)(fifty);


	export interface Global {
		Constructor: {
			invoke: <C extends new (...args: any) => any>(p: {
				constructor: C
				arguments?: ConstructorParameters<C>
			}) => InstanceType<C>
		}
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;
			const api = fifty.global.$api;

			fifty.tests.exports.Constructor = function() {
				verify(api).evaluate.property("Constructor").is.not(void(0));
				verify(api).Constructor.evaluate.property("invoke").is.not(void(0));

				//@ts-ignore
				var A: new (a?: number, b?: number) => { a: number, b: number } = function(a,b) {
					this.a = a;
					this.b = b;
				};

				var a1 = api.Constructor.invoke({
					constructor: A,
					arguments: [1,2]
				});
				verify(a1).a.is(1);
				verify(a1).b.is(2);

				var a2 = api.Constructor.invoke({
					constructor: A,
					arguments: [1]
				});
				verify(a2).a.is(1);
				verify(a2).b.is(void(0));

				var a3 = api.Constructor.invoke({
					constructor: A,
					arguments: []
				});
				verify(a3).a.is(void(0));
				verify(a3).b.is(void(0));

				(function omittedArguments() {
					var a = api.Constructor.invoke({
						constructor: A
					});
					verify(a).a.is(void(0));
					verify(a).b.is(void(0));
				})();
			}
		}
	//@ts-ignore
	)(fifty);


	export interface Global {
		/**
		 * Contains constructs related to *Iterable* objects, as defined by
		 * [ES2015](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols).
		 */
		Iterable: {
			/**
			 * Collates an iterable set of values of type V (extends any) into groups of type G (extends any) (or counts the number of
			 * values in each group) based on a specified set of criteria.
			 *
			 * @param p
			 */
			groupBy<V,G> (p: {
				/**
				 * A set of elements to group.
				 */
				array: Array<V>

				/**
				 * Returns the group to which a given element should belong.
				 */
				group: (element: V) => G

				/**
				 * A set of groups to use in the output. Note that the `group` function still is responsible for grouping, so if it
				 * returns groups not in this set, they will be included in the output. This value is for the purpose of
				 * _guaranteeing_ certain elements will be returned (even with empty lists or zero counts).
				 */
				groups?: Array<G>

				/**
				 * If `G` is not `string`, converts `G`s to and from `string`.
				 */
				codec?: {
					/**
					 * Converts a G to a `string`.
					 * @param group A group.
					 * @returns A distinct string identifying the given group.
					 */
					encode: (group: G) => string

					/**
					 * Converts a `string` to a G.
					 * @param string An encoded group.
					 * @returns A group.
					 */
					decode: (string: string) => G
				}

				/**
				 * If `true`, a number is returned for each group indicating how many elements were in the group. If `false, an
				 * array of all the elements for each group is returned.
				 */
				count?: boolean
			}) : {
				array: () => Array<{
					group: G
					array?: V[],
					count?: number
				}>
			},

			/**
			 * A function that operates on two lists, called `left` and `right`, pertaining to a common underlying set. Callers
			 * specify a `matches` function that can determine which elements on each side
			 * <dfn>match</dfn> , or pertain to the same logical element in the set. The method will identify which elements from
			 * each list match, and which from each list remain unmatched after searching for matches. The results will be returned;
			 * optionally, a callback can be invoked for each element based on the result for that element.
			 *
			 * @param p
			 */
			match<L,R> (
				p: {
					left: L[],
					right: R[],
					/**
					 * @param l An element from `left`.
					 * @param r An element from `right`.
					 * @returns `true` if the two elements *match* , that is, pertain to the same element in the underlying set.
					 */
					matches: (l: L, r: R) => boolean,
					unmatched?: {
						/**
						 * A callback invoked for each item from `left` that does not match.
						 *
						 * @param l The element from `left`.
						 */
						left?: (l: L) => void,
						/**
						 * A callback invoked for each item from `right` that does not match.
						 *
						 * @param r The element from `right`.
						 */
						 right?: (r: R) => void
					},
					/**
					 * A callback invoked for each pair of items that matches.
					 */
					matched?: (p: {
						/**
						 * An element from `left`.
						 */
						left: L,
						/**
						 * An element from `right`.
						 */
						right: R
					}) => void
				}
			): {
				unmatched: {
					left: L[],
					right: R[]
				},
				matched: {
					left: L,
					right: R
				}[]
			}
		}
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			var { verify } = fifty;
			var { $api } = fifty.global;

			fifty.tests.exports.Iterable = function() {
				var groups = [
					{ id: "A" },
					{ id: "B" },
					{ id: "C" }
				];

				var findGroup = function(letter) {
					return groups.filter(function(group) {
						return group.id == letter;
					})[0];
				};

				var group = function(s) {
					return findGroup(s.substring(0,1).toUpperCase());
				};

				var codec = {
					encode: function(group) {
						return group.id;
					},
					decode: function(string) {
						return findGroup(string)
					}
				};

				var words = ["ant", "ancillary", "cord"];

				var grouped = $api.Iterable.groupBy({
					array: words,
					group: group,
					groups: groups,
					codec: codec,
					count: false
				}).array();

				verify(grouped).length.is(3);
				verify(grouped)[0].array.length.is(2);
				verify(grouped)[1].array.length.is(0);
				verify(grouped)[2].array.length.is(1);

				var counted = $api.Iterable.groupBy({
					array: words,
					group: group,
					groups: groups,
					codec: codec,
					count: true
				}).array();

				verify(counted).length.is(3);
				verify(counted)[0].count.is(2);
				verify(counted)[1].count.is(0);
				verify(counted)[2].count.is(1);

				fifty.run(function match() {
					const api = $api;

					var left = ["a", "b"];
					var right = ["B", "C"];
					var matches = function(a,b) {
						return a.toLowerCase() == b.toLowerCase();
					};

					var recordingFunction = function() {
						var rv: {
							(): void
							received: any[][]
						} = Object.assign(
							function() {
								rv.received.push(Array.prototype.slice.call(arguments));
							},
							{
								received: []
							}
						);
						return rv;
					};

					var onLeft = recordingFunction();
					var onRight = recordingFunction();
					var onMatch = recordingFunction();

					var result = api.Iterable.match({
						left: left,
						right: right,
						matches: matches,
						unmatched: {
							left: onLeft,
							right: onRight
						},
						matched: onMatch
					});
					verify(result).unmatched.left.length.is(1);
					verify(result).unmatched.right.length.is(1);
					verify(result).matched.length.is(1);
					verify(onLeft.received).length.is(1);
					verify(onLeft.received)[0].length.is(1);
					verify(onRight.received).length.is(1);
					verify(onRight.received)[0].length.is(1);
					verify(onMatch.received).length.is(1);
					verify(onMatch.received)[0].length.is(1);
					verify(onMatch.received)[0][0].left.is.type("string");
					verify(onMatch.received)[0][0].right.is.type("string");
				})
			}

			fifty.tests.wip = fifty.tests.exports.Iterable;
		}
	//@ts-ignore
	)(fifty);

	export interface Global {
		Properties: any

		Object: {
			(p: { properties: {name: string, value: any }[] }): { [x: string]: any }
			compose: {
				<T>(t: T): T
				<T,U>(t: T, u: U): T & U
				<T,U,V>(t: T, u: U, v: V): T & U & V
				<T,U,V,W>(t: T, u: U, v: V, w: W): T & U & V & W
			}
			properties: slime.external.lib.es5.Function
			property: any
			optional: any
			values: {
				/**
				 * @experimental Completely untested.
				 */
				map: <O,T,R>(f: (t: T) => R) => (o: { [x in keyof O]: T } ) => { [x in keyof O]: R }
			}
		}

		Array: {
			/**
			 * Creates an array by creating an empty array and passing it to the given function to populate.
			 */
			build: <T>(f: (p: T[]) => void) => T[]
		}

		Value: (value: any, name: string) => {
			/**
			 * A method that throws a `TypeError` if the value is falsy.
			 */
			require: () => void

			/**
			 * A method that creates a `Value` representing a property or subproperty of this `Value`.
			 */
			property: (...names: string[]) => ReturnType<Global["Value"]>
		}
	}

	export namespace error {
		export namespace old {
			export type Instance<N extends string, P extends {}> = {
				name: N
				message: string
				stack?: string
			} & P

			export type Type<N extends string, P extends {}> = {
				new (message?: string, properties?: P): Instance<N,P>
				(message?: string, properties?: P): Instance<N,P>
				readonly prototype: Instance<N,P>
			}
		}

		export interface Custom<N extends string,P extends {}> extends Error {
			properties: P
		}

		export type CustomType<N extends string,P extends {}> = {
			new (p?: P): Custom<N,P>;
			(p?: P): Custom<N,P>;
			readonly prototype: Custom<N,P>;
		}
	}

	export interface Global {
		Error: {
			/**
			 * Deprecated APIs for dealing with custom error types.
			 *
			 * @deprecated
			 */
			old: {
				/**
				 * Creates a subtype of the JavaScript global constructor {@link Error} for use in APIs.
				 *
				 * @deprecated Replaced by {@link Global | Global]"Error"]["type"]}.
				 */
				Type: <N extends string, P extends {}>(p: {
					/**
					 * The `name` property to use for errors of this type; see the ECMA-262 {@link https://262.ecma-international.org/11.0/#sec-error.prototype.name | error.prototype.name} definition.
					 */
					name: N
					/**
					 * An {@link Error} subtype to use as the supertype for errors created by this constructor. Defaults to `Error`,
					 * but subtypes of other errors (like `TypeError`) can be created, as can subtypes of user-defined error types.
					 */
					extends?: ErrorConstructor
				}) => slime.$api.error.old.Type<N,P>

				/**
				 * Creates a subtype of the JavaScript global constructor {@link Error} for use in APIs.
				 *
				 * @deprecated Not necessary when using {@link Global | Global]"Error"]["type"]}; `instanceof` can be used.
				 */
				isType: <N extends string,P extends {}>(type: slime.$api.error.old.Type<N,P>) => (e: any) => e is slime.$api.error.old.Instance<N,P>
			}

			/**
			 * Creates a JavaScript error type. The error type can take an arbitrary object containing properties in its constructor;
			 * these properties are used to generate the error message via the `getMessage` provided when creating the type, and are
			 * available on error instances via the `properties` property.
			 */
			type: <N extends string,S extends () => Error,P extends {}>(p: {
				name: N
				extends?: S,
				getMessage: (p?: P) => string
			}) => error.CustomType<N,P>
		}
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;
			const { $api } = fifty.global;

			fifty.tests.manual.Error = {
				//	Given that stack is non-standard, not adding this to suite and not really asserting on its format
				//	TODO	*is* stack still non-standard?
				stack: function() {
					var OldType = $api.Error.old.Type({
						name: "foo",
						extends: TypeError
					});

					try {
						throw new OldType("bar");
					} catch (e) {
						var error: Error = e;
						verify(error).stack.is.not(void(0));
					}

					var Type = $api.Error.type({
						name: "Foo",
						extends: TypeError,
						getMessage: function() {
							return "bar";
						}
					});

					try {
						throw new Type();
					} catch (e) {
						var error: Error = e;
						verify(e).stack.is.type("string");
						//	TODO	in jsh (at least under Rhino), this stack trace does not include the error's toString(); in Chrome, it
						//			does. Other platforms untested.
						if (fifty.global.jsh) fifty.global.jsh.shell.console(e.stack);
						if (fifty.global.window) fifty.global.window["console"].log(e.stack);
					}
				}
			};

			fifty.tests.exports.Error = function() {
				var CustomError = $api.Error.old.Type({
					name: "Custom"
				});

				var ParentError = $api.Error.old.Type({
					name: "Parent",
					extends: TypeError
				});

				var ChildError = $api.Error.old.Type({
					name: "Child",
					//	TODO	regression seemingly caused by TypeScript update to 4.7.3
					//@ts-ignore
					extends: ParentError
				});

				try {
					throw new CustomError("hey", { custom: true });
				} catch (e) {
					verify(e instanceof CustomError).is(true);
					verify($api.Error.old.isType(CustomError)(e)).is(true);
					verify(e instanceof ParentError).is(false);
					verify($api.Error.old.isType(ParentError)(e)).is(false);
					verify(e instanceof ChildError).is(false);
					verify($api.Error.old.isType(ChildError)(e)).is(false);
					verify(e instanceof TypeError).is(false);
					verify($api.Error.old.isType(TypeError)(e)).is(false);
					verify(Boolean(e.custom)).is(true);
					verify(String(e.message)).is("hey");
					verify(String(e.toString())).is("Custom: hey");
				}

				try {
					throw new ParentError("how", { custom: true });
				} catch (e) {
					verify(e instanceof CustomError).is(false);
					verify($api.Error.old.isType(CustomError)(e)).is(false);
					verify(e instanceof ParentError).is(true);
					verify($api.Error.old.isType(ParentError)(e)).is(true);
					verify(e instanceof ChildError).is(false);
					verify($api.Error.old.isType(ChildError)(e)).is(false);
					verify(e instanceof TypeError).is(true);
					verify($api.Error.old.isType(TypeError)(e)).is(true);
				}

				try {
					throw new ChildError("now", { custom: true });
				} catch (e) {
					verify(e instanceof CustomError).is(false);
					verify($api.Error.old.isType(CustomError)(e)).is(false);
					verify(e instanceof ParentError).is(true);
					verify($api.Error.old.isType(ParentError)(e)).is(true);
					verify(e instanceof ChildError).is(true);
					verify($api.Error.old.isType(ChildError)(e)).is(true);
					verify(e instanceof TypeError).is(true);
					verify($api.Error.old.isType(TypeError)(e)).is(true);
				}

				fifty.run(fifty.tests.exports.Error.type);
			}

			fifty.tests.exports.Error.type = function() {
				var Parent = $api.Error.type({
					name: "Foo",
					extends: TypeError,
					getMessage: function(p: { foo: string, bar: number }): string {
						return (p) ? "baz: foo=" + p.foo + " bar=" + p.bar : "baz: no p";
					}
				});

				var e = new Parent({ foo: "foo", bar: 8 });

				var Child = $api.Error.type({
					name: "Bar",
					extends: Parent,
					getMessage: function(p: { baz: string }): string {
						return "hey, it is " + p.baz;
					}
				});

				verify(e).message.is("baz: foo=foo bar=8");
				verify(e).evaluate(String).is("Foo: baz: foo=foo bar=8");
				verify(e).evaluate(function(e) { return e instanceof Parent }).is(true);
				verify(e).evaluate(function(e) { return e instanceof TypeError }).is(true);
				verify(e).evaluate(function(e) { return e instanceof EvalError }).is(false);
				verify(e).evaluate(function(e) { return e instanceof Error }).is(true);
				verify(e).properties.foo.is("foo");
				verify(e).properties.bar.is(8);

				var c = new Child({ baz: "bizzy" });
				verify(c).message.is("hey, it is bizzy");
				verify(c).evaluate(String).is("Bar: hey, it is bizzy");
				verify(c).evaluate(function(e) { return e instanceof Child }).is(true);
				verify(c).evaluate(function(e) { return e instanceof Parent }).is(true);
				verify(c).evaluate(function(e) { return e instanceof TypeError }).is(true);
				verify(c).evaluate(function(e) { return e instanceof EvalError }).is(false);
				verify(c).evaluate(function(e) { return e instanceof Error }).is(true);
				verify(c).properties.baz.is("bizzy");
				verify(c).properties.evaluate.property("foo").is.type("undefined");
				verify(c).stack.is.type("string");

				var NoSupertype = $api.Error.type({
					name: "Standalone",
					getMessage: function(p: {}): string {
						return "foo";
					}
				});
				var n = new NoSupertype();
				verify(n).is.type("object");
			}
		}
	//@ts-ignore
	)(fifty);

	export interface Global {
		events: exports.Events
		/** @deprecated Replaced by {@link slime.$api.Global["events"] } */
		Events: {
			/** @deprecated Replaced by {@link slime.$api.Global["events"]["create"]} */
			(p?: {
				source?: any
				parent?: slime.$api.Events<any>
				getParent?: () => slime.$api.Events<any>
				on?: { [x: string]: any }
			}): slime.$api.Events<any>

			/** @deprecated Replaced by {@link slime.$api.Global["events"]["Function"]} */
			Function: $api.Global["events"]["Function"]
			/** @deprecated Replaced by {@link slime.$api.Global["events"]["toHandler"]} */
			toHandler: $api.Global["events"]["toListener"]
			/** @deprecated Replaced by {@link slime.$api.Global["events"]["action"]} */
			action: $api.Global["events"]["action"]
		}
	}

	export interface Global {
		threads: any
	}

	(
		function(
			fifty: slime.fifty.test.Kit,
		) {
			fifty.tests.suite = function() {
				fifty.run(fifty.tests.exports);
			}

			if (fifty.jsh) fifty.tests.platforms = fifty.jsh.platforms(fifty);
		}
	//@ts-ignore
	)(fifty)
}

namespace slime.$api.internal {
	export type script = <C,E>(name: string) => slime.loader.Script<C,E>
}
