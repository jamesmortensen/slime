//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jsh.script {
	export namespace test {
		/**
		 * Represents the module inside the Fifty test suite.
		 */
		export const subject: Exports = (function(fifty: slime.fifty.test.Kit) {
			const jsh = fifty.global.jsh;
			const subject = jsh.script;
			return subject;
		//@ts-ignore
		})(fifty);
	}

	export namespace cli {
		export interface Invocation<T> {
			options: T
			arguments: string[]
		}

		export interface Processor<T,R> {
			(invocation: Invocation<T>): Invocation<R>
		}

		/**
		 * A process that may return a numeric exit status that can be used as a process exit status, or may complete normally, or
		 * may throw an uncaught exception.
		 */
		export interface Command<T> {
			(invocation: Invocation<T>): number | void
		}

		export interface Commands<T> {
			[x: string]: Commands<T> | Command<T>
		}

		export interface Application {
			/**
			 * @throws
			 */
			run: (args: string[]) => number | void
		}

		export interface Descriptor<T> {
			options?: Processor<{},T>
			commands: Commands<T>
		}

		export namespace error {
			export interface NoTargetProvided extends Error {
			}

			export interface TargetNotFound extends Error {
				command: string
			}

			export interface TargetNotFunction extends Error {
				command: string
				target: any
			}
		}
	}

	export interface Exports {
		cli: cli.Exports
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.cli = fifty.test.Parent();
		}
	//@ts-ignore
	)(fifty);


	export namespace cli {
		export interface Exports {
			Commands: {
				getCommand: <T>(commands: slime.jsh.script.cli.Commands<T>, argument: string) => slime.jsh.script.cli.Command<T> | slime.jsh.script.cli.error.TargetNotFound | slime.jsh.script.cli.error.TargetNotFunction
			}
		}

		(
			function(
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;

				var hello = function(p) {
				};

				fifty.tests.cli.Commands = {
					getCommand: function() {
						var commands: Commands<{}> = {
							hello: hello
						};

						var one = test.subject.cli.Commands.getCommand(commands, "hello") as slime.jsh.script.cli.Command<{}>;
						verify(one).is(hello);
					}
				}
			}
		//@ts-ignore
		)(fifty);

	}

	export namespace cli {
		type OptionParser<T> = <O extends object,N extends keyof any>(c: { longname: N, default?: T })
			=> (i: cli.Invocation<O>)
			=> cli.Invocation<O & { [n in N]: T }>

		export interface Exports {
			option: {
				string: OptionParser<string>
				boolean: OptionParser<boolean>
				number: OptionParser<number>
				pathname: OptionParser<slime.jrunscript.file.Pathname>

				array: <T,R>(c: { longname: string, value: (s: string) => any }) => cli.Processor<T,R>
			}
		}

		(
			function(
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;
				const { $api } = fifty.global;

				fifty.tests.cli.option = function() {
					const subject = test.subject;

					var invoked = $api.Function.result(
						{
							options: {},
							arguments: ["--foo", "bar", "--baz", 42]
						},
						$api.Function.pipe(
							subject.cli.option.string({ longname: "foo" }),
							subject.cli.option.number({ longname: "baz" })
						)
					);
					verify(invoked).options.foo.is("bar");
					verify(invoked).options.baz.is(42);

					var trial = function(p: cli.Processor<any,any>, args: string[]) {
						return p({
							options: {},
							arguments: args
						});
					}

					fifty.run(function string() {
						var one = trial(subject.cli.option.string({ longname: "a" }), []);
						var two = trial(subject.cli.option.string({ longname: "a" }), ["--a", "foo"]);

						fifty.verify(one).options.evaluate.property("a").is(void(0));
						fifty.verify(two).options.evaluate.property("a").is("foo");
					});

					//	TODO	number is tested below in defaults, but not on its own

					//	TODO	pathname is not tested explicitly

					fifty.run(function defaults() {
						var noDefault = subject.cli.option.number({ longname: "a" });
						var withDefault = subject.cli.option.number({ longname: "a", default: 2 });

						var one = trial(noDefault, []);
						var two = trial(noDefault, ["--a", "1"]);
						var three = trial(withDefault, []);
						var four = trial(withDefault, ["--a", "1"]);

						fifty.verify(one).options.evaluate.property("a").is(void(0));
						fifty.verify(two).options.evaluate.property("a").is(1);
						fifty.verify(three).options.evaluate.property("a").is(2);
						fifty.verify(four).options.evaluate.property("a").is(1);
					});

					var invocation: cli.Invocation<{ a: string, b: number[], c: string }> = {
						options: {
							a: void(0),
							b: [],
							c: void(0)
						},
						arguments: ["--a", "A", "--b", "1", "--b", "3", "--c", "C"]
					};
					fifty.verify(invocation).options.b.length.is(0);
					var processor: cli.Processor<{ a: string, b: number[], c: string }, { a: string, b: number[], c: string }> = subject.cli.option.array({
						longname: "b",
						value: Number
					});
					var after: cli.Invocation<{ a: string, b: number[], c: string }> = processor(invocation);
					fifty.verify(after).options.b.length.is(2);
					fifty.verify(after).options.b[0].is(1);
					fifty.verify(after).options.b[1].is(3);
					fifty.verify(after).arguments[0].is("--a");
					fifty.verify(after).arguments[1].is("A");
					fifty.verify(after).arguments[2].is("--c");
					fifty.verify(after).arguments[3].is("C");
				};

				//	TODO	Remove or incorporate the below tests harvested when the jsh.wf CLI handling was removed

				// (
				// 	function(
				// 		fifty: slime.fifty.test.Kit
				// 	) {
				// 		const { verify } = fifty;
				// 		const { jsh } = fifty.global;

				// 		fifty.tests.exports.cli = function() {
				// 			var mockjsh = {
				// 				script: {
				// 					arguments: ["--a", "aaa", "--b", "--c", "c"]
				// 				},
				// 				file: jsh.file,
				// 				shell: jsh.shell,
				// 				ui: jsh.ui,
				// 				tools: jsh.tools
				// 			};
				// 			var mock = fifty.jsh.plugin.mock({
				// 				jsh: mockjsh
				// 			});
				// 			var plugin: Exports = mock.jsh.wf;
				// 			if (!plugin) {
				// 				throw new TypeError("No jsh.wf loaded.");
				// 			}
				// 			const module = plugin;

				// 			(function() {
				// 				var invocation = {
				// 					options: {},
				// 					arguments: ["--foo", "bar"]
				// 				};
				// 				module.cli.$f.option.string({
				// 					longname: "baz"
				// 				})(invocation);
				// 				verify(invocation).options.evaluate.property("foo").is(void(0));
				// 				verify(invocation).arguments.length.is(2);
				// 			})();

				// 			(function() {
				// 				var invocation = {
				// 					options: {},
				// 					arguments: ["--foo", "bar"]
				// 				};
				// 				module.cli.$f.option.string({
				// 					longname: "foo"
				// 				})(invocation);
				// 				verify(invocation).options.evaluate.property("foo").is("bar");
				// 				verify(invocation).arguments.length.is(0);
				// 			})();

				// 			(function() {
				// 				var invocation = {
				// 					options: {
				// 						baz: false
				// 					},
				// 					arguments: ["--baz", "--bizzy"]
				// 				};
				// 				module.cli.$f.option.boolean({
				// 					longname: "baz"
				// 				})(invocation);
				// 				verify(invocation).options.baz.is(true);
				// 				verify(invocation).options.evaluate.property("bizzy").is(void(0));
				// 				verify(invocation).arguments.length.is(1);
				// 				verify(invocation).arguments[0].is("--bizzy");
				// 			})();

				// 			(function() {
				// 				var invocation: { arguments: string[], options: { a: string, b: boolean }} = <{ arguments: string[], options: { a: string, b: boolean }}>module.cli.invocation(
				// 					//	TODO	should module.$f.option.string("a") work?
				// 					module.cli.$f.option.string({ longname: "a" }),
				// 					module.cli.$f.option.boolean({ longname: "b" }),
				// 					module.cli.$f.option.string({ longname: "aa" }),
				// 					module.cli.$f.option.boolean({ longname: "bb" })
				// 				);
				// 				verify(invocation).arguments.length.is(2);
				// 				verify(invocation).arguments[0] == "--c";
				// 				verify(invocation).arguments[1] == "c";
				// 				verify(invocation).options.a.is("aaa");
				// 				verify(invocation).options.b.is(true);
				// 				verify(invocation).options.evaluate.property("aa").is(void(0));
				// 				verify(invocation).options.evaluate.property("bb").is(void(0));
				// 			})();
				// 		}
				// 	}
				// //@ts-ignore
				// )(fifty);
			}
		//@ts-ignore
		)(fifty);

	}

	export namespace cli {
		export interface Exports {
			error: {
				NoTargetProvided: $api.error.Type<cli.error.NoTargetProvided>
				TargetNotFound: $api.error.Type<cli.error.TargetNotFound>
				TargetNotFunction: $api.error.Type<cli.error.TargetNotFunction>
			}

			parser: {
				pathname: (argument: string) => slime.jrunscript.file.Pathname
			}

			/**
			 * Parses the `jsh` shell's arguments using the given {@link Processor}, returning the result of the processing.
			 */
			invocation: <T,R>(processor: cli.Processor<T,R>) => cli.Invocation<R>

			/**
			 * Given a {@link Descriptor} implementing the application's global options and commands, returns an object capable of
			 * invoking a {@link Command} with an appropriate {@link Invocation}. Options provided by the `Descriptor` will be processed into
			 * an `Invocation`,
			 * and the first remaining argument will be interpreted as a command name. If the command name exists and is a function,
			 * it will be invoked with the {@link Invocation}.
			 */
			Application: (p: cli.Descriptor<any>) => cli.Application

			/**
			 * Executes the program with the given descriptor inside this shell, with the arguments of the shell, and exits the
			 * shell with the exit status indicated by the {@link Command}. If the `Command` returns a numeric exit status, it is
			 * used; otherwise, finishing execution successfully exits with 0 exit status and an uncaught exception exits with
			 * status 1.
			 */
			wrap: (descriptor: cli.Descriptor<any>) => void
		}
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.cli.invocation = function() {
				const subject = test.subject;

				var parser = fifty.$api.Function.pipe(
					subject.cli.option.string({ longname: "foo" })
				);
				var was = fifty.global.jsh.unit.$slime;
				var mocked = fifty.jsh.plugin.mock({
					jsh: fifty.global.jsh,
					$slime: Object.assign({}, was, {
						getPackaged: function() { return null; },
						/** @return { slime.jrunscript.native.inonit.script.jsh.Shell.Invocation } */
						getInvocation: function() {
							return {
								getScript: function() {
									return was.getInvocation().getScript();
								},
								getArguments: function() {
									return ["--foo", "bar"]
								}
							};
						}
					})
				});
				var result: { options: { foo: string }, arguments: string[] } = mocked.jsh.script.cli.invocation(parser);
				fifty.verify(result).options.foo.is("bar");
				fifty.verify(result).arguments.length.is(0);
			};

			fifty.tests.cli.run = function() {
				const $api = fifty.$api;
				const subject = test.subject;
				var was: cli.Invocation<any>;
				var invocationWas = function(invocation: cli.Invocation<any>) {
					was = invocation;
				}
				fifty.verify(subject).cli.Application({
					options: subject.cli.option.string({ longname: "global" }),
					commands: {
						universe: $api.Function.pipe(
							subject.cli.option.string({ longname: "command" }),
							function(invocation) {
								invocationWas(invocation);
								return 42;
							}
						)
					}
				}).evaluate(function(application) {
					return Number(application.run(["--global", "foo", "universe", "--command", "bar"]));
				}).is(42);
				fifty.verify(was).options.evaluate.property("global").is("foo");
				fifty.verify(was).options.evaluate.property("command").is("bar");

				fifty.verify(subject).cli.Application({
					commands: {
						foo: function nothing(){}
					}
				}).run(["foo"]).is.type("undefined");

				fifty.verify(subject).cli.Application({
					commands: {
						foo: function error() {
							throw new Error();
						}
					}
				}).evaluate(function(application) {
					return application.run(["foo"]);
				}).threw.type(Error);
			};

			fifty.tests.cli.wrap = function() {
				const $api = fifty.$api;
				var result: { status: number } = fifty.global.jsh.shell.jsh({
					shell: fifty.global.jsh.shell.jsh.src,
					script: fifty.jsh.file.object.getRelativePath("test/cli.jsh.js").file,
					arguments: ["status"],
					evaluate: $api.Function.identity
				});
				fifty.verify(result).status.is(0);

				result = fifty.global.jsh.shell.jsh({
					shell: fifty.global.jsh.shell.jsh.src,
					script: fifty.jsh.file.object.getRelativePath("test/cli.jsh.js").file,
					arguments: ["status", "42"],
					evaluate: $api.Function.identity
				});
				fifty.verify(result).status.is(42);

				result = fifty.global.jsh.shell.jsh({
					shell: fifty.global.jsh.shell.jsh.src,
					script: fifty.jsh.file.object.getRelativePath("test/cli.jsh.js").file,
					arguments: [],
					evaluate: $api.Function.identity
				});
				fifty.verify(result).status.is(1);
			};
		}
	//@ts-ignore
	)(fifty);

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.suite = function() {
				fifty.run(fifty.tests.cli);
			}
		}
	//@ts-ignore
	)(fifty);

	export interface Exports {
		arguments: string[]
		getopts: Function & { UNEXPECTED_OPTION_PARSER: any, ARRAY: any, parser: { Pathname: (s: string) => slime.jrunscript.file.Pathname } }
		file?: slime.jrunscript.file.File
		script?: any
		/** @deprecated */
		pathname: any
		/** @deprecated */
		url?: any
		/** @deprecated */
		addClasses: any
		getRelativePath: any
		Application: any
		loader: slime.Loader
		Loader?: any
	}
}
