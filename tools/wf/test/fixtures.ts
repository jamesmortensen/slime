//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jsh.wf.test {
	export interface Context {
		$api: slime.$api.Global
		jsh: slime.jsh.Global
	}

	export interface Fixtures {
		/**
		 * Clones the repository given by p.src to a temporary directory. If p.commit is given and files are modified,
		 * commits changes with the given p.commit.message.
		 */
		clone: (p: {
			src: slime.jrunscript.file.world.object.Location
			commit?: {
				message: string
			}
		}) => slime.jrunscript.tools.git.repository.Local

		/**
		 * Sets an arbitrary `user.name` and `user.email` on the repository configuration for the given repository.
		 */
		configure: (repository: slime.jrunscript.tools.git.repository.Local) => void
	}

	export type Script = slime.loader.Script<Context, Fixtures>

	(
		function(
			$context: Context,
			$export: slime.loader.Export<Fixtures>
		) {
			const $api = $context.$api;
			const jsh = $context.jsh;

			function configure(repository) {
				repository.config({ set: { name: "user.name", value: "foo" }});
				repository.config({ set: { name: "user.email", value: "bar@example.com" }});
			}

			$export({
				clone: function(p) {
					var clone: slime.jrunscript.tools.git.Command<{ repository: string, to: string }, void> = {
						invocation: function(p) {
							return {
								command: "clone",
								arguments: $api.Array.build(function(rv) {
									rv.push(p.repository);
									if (p.to) rv.push(p.to);
								})
							}
						}
					};
					var addAll: slime.jrunscript.tools.git.Command<void,void> = {
						invocation: function(p) {
							return {
								command: "add",
								arguments: ["."]
							}
						}
					};
					var commitAll: slime.jrunscript.tools.git.Command<{ message: string },void> = {
						invocation: function(p) {
							return {
								command: "commit",
								arguments: ["--all", "--message", p.message]
							};
						}
					}

					var src = p.src;
					var destination = (() => {
						var object = jsh.shell.TMPDIR.createTemporary({ directory: true });
						return jsh.file.world.spi.filesystems.os.pathname(object.toString());
					})();
					jsh.tools.git.program({ command: "git" }).command(clone).argument({
						repository: src.pathname,
						to: destination.pathname
					}).run();
					//	copy code so that we get local modifications in our "clone"
					//	TODO	this is horrendouly inefficient, listing and iterating through lots of directories we are not
					//			going to copy. We should rather filter the directory listing and then only copy
					jsh.file.object.directory(src).copy(jsh.file.object.pathname(destination), {
						filter: function(p) {
							//	Prevents copying of the .git *file* in submodules
							if (/\.git$/.test(p.entry.path)) return false;

							//	Prevents copying of files under the .git and local directories
							if (/\.git\//.test(p.entry.path)) return false;
							if (/local\//.test(p.entry.path)) return false;

							//	Prevents copying of files under the submodule path
							//	TODO	this is not very generalized; it does allow the standard wf plugin tests to pass
							if (/slime\//.test(p.entry.path)) return false;

							//	If we are a directory but the clone contains a file, remove the file and overwrite
							if (p.exists && !p.exists.directory && p.entry.node.directory) {
								p.exists.remove();
								return true;
							}

							return true;
						}
					});
					(
						function removeLocallyRemovedFilesFromClone() {
							var cloned = jsh.file.object.directory(destination).list({
								type: jsh.file.list.ENTRY,
								filter: function(node) {
									return !node.directory;
								},
								descendants: function(directory) {
									return directory.pathname.basename != ".git" && directory.pathname.basename != "local";
								}
							});
							cloned.forEach(function(entry) {
								var deleted = !jsh.file.object.directory(src).getFile(entry.path);
								if (deleted) {
									if (entry.path != ".git") {
										jsh.shell.console("Deleting cloned file deleted locally: " + entry.path);
										jsh.file.object.directory(destination).getFile(entry.path).remove();
									}
								}
							});
						}
					)();
					var rv = jsh.tools.git.Repository({ directory: jsh.file.Pathname(destination.pathname).directory });
					if (p.commit && rv.status().paths) {
						configure(rv);
						var repository = jsh.tools.git.program({ command: "git" }).repository(destination.pathname);
						//	Add untracked files
						repository.command(addAll).argument().run();
						repository.command(commitAll).argument({ message: p.commit.message }).run({
							stderr: function(line) {
								jsh.shell.console(line);
							}
						});
					}
					return rv;
					//	good utility functions for git module?
					// function unset(repository,setting) {
					// 	jsh.shell.console("Unset: " + repository.directory);
					// 	jsh.shell.run({
					// 		command: "git",
					// 		arguments: ["config", "--local", "--unset", setting],
					// 		directory: repository.directory
					// 	});
					// }
					// var gitdir = (function() {
					// 	if (src.getSubdirectory(".git")) {
					// 		return src.getSubdirectory(".git");
					// 	}
					// 	if (src.getFile(".git")) {
					// 		var parsed = /^gitdir\: (.*)/.exec(src.getFile(".git").read(String));
					// 		var relative = (parsed) ? parsed[1] : null;
					// 		return (relative) ? src.getRelativePath(relative).directory : void(0);
					// 	}
					// })();
				},
				configure: configure
			})
		}
	//@ts-ignore
	)($context,$export);
}
