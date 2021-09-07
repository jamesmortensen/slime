//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jrunscript.git {
	export interface Commit {
		names: string[],
		commit: { hash: string },
		author: { name: string, email: string, date: any },
		committer: { name: string, email: string, date: any },
		subject: string
	}

	export interface Branch {
		/**
		 * The name of this branch. Can be `null` if this "branch" is a detached HEAD.
		 */
		name: string
		current: boolean
		commit: Commit
	}

	interface Daemon {
		port: number
		basePath?: slime.jrunscript.file.Pathname
		kill: () => void
	}

	export interface Installation {
		daemon: (p: {
			port?: number
			basePath?: slime.jrunscript.file.Pathname
			exportAll?: boolean
		}) => Daemon

		Repository: {
			(p: { directory: slime.jrunscript.file.Directory }): slime.jrunscript.git.repository.Local
			new (p: { directory: slime.jrunscript.file.Directory }): slime.jrunscript.git.repository.Local
			(p: { local: slime.jrunscript.file.Directory }): slime.jrunscript.git.repository.Local
			new (p: { local: slime.jrunscript.file.Directory }): slime.jrunscript.git.repository.Local
			(p: { remote: string }): slime.jrunscript.git.Repository
			new (p: { remote: string }): slime.jrunscript.git.Repository
		}

		//	Uses Object.assign for rhino/shell run(), so should cross-check with those arguments
		execute: (m: {
			config?: any
			command: string,
			arguments?: string[]
			environment?: any
			directory?: slime.jrunscript.file.Directory
		}) => void
	}

	export interface Repository {
		reference: string,
		clone: (argument: repository.argument & {
			to: slime.jrunscript.file.Pathname,
			recurseSubmodules?: boolean
		}, events?: object ) => slime.jrunscript.git.repository.Local
	}

	export interface Submodule {
		/**
		 * The logical name of the submodule, as it is referenced in configuration entries.
		 */
		name: string

		/**
		 * The path of the submodule within its parent.
		 */
		path: string

		/**
		 * The branch the submodule is set up to track, if it is set up to track one.
		 */
		branch?: string

		repository: repository.Local
		commit: Commit
	}

	export namespace repository {
		export interface argument {
			config?: { [x: string]: string }
			credentialHelper?: string
			credentialHelpers?: string[]
			directory?: slime.jrunscript.file.Directory
		}

		export interface Local extends slime.jrunscript.git.Repository {
			directory: slime.jrunscript.file.Directory

			add: any
			rm: (p: { path: string }, events?: $api.events.Function.Receiver) => void

			branch: {
				(p: {
					delete: string
					force?: boolean
				}): void

				(p?: {
					remotes?: boolean
					/** @deprecated */
					remote?: boolean
					all?: boolean
				}): slime.jrunscript.git.Branch[]

				(p: {
					old: boolean
				}): slime.jrunscript.git.Branch

				(p: {
					name: string
					startPoint?: string
					force?: boolean
				}): void
			}

			show: (p: { object: string}  ) => Commit

			fetch: (p: argument & {
				all?: boolean
				prune?: boolean
				recurseSubmodules?: boolean
				stdio?: any
			}, events?: $api.events.Function.Receiver) => void

			merge: (p: {
				name: string
				noCommit?: boolean
				noFf?: boolean
				ffOnly?: boolean
				stdio?: any
			}) => void

			checkout: (p: { branch: string, stdio?: any  }) => void

			remote: ( () => void ) & { getUrl: ({ name: string }) => string },
			stash: any,
			push: (p?: {
				delete?: boolean
				setUpstream?: string
				all?: boolean
				repository?: string
				refspec?: string

				config?: any
				environment?: any
			}) => void,
			mergeBase: (p: { commits: string[] }) => Commit
			submodule: {
				/**
				 * Returns a list of submodules for this repository.
				 */
				(p?: { cached?: boolean }): Submodule[]

				add: (p: {
					repository: slime.jrunscript.git.Repository
					path: string
					name?: string
					branch?: string
				}) => slime.jrunscript.git.repository.Local

				update: (p: argument & {
					init?: boolean,
					recursive?: boolean
				}) => void

				deinit: (p: argument & {
					force?: boolean
					path: string
				}) => void
			}

			execute: (p: {
				command: string
				arguments?: string[]
				environment?: object,
				directory?: slime.jrunscript.file.Directory
			}) => any

			commit: (p: {
				all?: boolean
				noVerify?: boolean
				message: string
				author?: string
			}, events?: any) => any
		}
	}

	export namespace internal {
		export interface Environment {
			[x: string]: string
		}

		export interface InvocationConfiguration<T> {
			arguments?: (p: T) => $api.fp.impure.Updater<string[]>
			environment?: (p: T) => $api.fp.impure.Updater<Environment>,
			createReturnValue?: (p: T) => (result: Result) => any
		}

		export interface GitCommand<T> {
			name: string
			configure: <S extends T>(p: T) => InvocationConfiguration<S>
		}

		export interface Result {
			output: {
				stdout: string[]
				stderr: string[]
			}

			//	TODO	this should be the datatype returned by rhino/shell.run(), which is currently not declared
			result: {
				status: number
			}
		}

		interface Command {
			name: string
		}
	}

	export interface Context {
		program: slime.jrunscript.file.File
		api: {
			js: any
			java: any
			shell: slime.jrunscript.shell.Exports
			Error: any
			time: slime.time.Exports
		}
		environment: any
		console: any
	}

	export interface Exports {
		Installation: (environment: {
			program: slime.jrunscript.file.File
		}) => slime.jrunscript.git.Installation

		credentialHelper: any
		installation: slime.jrunscript.git.Installation
		daemon: slime.jrunscript.git.Installation["daemon"]
		Repository: slime.jrunscript.git.Installation["Repository"]
		init: slime.jrunscript.git.Installation["init"]
		execute: slime.jrunscript.git.Installation["execute"]
		install: Function & { GUI: any }
	}
}

namespace slime.jrunscript.git {
	export namespace internal {
		export const subject = (
			function(fifty: slime.fifty.test.kit) {
				return fifty.global.jsh.tools.git;
			}
		//@ts-ignore
		)(fifty);

		export interface Fixtures {
			init: slime.jrunscript.git.Exports["init"]
			write: (p: {
				repository?: repository.Local
				directory?: slime.jrunscript.file.Directory
				files: {
					[path: string]: string
				}
			}) => void
		}

		export const fixtures: Fixtures = (
			function(fifty: slime.fifty.test.kit) {
				return fifty.$loader.file("fixtures.js", { module: subject });
			}
		//@ts-ignore
		)(fifty);
	}


	export interface Installation {
		/**
		 * Creates a new repository at the given location (see `git init`).
		 *
		 * @returns The local repository created.
		 */
		init: (
			p: {
				/**
				 * A location at which to create an empty repository.
				 */
				pathname: slime.jrunscript.file.Pathname
			},
			events?: {
				stdout: slime.$api.event.Handler<string>
				stderr: slime.$api.event.Handler<string>
			}
		) => slime.jrunscript.git.repository.Local
	}

	(
		function(
			fifty: slime.fifty.test.kit
		) {
			var verify = fifty.verify;

			var fixture = {
				write: function(o) {
					var directory = (function() {
						if (o.repository) return o.repository.directory;
						if (o.directory) return o.directory;
					})();
					for (var x in o.files) {
						//	TODO	add function form which receives string as argument
						directory.getRelativePath(x).write(o.files[x], { append: false });
					}
				}
			};

			fifty.tests.Installation = {};
			fifty.tests.Installation.init = function() {
				var verifyEmptyRepository = function(repository: slime.jrunscript.git.repository.Local) {
					verify(repository).is.type("object");
					verify(repository).log().length.is(0);
				};

				fifty.run(function worksWhenCreatingDirectory() {
					var location = fifty.jsh.file.location();
					verify(location).directory.is(null);
					var createdLocation = internal.subject.init({
						pathname: location
					});
					verify(location).directory.is.type("object");
					verifyEmptyRepository(createdLocation);
				});

				fifty.run(function worksWithEmptyDirectory() {
					const $api = fifty.$api;
					var directory = fifty.jsh.file.directory();

					fixture.write({
						directory: directory,
						files: {
							"a": "a"
						}
					});

					type template = { stdout: string, stderr: string };
					var events: template = { stdout: "a", stderr: "a" };

					var captor = fifty.$api.Events.Captor(events);

					var isType = function(type: string): slime.$api.fp.Predicate<slime.$api.Event<any>> {
						return $api.Function.pipe(
							$api.Function.property("type"),
							$api.Function.Predicate.is(type)
						);
					};

					var ofType = function(type: string) {
						return $api.Function.Array.filter(isType(type));
					}

					var handler = captor.handler;

					var repository = internal.subject.init({
						pathname: directory.pathname
					}, handler);

					verifyEmptyRepository(repository);
					verify(repository).directory.getFile("a").is.type("object");

					verify(captor).events.evaluate(ofType("stdout")).length.is(2);
					verify(captor).events.evaluate(ofType("stdout"))[1].detail.is("");
				});
			};
		}
	//@ts-ignore
	)(fifty)

	export namespace repository {
		(
			function(
				fifty: slime.fifty.test.kit
			) {
				fifty.tests.types.Repository = {};
				fifty.tests.types.Repository.Local = {};
			}
		//@ts-ignore
		)(fifty);

		export interface Local {
			log: (p?: {
				author?: string
				all?: boolean
				revisionRange?: string, /* deprecated name */ range?: string
			}) => Commit[]
		}

		export interface Local {
			config: {
				(p: {
					set: {
						name: string
						value: string
					}
				}): void

				(p: {
					list: {
						fileOption?: "system" | "global" | "local" | "worktree" | { file: string }
						showOrigin?: boolean
						//	TODO	--show-scope not supported on macOS Big Sur
						//	--null might make sense as an implementation detail, should investigate
						//	--name-only probably does not ever make sense; would make value optional if it did
					}
				}): {
					/**
					 * Present only if `showOrigin` was `true`.
					 */
					origin?: string
					name: string
					value: string
				}[]

				(p: { arguments: string[] }): { [x: string]: string }
			}
		}

		(
			function(
				fifty: slime.fifty.test.kit
			) {
				fifty.tests.types.Repository = {};
				fifty.tests.types.Repository.Local = {};
				fifty.tests.types.Repository.Local.config = function() {
					fifty.run(function old() {
						var empty = internal.subject.init({
							pathname: fifty.jsh.file.location()
						});
						var old = empty.config({
							arguments: ["--list", "--local"]
						});
						fifty.verify(old).evaluate.property("foo.bar").is(void(0));

						fifty.global.jsh.shell.run({
							command: "git",
							arguments: ["config", "foo.bar", "baz"],
							directory: empty.directory
						});
						var after = empty.config({
							arguments: ["--list", "--local"]
						});
						fifty.verify( Object.keys(after).length - Object.keys(old).length ).is(1);
						fifty.verify(after).evaluate.property("foo.bar").is("baz");
					});

					fifty.run(function list() {
						var empty = internal.subject.init({
							pathname: fifty.jsh.file.location()
						});
						var local = empty.config({
							list: {
								fileOption: "local"
							}
						});
						fifty.verify(local)[0].name.is.type("string");
						fifty.verify(local)[0].value.is.type("string");
						//	TODO	should verify there's no value with empty string for name
						fifty.verify(local).evaluate(function(p) {
							return p.some(function(value) {
								return !Boolean(value.name);
							})
						}).is(false);
					});

					fifty.run(function set() {
						var getConfigObject = function(repository) {
							return repository.config({
								list: {
									fileOption: "local"
								}
							}).reduce(function(rv,entry) {
								rv[entry.name] = entry.value;
								return rv;
							}, {});
						}

						var empty = internal.subject.init({
							pathname: fifty.jsh.file.location()
						});
						fifty.verify(empty).evaluate(getConfigObject).evaluate.property("foo.bar").is(void(0));

						empty.config({
							set: {
								name: "foo.bar",
								value: "baz"
							}
						});
						fifty.verify(empty).evaluate(getConfigObject).evaluate.property("foo.bar").is("baz");
					});
				}
			}
		//@ts-ignore
		)(fifty)

		export interface Local {
			status: () => {
				/**
				 * The current checked out branch. Note that the `name` of the branch will be `null` if a detached HEAD is checked
				 * out.
				 */
				branch: Branch

				/**
				 * An object whose keys are string paths within the repository, and whose values are the two-letter output
				 * of the `git status --porcelain` command. This property is absent if no files have a status.
				 */
				paths?: { [path: string]: string }
			}
		}

		(
			function(
				fifty: slime.fifty.test.kit
			) {
				var verify = fifty.verify;

				fifty.tests.types.Repository.Local.status = function() {
					var at = fifty.jsh.file.location();
					var repository = internal.fixtures.init({ pathname: at });
					debugger;
					var status = repository.status();
					verify(repository).status().evaluate.property("paths").is(void(0));
					internal.fixtures.write({
						repository: repository,
						files: {
							a: "a"
						}
					});
					verify(repository).status().paths.a.is("??");
					repository.add({ path: "a" });
					repository.commit({ message: "amessage" });
					var status = repository.status();
					verify(status).branch.name.is("master");
					verify(status).branch.commit.subject.is("amessage");
					verify(status).branch.commit.names.length.is(1);
					verify(status).branch.commit.names[0].is("master");
					fifty.global.jsh.shell.console(JSON.stringify(status,void(0),4));

					fifty.run(function detachedHeadBranchNameIsNull() {
						var hash = status.branch.commit.commit.hash;
						repository.checkout({ branch: hash });
						var detached = repository.status();
						verify(detached).branch.name.is(null);
					});
				}
			}
		//@ts-ignore
		)(fifty);
	}

	(function(fifty: slime.fifty.test.kit) {
		const { verify, run } = fifty;

		var debug = function(s) {
			fifty.global.jsh.shell.console(s);
		}

		var commitFile = function(repository: git.repository.Local,p) {
			var path = p;
			repository.directory.getRelativePath(path).write(path, { append: false });
			repository.add({ path: path });
			repository.commit({ all: true, message: path }, {
				stdout: function(e) {
					fifty.global.jsh.shell.console(e.detail);
				},
				stderr: function(e) {
					fifty.global.jsh.shell.console(e.detail);
				}
			});
		};

		function configure(repository: git.repository.Local) {
			repository.config({
				set: {
					name: "user.name",
					value: "SLIME"
				}
			});
			repository.config({
				set: {
					name: "user.email",
					value: "slime@example.com"
				}
			});
		}

		fifty.tests.submoduleTrackingBranch = function() {
			function initialize() {
				var tmpdir = fifty.jsh.file.directory();

				var library = internal.subject.init({ pathname: tmpdir.getRelativePath("sub") });
				configure(library);
				commitFile(library, "b");

				var parent = internal.subject.init({ pathname: tmpdir.getRelativePath("parent") });
				configure(parent);
				commitFile(parent, "a");

				return { library, parent };
			}

			run(function trackingMaster() {
				const { parent, library } = initialize();
				const submodule = parent.submodule.add({ repository: library, path: "path/sub", name: "sub", branch: "master" });
				configure(submodule);
				parent.commit({ all: true, message: "add submodule"});
				var submodules = parent.submodule();
				verify(submodules)[0].branch.is("master");
			});

			run(function trackingNothing() {
				const { parent, library } = initialize();
				const submodule = parent.submodule.add({ repository: library, path: "path/sub", name: "sub" });
				configure(submodule);
				parent.commit({ all: true, message: "add submodule"});
				var submodules = parent.submodule();
				verify(submodules)[0].evaluate.property("branch").is(void(0));
			});
		}

		fifty.tests.submoduleWithDifferentNameAndPath = function() {
			var tmpdir = fifty.jsh.file.directory();
			var sub = internal.subject.init({ pathname: tmpdir.getRelativePath("sub") });
			configure(sub);
			commitFile(sub, "b");
			var parent = internal.subject.init({ pathname: tmpdir.getRelativePath("parent") });
			configure(parent);
			commitFile(parent, "a");

			var added = parent.submodule.add({ repository: sub, path: "path/sub", name: "sub", branch: "master" });

			var submodules = parent.submodule();
			verify(submodules).length.is(1);
			verify(submodules)[0].evaluate.property("name").is("sub");
			verify(submodules)[0].path.is("path/sub");
			verify(submodules)[0].repository.reference.is(added.reference);
			verify(submodules)[0].evaluate.property("branch").is("master");
			verify(submodules)[0].commit.subject.is("b");
			//	don't bother testing other fields of commit
		};

		fifty.tests.submoduleStatusCached = function() {
			var tmpdir = fifty.jsh.file.directory();

			var library = internal.subject.init({ pathname: tmpdir.getRelativePath("sub") });
			configure(library);
			commitFile(library, "b");

			var parent = internal.subject.init({ pathname: tmpdir.getRelativePath("parent") });
			configure(parent);
			commitFile(parent, "a");

			var subrepository = parent.submodule.add({ repository: library, path: "path/sub", name: "sub", branch: "master" });
			configure(subrepository);
			parent.commit({ all: true, message: "add submodule"});

			var before = subrepository.status().branch;
			commitFile(subrepository, "c");
			var after = subrepository.status().branch;

			//	cached: true shows the committed state of the submodule
			var cached = parent.submodule({ cached: true });
			verify(cached)[0].commit.commit.hash.is(before.commit.commit.hash);

			//	when not cached, shows the current state of the submodule in its directory
			var submodules = parent.submodule();
			verify(submodules)[0].commit.commit.hash.is(after.commit.commit.hash);
			verify(submodules)[0].repository.status().branch.commit.commit.hash.is(after.commit.commit.hash);
		}
	//@ts-ignore
	})(fifty);
}

namespace slime.jrunscript.git {
	export interface Client {
		command: slime.jrunscript.file.Pathname
	}

	export interface Invocation {
		command: string
		arguments?: string[]
	}

	export interface Exports {
		Client: {
			invocation: (p: {
				client: Client,
				invocation: Invocation
			}) => slime.jrunscript.shell.old.Invocation
		}
	}

	(
		function(
			fifty: slime.fifty.test.kit
		) {
			var subject: slime.jrunscript.git.Exports = fifty.global.jsh.tools.git;

			fifty.tests.Client = {};
			fifty.tests.Client.invocation = function() {
				var fakeCommand = fifty.$loader.getRelativePath("git");
				var client = {
					command: fakeCommand
				};
				fifty.run(function status() {
					var invocation = subject.Client.invocation({
						client: client,
						invocation: {
							command: "status"
						}
					});
					fifty.verify(invocation).command.is(fakeCommand.toString());
					fifty.verify(invocation).arguments.length.is(1);
					fifty.verify(invocation).arguments[0].is("status");
				});
			}
		}
	//@ts-ignore
	)(fifty);

}

(function(fifty: slime.fifty.test.kit) {
	fifty.tests.suite = function() {
		fifty.run(fifty.tests.Installation.init);
		fifty.run(fifty.tests.types.Repository.Local.config);
		fifty.run(fifty.tests.types.Repository.Local.status);
		fifty.run(fifty.tests.submoduleStatusCached);
		fifty.run(fifty.tests.submoduleWithDifferentNameAndPath);
		fifty.run(fifty.tests.submoduleTrackingBranch);

		fifty.run(fifty.tests.Client.invocation);
	}
//@ts-ignore
})(fifty);