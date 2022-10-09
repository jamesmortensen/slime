//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jrunscript.shell {
	export interface World {
		question: slime.$api.fp.world.Question<slime.jrunscript.shell.run.Invocation, slime.jrunscript.shell.run.AskEvents, slime.jrunscript.shell.run.Exit>
		action: slime.$api.fp.world.Action<slime.jrunscript.shell.run.Invocation, slime.jrunscript.shell.run.TellEvents>
		start: slime.$api.fp.world.Question<run.Invocation,slime.jrunscript.shell.run.TellEvents,slime.jrunscript.shell.run.world.Subprocess>
		run: slime.$api.fp.world.old.Action<run.Invocation,run.TellEvents>
	}
}

namespace slime.jrunscript.shell.run {
	export type Line = {
		line: string
	}

	export interface AskEvents {
		start: {
			pid: number
			kill: () => void
		}

		stdout: Line

		stderr: Line
	}

	//	TODO	right now we only capture output of type string; we could capture binary also
	export interface Output {
		output?: string
		error?: string
	}

	export interface Exit {
		status: number
		stdio?: Output
	}

	export interface TellEvents extends AskEvents {
		exit: Exit
	}

	export namespace world {
		export interface Subprocess {
			pid: number
			kill: () => void
			run: () => Exit
		}
	}

	export interface World {
		start: slime.jrunscript.shell.World["start"]
	}

	/**
	 * Represents the result of a mock shell invocation. Currently, if line-based output is provided for a stream, the
	 * string given as part of `exit` is ignored.
	 *
	 * @experimental
	 */
	export interface Mock {
		/**
		 * A mock PID to use; defaults to `0`.
		 */
		pid?: number

		/**
		 * Lines of output generated by the invocation. Output can also be provided for a stream by the properties of `exit.stdio`
		 * if line-based I/O is not needed (or the output is less than one line).
		 */
		lines?: ({ stdout: string } | { stderr: string })[]

		exit: {
			status: number
			/**
			 * The output for the process. Currently, if line-based output is provided for a stream, the value for that strean
			 * is ignored.
			 */
			stdio?: {
				output?: string
				error?: string
			}
		}
	}
}

namespace slime.jrunscript.shell.internal.run {
	export interface Context {
		api: {
			java: slime.jrunscript.host.Exports
			io: slime.jrunscript.io.Exports
			file: slime.jrunscript.file.Exports
		}
		world?: slime.jrunscript.shell.run.World
	}

	export interface OutputDestination {
		stream: Omit<slime.jrunscript.runtime.io.OutputStream, "close">
		close: () => void
		readText?: () => string
	}

	/**
	 * Extends the standard shell `Stdio` type to make all fields required and add a `close()` method that closes the streams and
	 * returns the output of the program.
	 */
	export type Stdio = Required<slime.jrunscript.shell.invocation.Stdio> & { close: () => slime.jrunscript.shell.run.Output }

	export interface Listener {
		close: () => void
	}

	export namespace java {
		export interface Context {
			stdio: internal.run.Stdio
			environment: slime.jrunscript.host.Environment
			directory: slime.jrunscript.file.Directory
		}

		export interface Configuration {
			command: string
			arguments: string[]
		}
	}

	export namespace test {
		export const subject: Exports = (function(fifty: slime.fifty.test.Kit) {
			var script: Script = fifty.$loader.script("run.js");
			return script({
				api: {
					java: fifty.global.jsh.java,
					io: fifty.global.jsh.io,
					file: fifty.global.jsh.file
				}
			});
		//@ts-ignore
		})(fifty);

		export const ls: shell.run.Invocation = (function(fifty: slime.fifty.test.Kit) {
			return {
				context: {
					environment: fifty.global.jsh.shell.environment,
					directory: fifty.jsh.file.object.getRelativePath(".").toString(),
					stdio: {
						input: null,
						output: "string",
						error: fifty.global.jsh.shell.stdio.error
					}
				},
				configuration: {
					command: "ls",
					arguments: []
				}
			};
		//@ts-ignore
		})(fifty);
	}

	export interface Exports {
		question: slime.jrunscript.shell.World["question"]
		action: slime.jrunscript.shell.World["action"]
		world: slime.jrunscript.shell.run.World
		run: slime.jrunscript.shell.World["run"]
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;
			const { $api } = fifty.global;

			fifty.tests.question = $api.Function.pipe(
				$api.Function.world.input(
					test.subject.question(test.ls)
				),
				function(exit) {
					verify(exit).status.is(0);
					var listing = exit.stdio.output.split("\n");
					verify(listing).evaluate(function(array) { return array.indexOf("run.fifty.ts") != -1; }).is(true);
					verify(listing).evaluate(function(array) { return array.indexOf("foobar.fifty.ts") != -1; }).is(false);
				}
			)
		}
	//@ts-ignore
	)(fifty);

	export interface Exports {
		run: slime.$api.fp.world.old.Action<slime.jrunscript.shell.run.Invocation,slime.jrunscript.shell.run.TellEvents>
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			const subject = test.subject;
			const { verify, run } = fifty;
			const { jsh } = fifty.global;

			fifty.tests.run = function() {
				run(function() {
					var tell = subject.run(test.ls);

					tell({
						exit: function(e) {
							var listing = e.detail.stdio.output.split("\n");
							listing = listing.slice(0, listing.length-1);
							fifty.verify(e).detail.status.is(0);
							fifty.verify(listing).evaluate(function(array) { return array.indexOf("run.fifty.ts") != -1; }).is(true);
						}
					})
				});

				run(function pwdIsShellWorkingDirectoryIfUnspecified() {
					var PWD = jsh.shell.PWD.pathname.toString();
					var tell = subject.run({
						context: {
							environment: jsh.shell.environment,
							stdio: {
								input: null,
								output: "string",
								error: "line"
							},
							directory: void(0)
						},
						configuration: {
							command: "pwd",
							arguments: []
						}
					});
					tell({
						exit: function(e) {
							verify(e.detail.stdio.output).is(PWD + "\n");
						}
					});
				});
			}
		}
	//@ts-ignore
	)(fifty);

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			const { $api } = fifty.global;
			const subject = fifty.global.jsh.shell;

			fifty.tests.world = function() {
				var directory = fifty.jsh.file.object.getRelativePath(".").directory;

				if (fifty.global.jsh.shell.PATH.getCommand("ls")) {
					var ls = subject.Invocation.create({
						command: "ls",
						directory: directory.toString(),
						stdio: {
							output: "line",
							error: "line"
						}
					});
					var tell = subject.world.run(ls);
					var captor = fifty.$api.Events.Captor({
						start: void(0),
						stdout: void(0),
						stderr: void(0),
						exit: void(0)
					});
					tell(captor.handler);
					fifty.global.jsh.shell.console(JSON.stringify(captor.events,void(0),4));

					var killed = subject.Invocation.create({
						command: "sleep",
						arguments: ["1"],
						directory: directory.toString(),
						stdio: {
							output: "line",
							error: "line"
						}
					});
					var events = [];
					var subprocess;
					var killtell = subject.world.run(killed);
					killtell({
						start: function(e) {
							events.push(e);
							subprocess = e.detail;
							subprocess.kill();
						},
						stdout: function(e) {
							events.push(e);
						},
						stderr: function(e) {
							events.push(e);
						},
						exit: function(e) {
							events.push(e);
						}
					});
					fifty.global.jsh.shell.console(JSON.stringify(events,void(0),4));
				}
			}

			fifty.tests.sandbox = function() {
				fifty.run(function checkErrorForBogusInvocation() {
					var bogus = subject.Invocation.create({
						command: "foobarbaz"
					});

					var tell = subject.world.run(bogus);
					fifty.verify(tell).evaluate(function(f) { return f(); }).threw.type(Error);
					fifty.verify(tell).evaluate(function(f) { return f(); }).threw.evaluate.property("name").is("JavaException");
				});

				var directory = fifty.jsh.file.object.getRelativePath(".").directory;

				if (fifty.global.jsh.shell.PATH.getCommand("ls")) {
					var ls = subject.Invocation.create({
						command: "ls",
						directory: directory.toString()
					});
					var status: number;
					subject.world.run(ls)({
						exit: function(e) {
							status = e.detail.status;
						}
					});
					fifty.verify(status).is(0);

					var lsIllegalArgumentStatus = (function() {
						if (fifty.global.jsh.shell.os.name == "Mac OS X") return 1;
						if (fifty.global.jsh.shell.os.name == "Linux") return 2;
					})();

					fifty.run(function checkExitStatus() {
						debugger;
						var lserror = $api.Object.compose(ls, {
							configuration: $api.Object.compose(ls.configuration, {
								arguments: ["--foo"]
							})
						});
						var status: number;
						subject.world.run(lserror)({
							exit: function(e) {
								status = e.detail.status;
							}
						});
						fifty.verify(status).is(lsIllegalArgumentStatus);
					});

					fifty.run(function checkErrorOnNonZero() {
						var lserror = $api.Object.compose(ls, {
							configuration: $api.Object.compose(ls.configuration, {
								arguments: ["--foo"]
							})
						});
						var tell = subject.world.run(lserror);
						//	TODO	this listener functionality was previously provided by default; will want to improve API over
						//			time so that it's harder to accidentally ignore non-zero exit status
						var listener: slime.$api.events.Handler<slime.jrunscript.shell.run.TellEvents> = {
							exit: function(e) {
								if (e.detail.status != 0) {
									throw new Error("Non-zero exit status: " + e.detail.status);
								}
							}
						}
						fifty.verify(tell).evaluate(function(f) { return f(listener); }).threw.type(Error);
						fifty.verify(tell).evaluate(function(f) { return f(listener); }).threw.message.is("Non-zero exit status: " + lsIllegalArgumentStatus);
					});
				}

				var isDirectory = function(directory) {
					return Object.assign(function(p) {
						return directory.toString() == p.toString();
					}, {
						toString: function() {
							return "is directory " + directory;
						}
					})
				};

				var it = {
					is: function(value) {
						return function(p) {
							return p === value;
						}
					}
				}

				fifty.run(function Invocation() {
					var directory = fifty.jsh.file.object.getRelativePath(".").directory;

					//	TODO	test for missing command

					fifty.run(function defaults() {
						var argument: shell.invocation.Argument = {
							command: "ls"
						};
						var invocation = fifty.global.jsh.shell.Invocation.create(argument);
						fifty.verify(invocation, "invocation", function(its) {
							its.configuration.command.is("ls");
							its.configuration.arguments.is.type("object");
							its.configuration.arguments.length.is(0);
							//	TODO	environment
							its.context.directory.evaluate(isDirectory(fifty.global.jsh.shell.PWD)).is(true);
							its.context.stdio.input.evaluate(it.is(null)).is(true);
							//	TODO	appears to work in latest TypeScript
							//@ts-ignore
							its.context.stdio.output.evaluate(it.is(fifty.global.jsh.shell.stdio.output)).is(true);
							//	TODO	appears to work in latest TypeScript
							//@ts-ignore
							its.context.stdio.error.evaluate(it.is(fifty.global.jsh.shell.stdio.error)).is(true);
						});
					});

					fifty.run(function specified() {
						var argument: shell.invocation.Argument = {
							command: fifty.global.jsh.file.Pathname("/bin/ls"),
							arguments: [directory.getRelativePath("invocation.fifty.ts")],
							//	TODO	environment
							directory: directory.toString()
						};
						var invocation = fifty.global.jsh.shell.Invocation.create(argument);
						fifty.verify(invocation, "invocation", function(its) {
							its.configuration.command.is("/bin/ls");
							its.configuration.arguments.is.type("object");
							its.configuration.arguments.length.is(1);
							its.configuration.arguments[0].is(directory.getRelativePath("invocation.fifty.ts").toString());
							its.context.directory.evaluate(isDirectory(directory)).is(true);
						});
					});
				});
			}
		}
	//@ts-ignore
	)($fifty);

	export interface Exports {
		mock: {
			run: shell.World["mock"]

			tell: shell.Exports["Tell"]["mock"]
		}

		old: {
			buildStdio: (p: slime.jrunscript.shell.run.StdioConfiguration) => (events: slime.$api.Events<slime.jrunscript.shell.run.TellEvents>) => Stdio
			run: (
				context: slime.jrunscript.shell.run.Context,
				configuration: slime.jrunscript.shell.run.Configuration,
				module: {
					events: any
				},
				events: slime.jrunscript.shell.run.old.Events,
				p: slime.jrunscript.shell.run.old.Argument,
				invocation: slime.jrunscript.shell.run.old.Argument,
				isLineListener: (p: slime.jrunscript.shell.invocation.old.OutputStreamConfiguration) => p is slime.jrunscript.shell.invocation.old.OutputStreamToLines
			) => slime.jrunscript.shell.run.Exit
		}
	}

	export type Script = slime.loader.Script<Context,Exports>

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.suite = function() {
				fifty.run(fifty.tests.question);
				fifty.run(fifty.tests.run);
				fifty.run(fifty.tests.sandbox);
			}
		}
	//@ts-ignore
	)(fifty);
}
