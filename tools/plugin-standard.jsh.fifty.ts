namespace slime.jsh.wf {
	export namespace standard {
		namespace test {
			export const fixtures = (
				function(fifty: slime.fifty.test.kit) {
					const jsh = fifty.global.jsh;

					function configure(repository: slime.jrunscript.git.Repository.Local) {
						repository.config({ set: { name: "user.name", value: "foo" }});
						repository.config({ set: { name: "user.email", value: "bar@example.com" }});
					}

					var src: slime.jrunscript.file.Directory = fifty.$loader.getRelativePath("..").directory;

					function fixture() {
						var project = fifty.jsh.file.location();
						fifty.$loader.getRelativePath("test/data/plugin-standard").directory.copy(project);
						var repository = jsh.tools.git.init({
							pathname: project
						});
						configure(repository);
						repository.config({
							set: {
								name: "receive.denyCurrentBranch",
								value: "warn"
							}
						});
						repository.add({
							path: "."
						});
						var slime = jsh.tools.git.Repository({
							directory: src
						});
						//	TODO	Note that this adds committed version of SLIME (or something), rather than local version. May not work
						//			as expected. May want to overwrite (so that submodule config is preserved) with a local copy
						//			that excludes local/
						repository.submodule.add({
							repository: slime,
							path: "slime"
						});
						repository.commit({
							all: true,
							message: "initial"
						}, {
							stdio: function(e) {
								jsh.shell.console(e.detail);
							},
							stderr: function(e) {
								jsh.shell.console(e.detail);
							}
						});
						return repository;
					}

					return {
						wf: fifty.$loader.getRelativePath("wf").file,
						project: function() {
							var origin = fixture();
							var repository = origin.clone({
								to: fifty.jsh.file.location()
							});
							repository.submodule.update({
								init: true
							});
							configure(repository);
							//	copy local modifications to source tree since we are testing this source code
							src.copy(repository.directory.getRelativePath("slime"), {
								filter: function(item) {
									if (item.entry.path.substring(0,"local/".length) == "local/") return false;
									if (item.entry.path == ".git") return false;
									if (item.entry.path.substring(0,".git/".length) == ".git/") return false;
									return true;
								}
							});
							var slime = jsh.tools.git.Repository({ directory: repository.directory.getSubdirectory("slime") });
							if (slime.status().paths) {
								slime.add({ path: "." });
								slime.commit({ message: "Local modifications committed by plugin-standard.jsh.fifty.ts tests." });
							}
							return repository;
						}
					}
				}
			//@ts-ignore
			)(fifty);
		}
		export interface Project {
			lint?: () => boolean
			test?: () => boolean
			commit?: (p: {
				message: string
				notest?: boolean
			}) => void
		}

		/**
		 * Implements the standard `wf` commands provided by {@link slime.jsh.wf.Exports | `jsh.wf.project.initialize()`}.
		 */
		export interface Interface {
			eslint:  slime.jsh.script.Command

			/**
			 * Runs the Typedoc documentation generator.
			 */
			typedoc:  slime.jsh.script.Command

			status:  slime.jsh.script.Command

			test:  slime.jsh.script.Command

			submodule: {
				/**
				 * `--path <path-to-submodule>`
				 */
				remove:  slime.jsh.script.Command
				/**
				 * `--path <path-to-submodule>`
				 */
				update:  slime.jsh.script.Command
				reset:  slime.jsh.script.Command
			}

			documentation:  slime.jsh.script.Command
			document:  slime.jsh.script.Command
		}

		(
			function(
				fifty: slime.fifty.test.kit
			) {
				fifty.tests.interface = {};
			}
		//@ts-ignore
		)(fifty);

		export interface Interface {
			/**
			 * Runs the TypeScript compiler on the project.
			 */
			 tsc:  slime.jsh.script.Command
		}

		(
			function(
				fifty: slime.fifty.test.kit
			) {
				var jsh = fifty.global.jsh;

				fifty.tests.interface.tsc = function() {
					var repository = test.fixtures.project();

					var tscresult: { status: number, stdio: any } = jsh.shell.run({
						command: test.fixtures.wf,
						arguments: ["tsc"],
						directory: repository.directory,
						stdio: {
							output: String,
							error: String
						},
						evaluate: function(result) { return result; }
					});
					if (tscresult.status != 0) {
						jsh.shell.console("In: " + repository.directory);
						jsh.shell.console(tscresult.stdio.output + tscresult.stdio.error);
					}
					fifty.verify(tscresult).stdio.evaluate(function(stdio) {
						return stdio.error.indexOf("Passed.") != -1
					}).is(true);

					run(function tscfail() {
						var repository = test.fixtures.project();

						var tsc = function(environment?) {
							var result = jsh.shell.run({
								command: test.fixtures.wf,
								arguments: ["tsc"],
								directory: repository.directory,
								//	TODO	add access to $api.Object in Fifty tests
								environment: Object.assign({},
									jsh.shell.environment,
									environment
								),
								stdio: {
									output: String,
									error: String
								},
								evaluate: function(result) { return result; }
							});
							if (result.status != 0) {
								jsh.shell.console(result.stdio.output + "\n" + result.stdio.error);
							}
							return result;
						}

						var before: { status: number, stdio: any } = tsc();
						fifty.verify(before).status.is(0);

						var wfjs = repository.directory.getFile("wf.js");
						wfjs.pathname.write(
							wfjs.read(String).replace(/\/\/\@ts\-ignore/g, ""),
							{ append: false }
						);

						//	issue 178 (https://github.com/davidpcaldwell/slime/issues/178)
						//	the issue claimed that a stack trace was dumped when tsc failed under nashorn, but there is no stack
						//	trace, as the below output indicates. So hard to assert that there's no stack trace without knowing
						//	what it would look like; disabling output since it is just manually-checked clutter
						var after: { status: number, stdio: any } = tsc({ JSH_ENGINE: "nashorn" });
						fifty.verify(after).status.is(1);
						if (false) {
							jsh.shell.console("output = [" + after.stdio.output + "]");
							jsh.shell.console("error = [" + after.stdio.error + "]");
						}
					})
				}
			}
		//@ts-ignore
		)(fifty);


		export interface Interface {
			/**
			 * Attempts to commit the current local changes.
			 *
			 * Steps:
			 *
			 * * Check whether up to date with origin.
			 *
			 * * Require that git identity be set.
			 *
			 * * Do not allow untracked files to be present.
			 *
			 * * Ensure linting passes, if linting is defined.
			 *
			 * * Make sure submodules are not modified, if submodules are present.
			 *
			 * * Ensure `tsc` checking passes.
			 *
			 * * Ensure tests pass.
			 *
			 * * Commit
			 *
			 * * Push
			 */
			 commit:  slime.jsh.script.Command
		}

		(
			function(
				fifty: slime.fifty.test.kit
			) {
				var jsh = fifty.global.jsh;

				fifty.tests.interface.commit = function() {
					var repository = test.fixtures.project();

					//	add tracked file and wf commit
					repository.directory.getRelativePath("a").write("", { append: false });
					repository.add({ path: "a" });
					var r1: { status: number } = jsh.shell.run({
						command: test.fixtures.wf,
						arguments: ["commit", "--message", "a"],
						directory: repository.directory
					});
					fifty.verify(r1).status.is(0);

					repository.directory.getRelativePath("b").write("", { append: false });
					var result: { status: number, stdio: any } = jsh.shell.run({
						command: test.fixtures.wf,
						arguments: ["commit", "--message", "b"],
						directory: repository.directory,
						stdio: {
							output: String,
							error: String
						},
						evaluate: function(result) { return result; }
					});
					fifty.verify(result).status.is(1);
					fifty.verify(result).stdio.evaluate(function(stdio) {
						return stdio.error.indexOf("Found untracked files: b") != -1;
					}).is(true);
				}
			}
		//@ts-ignore
		)(fifty);

		(
			function(
				fifty: slime.fifty.test.kit
			) {
				fifty.tests.suite = function() {
					fifty.tests.interface.tsc();
					fifty.tests.interface.commit();
				}
			}
		//@ts-ignore
		)(fifty);

	}
}