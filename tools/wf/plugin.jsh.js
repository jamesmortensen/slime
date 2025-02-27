//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 * @param { slime.$api.Global } $api
	 * @param { slime.jsh.plugin.$slime } $slime
	 * @param { slime.jsh.Global } jsh
	 * @param { slime.Loader } $loader
	 * @param { slime.jsh.plugin.plugin } plugin
	 */
	function($api,$slime,jsh,$loader,plugin) {
		plugin({
			isReady: function() {
				return Boolean(jsh.file && jsh.shell && jsh.shell.tools && jsh.ui && jsh.tools && jsh.tools.git);
			},
			load: function() {
				var code = {
					/** @type { slime.jsh.wf.internal.typescript.Script } */
					typescript: $loader.script("typescript.js"),
					/** @type { slime.jsh.wf.internal.module.Script } */
					module: $loader.script("module.js")
				};

				var library = {
					typescript: code.typescript({
						library: {
							file: jsh.file,
							shell: jsh.shell,
							node: jsh.shell.tools.node
						}
					}),
					module: code.module({
						library: {
							file: jsh.file
						},
						world: {
							filesystem: jsh.file.world.spi.filesystems.os
						}
					})
				};

				var inputs = (
					function() {
						/** @type { slime.$api.fp.impure.Input<string> } */
						var project = function() {
							if (jsh.shell.environment.PROJECT) {
								//	TODO	check for existence here?
								return jsh.shell.environment.PROJECT;
							}
							return jsh.shell.PWD.pathname.toString();
						};

						var base = $api.fp.impure.Input.map(
							project,
							function(pathname) {
								return jsh.file.Pathname(pathname).directory;
							}
						);

						return {
							project: project,
							base: base,
							/** @type { slime.$api.fp.impure.Input<boolean> } */
							gitInstalled: function() {
								return Boolean(jsh.shell.PATH.getCommand("git"));
							},
							isGitClone: $api.fp.impure.Input.map(
								base,
								function(base) {
									return Boolean(base.getSubdirectory(".git") || base.getFile(".git"));
								}
							),
						}
					}
				)();

				/**
				 *
				 * @param { slime.jrunscript.tools.git.Submodule } submodule
				 * @returns { slime.jsh.wf.Submodule }
				 */
				var submoduleDecorate = function(submodule) {
					var tracking = submodule.branch;
					return $api.Object.compose(
						submodule,
						{
							status: submodule.repository.status(),
							state: (tracking) ? jsh.wf.git.compareTo("origin/" + tracking)(submodule.repository) : void(0)
						}
					)
				};

				/** @type { slime.jrunscript.tools.git.Command<{ name: string, value: string },void> } */
				var setConfigValue = {
					invocation: function(p) {
						return {
							command: "config",
							arguments: [
								p.name,
								p.value
							]
						}
					}
				}

				var project = {
					base: inputs.base,
					Submodule: {
						construct: function(submodule) {
							return submoduleDecorate(submodule);
						}
					},
					lint: {
						eslint: function() {
							$api.fp.world.execute(jsh.shell.tools.node.require());
							jsh.shell.tools.node.installed.modules.require({ name: "eslint" });
							return jsh.shell.jsh({
								shell: jsh.shell.jsh.src,
								script: jsh.shell.jsh.src.getFile("contributor/eslint.jsh.js"),
								arguments: ["-project", inputs.project()],
								evaluate: function(result) {
									return result.status == 0;
								}
							});
						}
					},
					git: {
						installHooks: function(p) {
							var ALL_GIT_HOOKS = [
								"post-checkout",
								"pre-commit",
								"prepare-commit-msg",
								"post-merge",
								"post-commit"
							];

							if (inputs.gitInstalled() && inputs.isGitClone()) {
								var path = (p) ? p.path : "local/git/hooks";
								var repository = jsh.tools.git.program({ command: "git" }).repository(inputs.project())
								var clone = jsh.tools.git.Repository({ directory: jsh.file.Pathname(inputs.project()).directory });
								var config = clone.config({
									arguments: ["--list"]
								});
								if (config["core.hookspath"] != path) {
									jsh.shell.console("Installing git hooks ...");
									repository.command(setConfigValue).argument({ name: "core.hookspath", value: path }).run();
								}
								if (!p) {
									ALL_GIT_HOOKS.forEach(function(hook) {
										var location = inputs.base().getRelativePath(path + "/" + hook);
										location.write("./wf " + "git.hooks." + hook + " " + "\"$@\"", { append: false, recursive: true });
										jsh.shell.run({
											command: "chmod",
											arguments: $api.Array.build(function(rv) {
												rv.push("+x", location);
											})
										})
									});
								}
							}
						}
					},
					submodule: {
						status: function() {
							var repository = jsh.tools.git.Repository({ directory: inputs.base() });
							var submodules = repository.submodule();
							return submodules.map(submoduleDecorate);
						},
						remove: function(p) {
							var repository = jsh.tools.git.Repository({ directory: inputs.base() });
							jsh.shell.console("Removing submodule " + p.path);
							var checkout = inputs.base().getSubdirectory(p.path);
							if (checkout && checkout.getSubdirectory(".git")) {
								jsh.shell.console("Removing submodule .git ...");
								checkout.getSubdirectory(".git").remove();
							}
							var isConfigured = repository.config({ arguments: ["--list"] })["submodule." + p.path + ".url"];
							if (isConfigured) {
								jsh.shell.console("De-init ...");
								repository.submodule.deinit({ path: p.path, force: true });
							}
							if (checkout) {
								jsh.shell.console("git rm ...");
								repository.rm({ path: p.path });
							}

							var gitdir = (function(target) {
								if (target.getFile(".git")) throw new TypeError("Not supported for submodules of submodules; " + target.getFile(".git") + " is file.");
								if (target.getFile(".git")) {
									var reference = jsh.shell.console(target.getFile(".git").read(String));
									//	string like gitdir: ../../.git/modules/path/to/me
								}
								return target.getSubdirectory(".git");
							})(repository.directory);
							var module = gitdir.getSubdirectory("modules").getSubdirectory(p.path);
							if (module) {
								jsh.shell.console("Remove modules/" + p.path + " directory ...");
								module.remove();
							} else {
								jsh.shell.console("No modules/ directory for " + p.path + ".");
							}
						}
					},
					updateSubmodule: function(p) {
						var subcheckout = inputs.base().getSubdirectory(p.path);
						if (!subcheckout) {
							throw new jsh.wf.error.Failure("Submodule not found at " + p.path + " of " + inputs.base());
						}
						var repository = jsh.tools.git.Repository({ directory: inputs.base().getSubdirectory(p.path) });

						jsh.shell.console("Update subrepository " + repository + " ...");
						var current = repository.branch().filter(function(branch) {
							return branch.current;
						})[0];
						jsh.shell.console("Subrepository is on branch: " + current.name);
						if (current.name != "master") {
							throw new jsh.wf.error.Failure("Cannot update: not on master, but " + current.name);
						}
						repository.fetch({ all: true });
						var comparison = jsh.wf.git.compareTo("origin/master")(repository);
						jsh.shell.console(JSON.stringify(comparison,void(0),4));
						if (comparison.paths) {
							throw new jsh.wf.error.Failure(repository + " is modified; aborting.");
						}
						if (comparison.behind.length) {
							if (!comparison.ahead.length) {
								repository.merge({ ffOnly: true, name: "origin/master" });
								repository.submodule.update({ recursive: true });
							} else {
								throw new jsh.wf.error.Failure("Cannot update: merge is required.");
							}
						} else {
							jsh.shell.console(repository + " is up to date.");
						}
					},
					/**
					 * @type { slime.jsh.wf.Exports["project"]["initialize"] }
					 */
					initialize: $loader.module("plugin-standard.jsh.js", {
						jsh: jsh
					})
				};

				var jsh_wf_cli = {
					$f: {
						command: {
							parse: function(p) {
								return {
									command: p.arguments[0],
									options: p.options,
									arguments: p.arguments.slice(1)
								}
							},
							target: function(p) {
								var command = (p.target) ? p.target : "";
								var method = (function(command) {
									//jsh.shell.console("command = [" + command + "]");
									var tokens = (command.length) ? command.split(".") : [];
									//jsh.shell.console("tokens = " + JSON.stringify(tokens));
									/** @type { slime.jsh.wf.cli.Interface |  slime.jsh.script.cli.Command } */
									var rv = p.interface;
									for (var i=0; i<tokens.length; i++) {
										if (rv) rv = rv[tokens[i]];
									}
									return rv;
								})(command);

								if (typeof(method) == "function") {
									return method;
								} else if (!method) {
									throw new jsh.script.cli.error.TargetNotFound("Command not found: [" + command + "]", {
										command: command
									});
								} else {
									throw new jsh.script.cli.error.TargetNotFunction("Implementation is not a function: [" + command + "]" + ", but " + method, {
										command: command,
										target: method
									});
								}
							},
							process: function(p) {
								try {
									var method = this.target({
										target: p.invocation.command,
										interface: p.interface
									});
									method.call(
										null,
										{
											options: p.invocation.options,
											arguments: p.invocation.arguments
										}
									);
								} catch (e) {
									if (e instanceof jsh.script.cli.error.TargetNotFound) {
										jsh.shell.console(String(e));
										jsh.shell.exit(1);
									} else if (e instanceof jsh.script.cli.error.TargetNotFunction) {
										jsh.shell.console(String(e));
										jsh.shell.exit(1);
									} else {
										jsh.shell.console(e);
										jsh.shell.console(e.stack);
										throw e;
									}
								}
							},
							execute: function(p) {
								var invocation = jsh.wf.cli.$f.command.parse(p.arguments);
								jsh.wf.cli.$f.command.process({ interface: p.interface, invocation: invocation });
							}
						},
						invocation: function(f) {
							return $api.fp.result(
								{
									options: {},
									arguments: Array.prototype.slice.call(jsh.script.arguments)
								},
								f
							);
						}
					},
					/**
					 * @type { slime.jsh.wf.Exports["project"]["initialize"] }
					 */
					initialize: $api.deprecate(project.initialize)
				};

				var guiAsk = function(pp) {
					return function(p) {
						//	TODO	this "works" but could be improved in terms of font size and screen placement
						return jsh.ui.askpass.gui({
							prompt: "Enter " + pp.name + " for Git repository " + p.repository.directory.toString(),
							nomask: true
						});
					}
				};

				var fetch = $api.fp.memoized(function() {
					var credentialHelper = jsh.shell.jsh.src.getFile("rhino/tools/github/git-credential-github-tokens-directory.bash").toString();

					var repository = jsh.tools.git.Repository({ directory: inputs.base() });
					jsh.shell.console("Fetching all updates ...");
					repository.fetch({
						all: true,
						prune: true,
						recurseSubmodules: true,
						credentialHelpers: [
							"cache",
							credentialHelper
						]
					}, {
						remote: function(e) {
							var remote = e.detail;
							var url = repository.remote.getUrl({ name: remote });
							jsh.shell.console("Fetching updates from: " + url);
						},
						submodule: (function() {
							var first = true;
							return function(e) {
								if (first) {
									jsh.shell.stdio.error.write("Submodules: ");
									first = false;
								}
								if (e.detail) {
									jsh.shell.stdio.error.write(".");
								} else {
									jsh.shell.console("");
								}
							}
						})(),
						stdout_other: function(e) {
							if (e.detail) jsh.shell.console("STDOUT: " + e.detail);
						},
						stderr_other: function(e) {
							if (e.detail) jsh.shell.console("STDERR: " + e.detail);
						}
					});
					jsh.shell.console("");
					jsh.shell.console("Fetched updates.");
					jsh.shell.console("");
					return repository;
				});

				var jsh_wf_git = {
					commands: {
						/** @type { slime.jrunscript.tools.git.Command<void,{ current: boolean, name: string }[]> } */
						getBranches: {
							invocation: function() {
								return {
									command: "branch",
									arguments: $api.Array.build(function(rv) {
										rv.push("-a");
									})
								}
							},
							result: function(output) {
								var lines = output.split("\n");
								return lines.map(function(line) {
									return {
										current: line.substring(0,1) == "*",
										name: line.substring(2)
									}
								})
							}
						}
					},
					fetch: fetch,
					compareTo: function(branchName) {
						return function(repository) {
							/** @type { slime.jrunscript.tools.git.Command<{ revisionRange: string },slime.jrunscript.tools.git.Commit[]> } */
							var logRange = {
								invocation: function(p) {
									return {
										command: "log",
										arguments: $api.Array.build(function(rv) {
											rv.push(jsh.tools.git.log.format.argument);
											rv.push(p.revisionRange);
										})
									}
								},
								result: function(output) {
									return output.split("\n").map(function(line) {
										if (line.length == 0) return null;
										return jsh.tools.git.log.format.parse(line);
									}).filter(function(commit) {
										return Boolean(commit && commit.subject);
									})
								}
							};

							var repo = jsh.tools.git.program({ command: "git" }).repository(repository.directory.toString());

							var ahead = repo.command(logRange).argument({ revisionRange: branchName + ".." }).run();
							var behind = repo.command(logRange).argument({ revisionRange: ".." + branchName }).run();
							var status = repository.status();
							return {
								ahead: ahead,
								behind: behind,
								paths: status.paths
							}
						};
					}
				};

				var jsh_wf_error = {
					Failure: $api.Error.old.Type({ name: "jsh.wf.Failure" })
				}

				var typescript = {
					getConfig: function(base) {
						if (base.getFile("tsconfig.json")) return base.getFile("tsconfig.json");
						if (base.getFile("jsconfig.json")) return base.getFile("jsconfig.json");
						throw new Error("No TypeScript configuration file found at " + base);
					}
				}

				/**
				 *
				 * @param { any } stdio
				 * @param { slime.jsh.wf.Project } project
				 * @param { string } out
				 * @returns
				 */
				var getTypedocCommand = function(stdio,project,out) {
					var version = library.module.Project.getTypescriptVersion(project);
					var configuration = library.module.Project.getConfigurationLocation(project);
					jsh.shell.tools.rhino.require();
					jsh.shell.tools.tomcat.old.require();
					/** @type { slime.jsh.wf.internal.typescript.Invocation } */
					var typedocInvocation = {
						stdio: stdio,
						configuration: {
							typescript: {
								version: version,
								configuration: configuration.pathname
							}
						},
						project: project.base,
						out: out
					};
					var getShellInvocation = library.typescript.typedoc.invocation(typedocInvocation);
					return getShellInvocation;
				}

				/** @type { slime.jsh.wf.Exports["typescript"] } */
				var jsh_wf_typescript = (function() {
					return {
						require: function(p) {
							var project = (p && p.project) ? p.project : inputs.base();
							$api.fp.world.execute(jsh.shell.tools.node.require());
							jsh.shell.tools.node.installed.modules.require({
								name: "typescript",
								version: library.module.Project.getTypescriptVersion({ base: project.toString() })
							});
						},
						tsc: function(p) {
							var project = (p && p.project) ? p.project : inputs.base();
							var version = library.module.Project.getTypescriptVersion({ base: project.toString() });
							jsh.shell.console("Compiling with TypeScript " + version + " ...");
							var result = $api.fp.world.now.question(
								jsh.shell.world.question,
								jsh.shell.Invocation.from.argument({
									command: "bash",
									arguments: [
										jsh.shell.jsh.src.getFile("jsh.bash"),
										jsh.shell.jsh.src.getFile("tools/tsc.jsh.js"),
										"-version", version,
										"-tsconfig", typescript.getConfig(project)
									]
								})
							)
							return (result.status == 0);
						},
						typedoc: {
							now: function(p) {
								var project = (p && p.project) ? p.project : inputs.base();
								var getShellInvocation = getTypedocCommand(p.stdio, { base: project.pathname.toString() }, void(0));
								var exit = $api.fp.world.now.question(
									jsh.shell.world.question,
									getShellInvocation(jsh.shell.tools.node.installation)
								);
								return exit.status == 0;
							},
							invocation: $api.fp.pipe(
								$api.fp.split({
									nodeCommand: $api.fp.pipe(
										function(p) {
											return getTypedocCommand(p.stdio, p.project, p.out);
										}
									),
									stdio: $api.fp.property("stdio")
								}),
								function(inputs) {
									var invocation = inputs.nodeCommand(jsh.shell.tools.node.installation);
									if (inputs.stdio) {
										invocation.context.stdio = {
											input: null,
											output: inputs.stdio.output,
											error: inputs.stdio.error
										}
									}
									return invocation;
								}
							)
						}
					}
				})();

				var jsh_wf_inputs = {
					gitIdentityProvider: {
						gui: {
							name: guiAsk({ name: "user.name" }),
							email: guiAsk({ name: "user.email" })
						}
					}
				}

				/** @type { slime.jsh.wf.exports.Checks["noUntrackedFiles"] } */
				function noUntrackedFiles(p) {
					return $api.fp.world.old.ask(function(events) {
						events.fire("console", "Verifying no untracked files ...");
						var status = p.repository.status();
						var untracked = (status.paths) ? $api.Object.properties(status.paths).filter(function(property) {
							return property.value == "??"
						}).map(function(property) { return property.name; }) : [];
						if (untracked.length) {
							events.fire("untracked", untracked);
						}
						return untracked.length == 0;
					});
				}

				/** @type { slime.jsh.wf.exports.Checks["requireGitIdentity"] } */
				function requireGitIdentity(p) {
					/**
					 *
					 * @param { { [name: string]: string } } config
					 */
					function hasGitIdentity(config) {
						return Boolean(config["user.name"] && config["user.email"]);
					}

					return $api.fp.world.old.ask(function(events) {
						events.fire("debug", "Verifying git identity ...");
						var config = p.repository.config({
							arguments: ["--list"]
						});
						if (!config["user.name"] && p.get && p.get.name) {
							events.fire("console", "Getting user.name for " + p.repository);
							p.repository.config({
								arguments: ["user.name", p.get.name({ repository: p.repository })]
							});
						} else {
							events.fire("debug", "Found user.name " + config["user.name"] + " for " + p.repository);
						}
						if (!config["user.email"] && p.get && p.get.email) {
							events.fire("console", "Getting user.email for " + p.repository);
							p.repository.config({
								arguments: ["user.email", p.get.email({ repository: p.repository })]
							});
						} else {
							events.fire("debug", "Found user.email " + config["user.email"] + " for " + p.repository);
						}
						var after = p.repository.config({
							arguments: ["--list"]
						});
						if (!after["user.name"]) events.fire("console", "git repository configuration missing user.name");
						if (!after["user.email"]) events.fire("console", "git repository configuration missing user.email");
						return hasGitIdentity(after);
					});
				}

				/** @type { slime.jsh.wf.exports.Checks["noModifiedSubmodules"] } */
				function noModifiedSubmodules(p) {
					return $api.fp.world.old.ask(function(events) {
						events.fire("console", "Verifying submodules unmodified ...")
						// var success = true;
						// p.repository.submodule().forEach(function(sub) {
						// 	var submodule = jsh.tools.git.Repository({ directory: p.repository.directory.getSubdirectory(sub.path) });
						// 	var status = submodule.status();
						// 	if (status.paths) {
						// 		success = false;
						// 		events.fire(
						// 			"console",
						// 			"Submodule " + sub.path + " " + submodule + " "
						// 				+ "is modified in " + p.repository
						// 				+ " paths=" + JSON.stringify(status.paths)
						// 		);
						// 	}
						// });
						/** @type { { submodule: string, file: string, status: string }[] } */
						var modified = [];

						//	In precommit hooks the working directory or target repository is not reliable, so we rely on the fact
						//	that we should always be running against the base repository when inside a commit hook and thus ought to
						//	be able to list its submodules. We set the working directory any so that this check also works outside
						//	git commit hooks (and when executed from somewhere other than the project directory).
						$api.fp.world.now.action(
							jsh.shell.world.action,
							jsh.shell.Invocation.from.argument({
								command: "git",
								arguments: $api.Array.build(function(rv) {
									rv.push("submodule", "foreach");
									rv.push("git status --porcelain");
								}),
								stdio: {
									output: "string"
								},
								directory: inputs.project()
							}),
							{
								exit: function(e) {
									var lines = e.detail.stdio.output.split("\n");
									var current;
									var patterns = {
										repo: /^Entering \'(.*)\'/,
										file: /^(..) (.*)$/
									}
									lines.forEach(function(line) {
										if (patterns.repo.exec(line)) {
											var match = patterns.repo.exec(line);
											current = match[1];
										} else if (patterns.file.exec(line)) {
											var m2 = patterns.file.exec(line);
											modified.push({
												submodule: current,
												file: m2[2],
												status: m2[1]
											});
										} else {
											//jsh.shell.console("Ignoring line: [" + line + "]");
										}
									})
								}
							}
						);
						if (modified.length) {
							modified.forEach(function(modification) {
								events.fire("console", "Modified: " + modification.submodule + " " + modification.file + ": " + modification.status);
							})
						}
						return modified.length == 0;
					});
				}

				/** @type { slime.jsh.wf.exports.Checks["noDetachedHead"] } */
				function noDetachedHead(p) {
					return $api.fp.world.old.ask(function(events) {
						events.fire("console", "Verifying not a detached HEAD ...");
						var status = p.repository.status();
						if (status.branch.name === null) {
							events.fire("console", "Cannot commit a detached HEAD.");
						}
						return status.branch.name !== null;
					});
				}

				/** @type { slime.jsh.wf.exports.Checks["upToDateWithOrigin"] } */
				function upToDateWiithOrigin(p) {
					/**
					 *
					 * @param { string } repository
					 * @param { string } base
					 * @returns
					 */
					var branchExists = function(repository,base) {
						var allBranches = jsh.tools.git.program({ command: "git" }).repository(repository).command(jsh.wf.git.commands.getBranches).argument().run()
							.map(function(branch) {
								if (branch.name.substring(0,"remote/".length) == "remote/") return branch.name.substring("remote/".length);
								return branch.name;
							});
						return Boolean(allBranches.find(function(branch) { return branch == base; }));
					}

					return $api.fp.world.old.ask(function(events) {
						events.fire("console", "Verifying up to date with origin ...");
						var remote = "origin";
						var origin = jsh.tools.git.program({ command: "git" })
							.repository(inputs.project())
							.command(jsh.tools.git.commands.remote.show)
							.argument(remote)
							.run()
						;
						var repository = p.repository;
						var status = repository.status();
						var branch = status.branch.name;
						var tracked = remote + "/" + branch;
						if (!branchExists(repository.directory.toString(), tracked)) {
							tracked = remote + "/" + origin.head;
						}

						//	TODO	looks like the below is duplicative, checking vs origin/master twice; maybe there's an offline
						//			scenario where that makes sense?
						var allowDivergeFromOrigin = false;
						var vsLocalOrigin = jsh.wf.git.compareTo(tracked)(repository);
						if (vsLocalOrigin.behind && vsLocalOrigin.behind.length && !allowDivergeFromOrigin) {
							events.fire("console", "Behind " + tracked + " by " + vsLocalOrigin.behind.length + " commits.");
							return false;
						}
						var vsOrigin = jsh.wf.git.compareTo(tracked)(repository);
						//	var status = repository.status();
						//	maybe check branch above if we allow non-master-based workflow
						//	Perhaps allow a command-line argument or something for this, need to think through branching
						//	strategy overall
						if (vsLocalOrigin.behind && vsOrigin.behind.length && !allowDivergeFromOrigin) {
							events.fire("console", "Behind " + tracked + " by " + vsOrigin.behind.length + " commits.");
							return false;
						}
						return true;
					});
				}

				/** @type { slime.jsh.wf.exports.Checks["lint"] } */
				function lint(p) {
					if (!p) p = {};
					var isText = (p.isText) ? p.isText : jsh.project.code.files.isText;
					var handleTrailingWhitespace = (typeof(p.trailingWhitespace) == "undefined") ? true : p.trailingWhitespace;
					var handleFinalNewlines = (typeof(p.handleFinalNewlines) == "undefined") ? true : p.handleFinalNewlines;
					return {
						check: $api.fp.world.old.ask(function(events) {
							var success = true;

							if (handleTrailingWhitespace) {
								events.fire("console", "Checking for trailing whitespace ...");
								jsh.tools.code.handleTrailingWhitespace({
									base: inputs.base(),
									exclude: jsh.project.code.files.exclude,
									isText: isText,
									nowrite: true
								})({
									unknownFileType: function(e) {
										events.fire("console", "Could not determine whether file is text or binary: " + e.detail.path);
										success = false;
									},
									foundAt: function(e) {
										events.fire("console", "Found trailing whitespace: " + e.detail.file.path + " line " + e.detail.line.number);
										success = false;
									}
								});
							}

							if (handleFinalNewlines) {
								events.fire("console", "Handling final newlines ...");
								jsh.tools.code.handleFinalNewlines({
									base: inputs.base(),
									exclude: jsh.project.code.files.exclude,
									isText: isText,
									nowrite: true
								})({
									unknownFileType: function(e) {
										events.fire("console", "Could not determine whether file is text or binary: " + e.detail.path);
										success = false;
									},
									missing: function(e) {
										events.fire("console", "Missing final newline: " + e.detail.path);
										success = false;
									},
									multiple: function(e) {
										events.fire("console", "Multiple final newlines: " + e.detail.path);
										success = false;
									}
								});
							}

							if (inputs.base().getFile(".eslintrc.json")) {
								events.fire("console", "Running ESLint ...");
								jsh.shell.jsh({
									shell: jsh.shell.jsh.src,
									script: jsh.shell.jsh.src.getFile("contributor/eslint.jsh.js"),
									stdio: {
										output: null
									},
									evaluate: function(result) {
										if (result.status) {
											events.fire("console", "ESLint status: " + result.status + "; failing.");
											success = false;
										} else {
											events.fire("console", "ESLint passed.");
										}
									}
								});
							}

							return success;
						}),
						fix: $api.fp.world.old.tell(function(events) {
							if (handleTrailingWhitespace) {
								events.fire("console", "Checking for trailing whitespace ...");
								jsh.tools.code.handleTrailingWhitespace({
									base: inputs.base(),
									exclude: jsh.project.code.files.exclude,
									isText: isText,
									nowrite: false
								})({
									unknownFileType: function(e) {
										events.fire("console", "Could not determine whether file is text or binary: " + e.detail.path);
									},
									foundAt: function(e) {
										events.fire("console", "Found trailing whitespace: " + e.detail.file.path + " line " + e.detail.line.number);
									}
								});
							}

							if (handleFinalNewlines) {
								events.fire("console", "Handling final newlines ...");
								jsh.tools.code.handleFinalNewlines({
									base: inputs.base(),
									exclude: jsh.project.code.files.exclude,
									isText: isText,
									nowrite: false
								})({
									unknownFileType: function(e) {
										events.fire("console", "Could not determine whether file is text or binary: " + e.detail.path);
									},
									missing: function(e) {
										events.fire("console", "Missing final newline: " + e.detail.path);
									},
									multiple: function(e) {
										events.fire("console", "Multiple final newlines: " + e.detail.path);
									}
								});
							}

							//	TODO	eslint has a fix option also, could consider adding it here
						})
					};
				}

				/** @type { slime.jsh.wf.exports.Checks["tsc"] } */
				function tsc() {
					return function(events) {
						events.fire("console", "Verifying with TypeScript compiler ...");
						var project = inputs.base();
						var version = library.module.Project.getTypescriptVersion({ base: project.toString() });
						events.fire("console", "Compiling with TypeScript " + version + " ...");
						//	TODO	create standard jsh invocation to make the terser, commented-out form below this form possible
						var result = $api.fp.world.now.question(
							jsh.shell.world.question,
							jsh.shell.Invocation.from.argument({
								command: "bash",
								arguments: [
									jsh.shell.jsh.src.getFile("jsh.bash"),
									jsh.shell.jsh.src.getFile("tools/tsc.jsh.js"),
									"-version", version,
									"-tsconfig", typescript.getConfig(project)
								],
								stdio: {
									output: "line"
								}
							}),
							{
								stdout: function(e) {
									events.fire("output", e.detail.line);
								}
							}
						);
						// var result = jsh.shell.jsh({
						// 	script: jsh.shell.jsh.src.getFile("tools/tsc.jsh.js"),
						// 	arguments: [
						// 		"-version", version,
						// 		"-tsconfig", typescript.getConfig(project)
						// 	],
						// 	evaluate: function(result) {
						// 		return result;
						// 	}
						// });
						return (result.status == 0);
					};
				}

				var jsh_wf_checks = {
					noUntrackedFiles: noUntrackedFiles,
					requireGitIdentity: requireGitIdentity,
					noModifiedSubmodules: noModifiedSubmodules,
					noDetachedHead: noDetachedHead,
					upToDateWithOrigin: upToDateWiithOrigin,
					tsc: tsc,
					lint: lint,
					precommit: function(p) {
						return $api.fp.world.old.ask(function(events) {
							var repository = fetch();

							var success = true;

							success = success && requireGitIdentity({
								repository: repository
							})({
								console: function(e) {
									events.fire("console", e.detail);
								}
							});

							success = success && noUntrackedFiles({
								repository: repository
							})({
								console: function(e) {
									events.fire("console", e.detail);
								},
								untracked: function(e) {
									events.fire("console", "Found untracked files:\n" + e.detail.join(" "));
								}
							});

							success = success && noModifiedSubmodules({
								repository: repository
							})({
								console: function(e) {
									events.fire("console", e.detail);
								}
							});

							success = success && noDetachedHead({
								repository: repository
							})({
								console: function(e) {
									events.fire("console", e.detail);
								}
							});

							success = success && upToDateWiithOrigin({
								repository: repository
							})({
								console: function(e) {
									events.fire("console", e.detail);
								}
							});

							if (p.lint) {
								success = success && p.lint({
									console: function(e) {
										events.fire("console", e.detail);
									}
								});
							}

							success = success && $api.fp.world.now.question(tsc, void(0), {
								console: function(e) {
									events.fire("console", e.detail);
								},
								output: function(e) {
									events.fire("console", e.detail);
								}
							});

							if (p.test) {
								success = success && p.test({
									output: function(e) {
										events.fire("console", e.detail);
									},
									console: function(e) {
										events.fire("console", e.detail);
									}
								});
							}

							return success;
						});
					}
				}

				var jsh_wf_requireGitIdentity = Object.assign($api.events.Function(function(p,events) {
					var get = p.get || {
						name: function(p) {
							throw new jsh.wf.error.Failure("Missing: user.name");
						},
						email: function(p) {
							throw new jsh.wf.error.Failure("Missing: user.email");
						}
					};
					var config = p.repository.config({
						arguments: ["--list"]
					});
					if (!config["user.name"]) {
						events.fire("console", "Getting user.name for " + p.repository);
						p.repository.config({
							arguments: ["user.name", get.name({ repository: p.repository })]
						});
					} else {
						events.fire("debug", "Found user.name " + config["user.name"] + " for " + p.repository);
					}
					if (!config["user.email"]) {
						events.fire("console", "Getting user.email for " + p.repository);
						p.repository.config({
							arguments: ["user.email", get.email({ repository: p.repository })]
						});
					} else {
						events.fire("debug", "Found user.email " + config["user.email"] + " for " + p.repository);
					}
				}), {
					get: {
						gui: {
							name: guiAsk({ name: "user.name" }),
							email: guiAsk({ name: "user.email" })
						}
					}
				});

				var jsh_wf_prohibitUntrackedFiles = $api.events.Function(function(p, events) {
					var status = p.repository.status();
					var untracked = (status.paths) ? $api.Object.properties(status.paths).filter(function(property) {
						return property.value == "??"
					}).map(function(property) { return property.name; }) : [];
					if (untracked.length) {
						events.fire("untracked", untracked);
					}
				}, {
					untracked: function(e) {
						throw new jsh.wf.error.Failure("Found untracked files:\n" + e.detail.join("\n"));
					}
				});

				var jsh_wf_prohibitModifiedSubmodules = $api.events.Function(
					/**
					 *
					 * @param { { repository: slime.jrunscript.tools.git.repository.Local } } p
					 * @param {*} events
					 */
					function(p,events) {
						p.repository.submodule().forEach(function(sub) {
							var submodule = jsh.tools.git.Repository({ directory: p.repository.directory.getSubdirectory(sub.path) });
							var status = submodule.status();
							if (status.paths) {
								throw new jsh.wf.error.Failure(
									"Submodule " + sub.path + " " + submodule + " "
									+ "is modified in " + p.repository
									+ " paths=" + JSON.stringify(status.paths)
								);
							}
						});
					}
				);

				/** @type { slime.jsh.wf.Exports["Project"] } */
				var Project = {
					input: function() {
						return {
							base: inputs.project()
						}
					},
					getTypescriptVersion: library.module.Project.getTypescriptVersion,
					getConfigurationFile: library.module.Project.getConfigurationLocation
				};

				jsh.wf = {
					Project: Project,
					project: project,
					git: jsh_wf_git,
					typescript: jsh_wf_typescript,
					inputs: jsh_wf_inputs,
					checks: jsh_wf_checks,
					requireGitIdentity: jsh_wf_requireGitIdentity,
					prohibitUntrackedFiles: jsh_wf_prohibitUntrackedFiles,
					prohibitModifiedSubmodules: jsh_wf_prohibitModifiedSubmodules,
					cli: jsh_wf_cli,
					error: jsh_wf_error
				}
			}
		})
	}
//@ts-ignore
)($api,$slime,jsh,$loader,plugin)
