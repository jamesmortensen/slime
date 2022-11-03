//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jrunscript.host {
	export interface Context {
		$slime: slime.jrunscript.runtime.Exports

		/**
		 * If `true`, this module modifies global JavaScript objects.
		 */
		globals: boolean

		logging: {
			prefix: string
		}
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.exports = fifty.test.Parent();
		}
	//@ts-ignore
	)(fifty);

	export namespace internal.test {
		export const subject: Exports = (function(fifty: slime.fifty.test.Kit) {
			return fifty.$loader.module("module.js", {
				$slime: fifty.jsh.$slime,
				globals: false,
				logging: {
					prefix: "slime.jrunscript.host.test"
				}
			});
		//@ts-ignore
		})(fifty)
	}

	export namespace internal.logging {
		export interface Context {
			api: {
				java: {
					Array: slime.jrunscript.host.Exports["Array"]
				}
			}
			prefix: string
		}

		export interface Exports {
			log: any
		}
	}

	export interface Environment {
		readonly [x: string]: string
	}

	export interface Exports {
		Environment: (java: slime.jrunscript.native.inonit.system.OperatingSystem.Environment) => Environment
	}

	(
		function(
			Packages: any,
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.exports.Environment = function() {
				const { subject } = internal.test;

				var _Environment = function(o: object, caseSensitive: boolean) {
					return subject.invoke({
						method: {
							class: Packages.inonit.system.OperatingSystem.Environment,
							name: "create",
							parameterTypes: [ Packages.java.util.Map, Packages.java.lang.Boolean.TYPE ]
						},
						arguments: [ subject.Map({ object: o }), caseSensitive ]
					})
				}

				var _environment = _Environment(
					{
						foo: "bar"
					},
					true
				) as native.inonit.system.OperatingSystem.Environment;

				var environment = subject.Environment(_environment);

				fifty.verify(environment).evaluate.property("foo").is("bar");
				fifty.verify(environment).evaluate.property("baz").is(void(0));

				const assignable: object = environment;
				assignable["foo"] = "baz";

				fifty.verify(assignable).evaluate.property("foo").is("bar");

				var _insensitive = _Environment(
					{ foo: "bar" },
					false
				) as native.inonit.system.OperatingSystem.Environment;

				var insensitive = subject.Environment(_insensitive);

				fifty.verify(insensitive).evaluate.property("foo").is("bar");
				fifty.verify(insensitive).evaluate.property("FOO").is("bar");
				fifty.verify(insensitive).evaluate.property("baz").is(void(0));
			}
		}
	//@ts-ignore
	)(Packages,fifty);

	export interface Exports {
		/** The {@link slime.jrunscript.runtim.java.Exports} `getClass()` function. */
		getClass: slime.jrunscript.runtime.java.Exports["getClass"]

		/** The {@link slime.jrunscript.runtim.java.Exports} `isJavaObject()` function. */
		isJavaObject: slime.jrunscript.runtime.java.Exports["isJavaObject"]

		/** The {@link slime.jrunscript.runtim.java.Exports} `isJavaType()` function. */
		isJavaType: slime.jrunscript.runtime.java.Exports["isJavaType"]

		/** The {@link slime.jrunscript.runtim.java.Exports} `toNativeClass()` function. */
		toNativeClass: slime.jrunscript.runtime.java.Exports["toNativeClass"]
	}

	export interface Exports {
		/**
		 * Contains methods that operate on Java arrays.
		 */
		Array: {
			/**
			 * Creates a JavaScript array with the same contents as the given Java array or `java.util.List`.
			 */
			adapt: {
				<T>(p: slime.jrunscript.Array<T>): T[]
				<T>(p: slime.jrunscript.native.java.util.List<T>): T[]
			}

			/**
			 * Creates a native Java array from a JavaScript array containing Java objects.
			 *
			 * @returns A Java array containing the elements in the JavaScript array.
			 */
			create: <T>(p: {
				/**
				 * A reference to a Java class, e.g., `Packages.java.lang.Object`, representing the type of the array to create.
				 */
				type?: JavaClass

				/**
				 * A JavaScript array to be converted.
				 */
				array: T[]
			}) => slime.jrunscript.Array<T>
		}
	}

	(
		function(
			Packages: slime.jrunscript.Packages,
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;
			const module = internal.test.subject;

			const isRhino = typeof(Packages.org.mozilla.javascript.Context) == "function"
				&& (Packages.org.mozilla.javascript.Context.getCurrentContext() != null)
			;

			function test(b) {
				verify(b).is(true);
			}

			fifty.tests.exports.Array = function() {
				var StringClass = (isRhino) ? Packages.java.lang.String : Packages.java.lang.String["class"];
				var javaArray = Packages.java.lang.reflect.Array.newInstance( StringClass, 3 );
				javaArray[0] = "Hello";
				javaArray[1] = "World";
				javaArray[2] = "David";

				var isWord = function(s) { return s + " is a word."; }
				var stringLength = function(s) { return s.length(); }

				var words = module.Array.adapt( javaArray ).map( isWord );
				var lengths = module.Array.adapt( javaArray ).map( stringLength );
				var scriptStrings = module.Array.adapt( javaArray ).map( function(s) { return String(s); } );

				test( words[1] == "World is a word." );
				test( lengths[1] == 5 );
				test( typeof(scriptStrings[0]) == "string" && scriptStrings[0] == "Hello" );

				var array = module.Array.create({ type: Packages.java.lang.Number, array: [1,2,3] });
				verify(array).evaluate(function(p) { return p.length; }).is(3);
				verify(array).evaluate(function(p) { return module.isJavaObject(array); }).is(true);

				var bytes = module.Array.create({ type: Packages.java.lang.Byte.TYPE, array: [1,2,3,4] });
				verify(bytes).evaluate(function(p) { return p.length; }).is(4);
			}
		}
	//@ts-ignore
	)(Packages,fifty);

	export interface Exports {
		/**
		 * Creates a Java `java.util.Map` object from the given JavaScript object by putting all its enumerable properties
		 * into the `Map`.
		 *
		 * @param p
		 */
		Map(p: { object: object }): slime.jrunscript.native.java.util.Map
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.exports.Map = function() {
				const { subject } = internal.test;

				var _map: slime.jrunscript.native.java.util.Map = subject.Map({ object: { foo: "bar" } } );
				fifty.verify(String(_map.get("foo"))).is("bar");
				fifty.verify(String(_map.get("baz"))).is("null");

				var object = {
					foo: "bar"
				};
				Object.defineProperty(object, "baz", {
					value: "bizzy"
				});
				var _object = subject.Map({ object: object });
				fifty.verify(String(_object.get("foo"))).is("bar");
				fifty.verify(object).evaluate.property("baz").is("bizzy");
				fifty.verify(String(_object.get("baz"))).is("null");
			}
		}
	//@ts-ignore
	)(fifty);

	export interface Exports {
		Properties: any
	}

	(
		function(
			Packages: slime.jrunscript.Packages,
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;

			const module = internal.test.subject;

			fifty.tests.exports.Properties = function() {
				var $p = new Packages.java.util.Properties();
				$p.setProperty("a.a", "a");
				$p.setProperty("a.b", "b");
				$p.setProperty("a.c", "c");
				var p = new module.Properties($p);
				//	Note that for-in loop would yield four properties, including toString(), but this seems fine
				Packages.java.lang.System.err.println(Object.keys(p.a));
				verify(p).evaluate.property("a").evaluate(function(a) { return Object.keys(a); }).length.is(3);
			}
		}
	//@ts-ignore
	)(Packages,fifty);


	export namespace logging {
		type LevelMethod = (...args: any[]) => void

		export interface Logger {
			log: (level: any, ...args: any[]) => void
			SEVERE: LevelMethod
			WARNING: LevelMethod
			INFO: LevelMethod
			CONFIG: LevelMethod
			FINE: LevelMethod
			FINER: LevelMethod
			FINEST: LevelMethod
		}
	}

	export interface Exports {
		log: {
			(...args: any[]): void
			named(name: string): logging.Logger
			initialize: (f: (record: any) => void) => void
		}
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.exports.log = function() {
				const { subject } = internal.test;
				fifty.verify(subject).log.is.type("function");
				var log = subject.log.named("foo");
				fifty.verify(log).SEVERE.is.type("function");
			}
		}
	//@ts-ignore
	)(fifty);

	export interface Exports {
		/**
		 * Converts an ECMAScript array into a Java array
		 */
		toJavaArray: any
	}

	export interface Exports {
		ErrorType: any
		toJsArray: any

		/**
		 * Adds a function to be run at VM shutdown. Note that under some scenarios (for example, a script executed without
		 * forking), this may not be at script exit.
		 *
		 * @param hook A function, which will be invoked with no arguments and the global object as `this`.
		 */
		addShutdownHook: (hook: () => void) => void
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.exports.Thread = fifty.test.Parent();

			fifty.tests.exports.Thread.object = fifty.test.Parent();
		}
	//@ts-ignore
	)(fifty);

	export interface Thread {
		/**
		 * Causes the calling thread to block and wait for this thread to terminate (either via the completion of the execution of
		 * the function or via timing out).
		 */
		join: () => void
	}

	(
		function(
			Packages: slime.jrunscript.Packages,
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;

			const module = internal.test.subject;

			fifty.tests.exports.Thread.object.join = function() {
				var listener = (function() {
					return {
						returned: 0,
						errored: 0,
						expired: 0,
						result: module.Thread.thisSynchronize(function(rv) {
							this.returned++;
						}),
						error: module.Thread.thisSynchronize(function(e) {
							this.errored++;
						}),
						timeout: module.Thread.thisSynchronize(function() {
							this.expired++;
						})
					};
				})();

				var MAX = 250;
				var COUNT = 5;

				var rnd = new Packages.java.util.Random();

				var random = function() {
					return rnd.nextDouble();
				}

				verify(listener).returned.is(0);
				verify(listener).errored.is(0);
				verify(listener).expired.is(0);

				var Thread = module.Thread;

				var all = [];

				for (var i=0; i<COUNT; i++) {
					(function(i) {
						var t = Thread.start({
							call: function() {
								Packages.java.lang.Thread.sleep(MAX * random() / 2);
								return i;
							},
							on: listener
						});
						all.push(t);
					})(i)
				}

				for (var i=0; i<COUNT; i++) {
					(function(i) {
						var t = Thread.start({
							call: function() {
								Packages.java.lang.Thread.sleep(MAX * random() / 2);
								throw new Error(String(i));
							},
							on: listener
						});
						all.push(t);
					})(i);
				}

				for (var i=0; i<COUNT; i++) {
					(function(i) {
						var t = Thread.start({
							call: function() {
								Packages.java.lang.Thread.sleep(MAX * (3 + random()));
								throw new Error(String("to" + i));
							},
							timeout: MAX,
							on: listener
						});
						all.push(t);
					})(i);
				}

				for (var i=0; i<all.length; i++) {
					all[i].join();
				}

				verify(listener).returned.is(COUNT);
				verify(listener).errored.is(COUNT);
				verify(listener).expired.is(COUNT);
				var engine = String(Packages.java.lang.System.getProperty("jsh.engine"));
				verify(engine,"Engine running").is(engine);
			}
		}
	//@ts-ignore
	)(Packages,fifty);


	export interface Exports {
		//	TODO	a comment in api.html claimed "(conditional; not implemented for Nashorn)" but I believe this is implemented
		//			for Nashorn
		Thread: thread.Exports
	}

	export namespace thread {
		export interface Exports {
			/**
			 * Starts a thread.
			 */
			start: {
				<T>(f: () => T ): Thread

				<T>(p: {
					/**
					 * A function. The function will be invoked with no arguments and an undefined `this` value; if a specific
					 * calling configuration is required, a wrapper function that provides this configuration is required.
					 */
					call: () => T

					/**
					 * (optional) A timeout, in milliseconds.
					 */
					timeout?: number


					/**
					 * (optional) Specifies a set of callbacks.
					 */
					on?: {
						/**
						 * (optional) A function invoked when the function executed by the thread returns.
						 *
						 * @param t The value returned by the function.
						 */
						result?: (t: T) => void

						/**
						 * (optional) A function invoked if the function executed by the thread throws an exception.
						 *
						 * @param e The JavaScript value thrown.
						 */
						error?: (e: any) => void

						/**
						 * (optional) A function invoked if the function executed by the thread times out. This function must do any
						 * cleanup desired to terminate the executing function; the function will otherwise continue executing in
						 * the background.
						 */
						timeout?: () => void
					}
				}): Thread
			}
		}

		(
			function(
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;
				const { subject } = internal.test;
				let count = 0;

				fifty.tests.exports.Thread.start = function() {
					var count = 0;
					verify(count).is(0);
					var thread = subject.Thread.start(function() {
						count++;
					});
					thread.join();
					verify(count).is(1);
				}
			}
		//@ts-ignore
		)(fifty);
	}

	export namespace thread {
		export interface Exports {
			/**
			 * Runs a function in a separate thread, but blocks the calling thread until the function completes or times out. If the
			 * function times out, an error will be thrown.
			 *
			 * @returns The value returned by the underlying function specified by `call`.
			 */
			run: <T>(
				p: {
					call: () => T

					/**
					 * (optional) A timeout, in milliseconds.
					 */
					timeout: number
				}
			) => T
		}

		(
			function(
				Packages: slime.jrunscript.Packages,
				fifty: slime.fifty.test.Kit
			) {
				const { verify, run } = fifty;
				const { subject } = internal.test;

				fifty.tests.exports.Thread.run = function() {
					var fn = function(result: number, sleep?: number) {
						return function() {
							if (sleep) Packages.java.lang.Thread.sleep(sleep);
							return result;
						}
					};

					var f_one = fn(1, 250);

					var one = subject.Thread.run({
						call: f_one,
						timeout: 500
					});
					verify(one).is(1);

					try {
						var tooLate = subject.Thread.run({
							call: f_one,
							timeout: 100
						});
						verify(false).is(true);
					} catch (e) {
						if (e instanceof Error) {
							verify(e).name.is("JavaThreadTimeoutError");
							verify(e).message.is("Timed out.");
						} else {
							verify("Error").is("Not Error");
						}
					}
				}
			}
		//@ts-ignore
		)(Packages,fifty);
	}

	export namespace thread {
		/**
		 * Represents a Java monitor that can be used for synchronization.
		 */
		export interface Monitor {
			/**
			 * Creates a function that waits on its parent monitor until a condition is true, and then executes an underlying
			 * function.
			 *
			 * @param p An object specifying the condition and function.
			 *
			 * @returns A function that can be invoked that will invoke `until` repeatedly and wait on the monitor if it returns
			 * `false`; when `until` returns `true`, `then` will be invoked and the return value from `then` returned.
			 */
			Waiter: <T>(p: {
				/**
				 * (optional; default returns `true`) A function that specifies whether the condition has been satisfied. The
				 * function will receive the `this` and arguments passed to the function by the caller.
				 *
				 * @returns `true` indicating the condition has been satisfied; `false` indicating it has not.
				 */
				until?: (...args: any[]) => boolean

				/**
				 * (optional; default does nothing) A function to execute when the condition has been satisfied. The function will
				 * receive the `this` and arguments passed to the function by the caller, and can return any value intended to be
				 * returned to the caller.
				 */
				then?: (...args: any[]) => T
			}) => () => T
		}

		export interface Exports {
			Monitor: new () => Monitor
		}

		(
			function(
				Packages: slime.jrunscript.Packages,
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;
				const module = internal.test.subject;

				const test = function(b: boolean) {
					verify(b).is(true);
				}

				fifty.tests.exports.Thread.Monitor = function() {
					if (module.Thread) {
						var lock = new module.Thread.Monitor();

						var count = 0;

						var waiter = function() {
							return lock.Waiter({
								//	TODO	make optional in API with this default implementation
								until: function() {
									return true;
								},
								then: function() {
									test(count == 0);
									count++;
									test(count == 1);
									Packages.java.lang.Thread.sleep(Packages.java.lang.Math.random() * 100);
									count--;
									test(count == 0);
//											jsh.shell.echo("Success.");
								}
							});
						}

						var waiters = [];
						for (var i=0; i<10; i++) {
							waiters.push(waiter());
						}

						var joiners = [];
						waiters.forEach(function(element) {
							//	jsh.shell.echo("Starting ...");
							var t = module.Thread.start({
								call: element,
								on: {
									result: function(o) {
										//	jsh.shell.echo("Finished.");
										test(true);
									},
									error: function(t) {
										//	jsh.shell.echo("Threw.");
										throw t;
									}
								}
							});
							joiners.push(t);
						});

						joiners.forEach(function(t) {
							t.join();
						});
					}
				}
			}
		//@ts-ignore
		)(Packages,fifty);
	}

	export namespace thread {
		export interface Exports {
			/**
			 * Creates a function whose execution synchronizes on the `this` object of its invocation.
			 *
			 * @param f A function which the returned function should execute.
			 *
			 * @returns A function that obtains the lock to its `this` object, executes the given function, and then releases the
			 * lock.
			 */
			thisSynchronize: <F extends (...args: any[]) => any>(f: F) => F
		}

		(
			function(
				Packages: slime.jrunscript.Packages,
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;
				const module = internal.test.subject;

				const test = function(b: boolean) {
					verify(b).is(true);
				};

				fifty.tests.exports.Thread.thisSynchronize = function() {
					if (module.Thread) {
						var f = function(x) {
							return 2*x;
						};

						var s = module.Thread.thisSynchronize(f);

						//	TODO	actually test synchronization

						test(s(2) == 4);
						test(s(4) == 8);

						var debug = function(s) {
//								Packages.java.lang.System.err.println(s);
						}

						var lock = new Packages.java.lang.Object();

						var finished = 0;

						var inner = Object.assign(function() {
							inner.count++;
							Packages.java.lang.Thread.sleep(100);
							inner.count--;
							finished++;
							this.notifyAll();
						}, { count: 0 });

						var nested = module.Thread.thisSynchronize(inner);

						var outer = Object.assign(function() {
							outer.count++;
							nested.call(lock);
							outer.count--;
						}, { count: 0 });

						var getCount = module.Thread.thisSynchronize(function() {
							return inner.count;
						});

						var threads = [];
						for (var i=0; i<10; i++) {
							threads.push(module.Thread.start({
								call: outer,
								on: new function() {
									this.returned = function(rv) {
										debug("outer = " + outer.count);
										test(getCount.call(lock) == 0);
									}

									this.threw = function(e) {
										debug("threw = " + e);
										throw e;
									}
								}
							}));
						}

						threads.forEach( function(thread) {
							thread.join();
						});

						test(finished == 10);
					}
				}
			}
		//@ts-ignore
		)(Packages,fifty);
	}

	export namespace thread {
		export interface Exports {
			Task: any
		}

		(
			function(
				Packages: slime.jrunscript.Packages,
				fifty: slime.fifty.test.Kit
			) {
				const { verify, run } = fifty;

				const module = internal.test.subject;

				fifty.tests.exports.Thread.Task = function() {
					run(function _1() {
						var monitor = new module.Thread.Monitor();
						var task = new module.Thread.Task({
							call: function() {
								return 2*2;
							}
						});
						var events = [];
						var finished: number;
						task(function(error,returned) {
							monitor.Waiter({
								until: function() {
									return true;
								},
								then: function() {
									events.push(function() {
										finished = returned;
									})
								}
							})();
						});
						while(!finished) {
							monitor.Waiter({
								until: function() {
									return Boolean(events.length);
								},
								then: function() {
									events.shift()();
								}
							})();
						}
						verify(finished).is(4);
					});

					run(function _2() {
						var scope = {
							$$api: void(0),
							monitor: void(0),
							A: void(0),
							B: void(0),
							C: void(0)
						};

						(
							function(scope) {
								var $$api = fifty.global.$api;
								// $jsapi.loader.eval("../../loader/$api.js", {
								// 	$slime: {
								// 		getRuntimeScript: function(path) {
								// 			return {
								// 				name: path,
								// 				js: $jsapi.loader.string("../../loader/" + path)
								// 			}
								// 		}
								// 	},
								// 	//	TODO	dubious; relies on $engine/$platform compatibility
								// 	$engine: $platform,
								// 	$export: function(value) {
								// 		$$api = value;
								// 	}
								// });
								scope.$$api = $$api;

								var monitor = new module.Thread.Monitor();

								scope.monitor = monitor;

								var Multithreaded = function(step) {
									var Event = function(f) {
										return function(error,returned) {
											monitor.Waiter({
												until: function() {
													return true;
												},
												then: function() {
													f();
												}
											})();
										}
									};

									return {
										toString: function() {
											return step.toString();
										},
										ready: function() {
											return step.ready();
										},
										task: new module.Thread.Task({
											call: Event(step.call)
										})
									};
								}

								scope.A = function(shared) {
									return Multithreaded({
										ready: function() {
											return true;
										},
										call: function() {
											shared.a = true;
										}
									});
								};
								scope.B = function(shared) {
									return Multithreaded({
										ready: function() {
											return shared.a;
										},
										call: function() {
											shared.b = true;
										}
									});
								};
								scope.C = function(shared) {
									return Multithreaded({
										toString: function() {
											return "C";
										},
										ready: function() {
											return false;
										},
										call: function() {
											throw new Error();
										}
									});
								};
							}
						)(scope);

						const { monitor, $$api, C, A, B } = scope;

						Packages.java.lang.System.err.println("Second test.");
						var Steps: () => {
							shared: {
								a: boolean
								b: boolean
							}
							c: any
							steps: any[]
							unready: any[]
							on: {
								unready: (e: any) => void
							}
						} = function() {
							var shared = { a: false, b: false };
							var unready = [];

							var c = new C(shared)

							return {
								shared: shared,
								c: c,
								steps: [new A(shared), new B(shared), c],
								unready: unready,
								on: {
									unready: function(e) {
										unready.push(e.detail);
									}
								}
							}
						};

						var steps = Steps();

						var task = $$api.threads.steps.Task(steps);

						var finished = false;

						task(monitor.Waiter({
							until: function() {
								return true;
							},
							then: function() {
								finished = true;
							}
						}));

						monitor.Waiter({
							until: function() {
								return finished;
							},
							then: function() {
							}
						})();

						verify(steps).shared.a.is(true);
						verify(steps).shared.b.is(true);
						verify(steps).unready.length.is(1);
						//	TODO	verify(unready[0]).ready.is(steps.c.ready) does not work because ready property of the
						//			verify object does not have is() method. Probably addressable in unit test framework.
						verify(steps).unready[0].is(steps.c);

						var ssteps = Steps();
						verify(ssteps).shared.a.is(false);

						var stask = $$api.threads.steps.Task(ssteps);

						stask();

						verify(ssteps).shared.a.is(true);
						verify(ssteps).shared.b.is(true);
						verify(ssteps).unready.length.is(1);
						if (ssteps.unready.length) {
							verify(ssteps).unready[0].is(ssteps.c);
						}
					})
				}
			}
		//@ts-ignore
		)(Packages,fifty);
	}

	export namespace thread {
		export interface Exports {
			map: <T,O extends Object,R>(
				array: T[],
				mapper: (this: O, item: T) => R,
				target?: O,
				p?: {
					callback: (p: {
						completed: number
						running: number
						index: number
						threw?: any
						returned?: any
					}) => void

					limit: number
				}
			) => R[]
		}

		(
			function(
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;
				const { jsh } = fifty.global;

				const module = internal.test.subject;

				fifty.tests.exports.Thread.map = function() {
					var array = [1,2,3];
					var doubled = module.Thread.map(
						array,
						function(element) {
							return element * 2;
						},
						null,
						{
							limit: 2,
							callback: function(result) {
								if (result.threw) {
									jsh.shell.console(result.index + "/" + result.threw.type + ": " + result.threw.message);
									jsh.shell.console(result.threw.stack);
								} else {
									jsh.shell.console(result.index + "/" + result.returned);
								}
							}
						}
					);
					verify(doubled)[0].is(2);
					verify(doubled)[1].is(4);
					verify(doubled)[2].is(6);
				}
			}
		//@ts-ignore
		)(fifty);
	}

	export namespace thread {
		export interface Exports {
			forkJoin: <T>(f: (() => T)[]) => T[]
		}

		(
			function(
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;

				const module = internal.test.subject;

				fifty.tests.exports.Thread.forkJoin = function() {
					var fork = [
						(function() { return 1; }),
						(function() { return 3; }),
						(function() { return 2; })
					];
					var result = module.Thread.forkJoin(fork);
					verify(result).length.is(3);
					verify(result)[0].is(1);
					verify(result)[1].is(3);
					verify(result)[2].is(2);
				}
			}
		//@ts-ignore
		)(fifty);
	}

	export namespace thread {
		(
			function(
				Packages: slime.jrunscript.Packages,
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;

				const module = internal.test.subject;

				const test = function(b) {
					verify(b).is(true);
				}

				fifty.tests.exports.Thread.jsapi = function() {
					if (module.Thread) {
						var sleeper = function(length) {
							return function() {
								Packages.java.lang.Thread.sleep(length);
							}
						}

						var f = function() {
							Packages.java.lang.Thread.sleep(100);
							return 1;
						};

						var Callbacks = function() {
							var result;

							return {
								result: function(v) {
									result = v;
								},
								error: function(t) {
									throw t;
								},
								timeout: function() {
									result = "Timed out.";
								},
								evaluate: function() {
									return result;
								},
								getResult: function() {
									return result;
								}
							};
						};

						var c1 = Callbacks();
						var t1 = module.Thread.start({
							call: f,
							timeout: 150,
							on: c1
						});
						t1.join();
						test(c1.evaluate() == 1);

						//	This test is highly suspect; it essentially hopes that the CPU scheduling happens as expected. Its
						//	chances of passage could be improved by using thread priorities for timeouts, which is probably a good
						//	idea anyway. But perhaps it needs to be re-designed.
						var c2 = Callbacks();
						var t2 = module.Thread.start({
							call: sleeper(250),
							timeout: 50,
							on: c2
						});
						t2.join();
						//@ts-ignore
						verify(c2).getResult().is("Timed out.");
					}
				}
			}
		//@ts-ignore
		)(Packages,fifty);
	}

	export namespace thread {
		export interface Exports {
			setContextClassLoader: any

			/**
			 * Causes the currently running thread to sleep for the given number of milliseconds.
			 */
			sleep: (milliseconds: number) => void
		}
	}

	export interface Exports {
		/**
		 * Invokes a method on a Java object via reflection. Ordinarily, Java methods can simply be invoked with JavaScript
		 * semantics using a LiveConnect implementation. The `invoke` function provides the ability to invoke methods that are not
		 * accessible (for example, those that are private, package or protected).
		 *
		 * @returns The value returned by the Java method, or `undefined` for `void` methods.
		 */
		//	As of this writing, used only in tests; are there use cases for it?
		invoke: (p: {
			/**
			 * The Java object on which to invoke the method. May be omitted for `static` methods.
			 */
			target?: slime.jrunscript.native.java.lang.Object
			/**
			 * An object specifying the Java method to invoke.
			 */
			method: {
				/**
				 * The name of the method to invoke.
				 */
				name: string

				/**
				 * (optional; defaults to a method with no parameters) The list of parameter types in the signature of the method to
				 * invoke.
				 */
				parameterTypes?: JavaClass[]

				/**
				 * The declaring class of the method to be invoked. If the method is declared in the concrete class of the object,
				 * this value may be omitted.
				 */
				class?: JavaClass
			}

			/**
			 * (may be omitted if the Java method takes no arguments) The arguments with which to invoke the method.
			 */
			arguments?: (slime.jrunscript.native.java.lang.Object | boolean)[]
		}) => slime.jrunscript.native.java.lang.Object
	}

	(
		function(
			Packages: slime.jrunscript.Packages,
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;

			const module = internal.test.subject;

			fifty.tests.exports.invoke = function() {
				var directVersion = String(Packages.java.lang.System.getProperty("java.version"));

				var _version = module.invoke({
					method: {
						name: "getProperty",
						parameterTypes: [Packages.java.lang.String],
						class: Packages.java.lang.System
					},
					arguments: [new Packages.java.lang.String("java.version")]
				});
				var version = String(_version);
				verify(version).is(directVersion);

				var string = new Packages.java.lang.String("Hello");
				var _toString = module.invoke({
					target: string,
					method: {
						name: "toString"
					}
				});
				verify(String(_toString)).is("Hello");

				var _void = module.invoke({
					method: {
						name: "gc",
						class: Packages.java.lang.System
					}
				});
				verify(_void).is.type("undefined");

				var _v2 = Packages.java.lang.System.gc();
				verify(_v2).is.type("undefined");
			}
		}
	//@ts-ignore
	)(Packages,fifty);


	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.suite = function() {
				fifty.run(fifty.tests.exports);
			}
		}
	//@ts-ignore
	)(fifty);

	export type Script = slime.loader.Script<Context,Exports>
}
