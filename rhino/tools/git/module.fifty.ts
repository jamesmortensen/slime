namespace slime.jrunscript.git {
	namespace internal {
		export const subject = jsh.tools.git;
		export const fixtures = (
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
				stdout: $api.Event.Handler<string>
				stderr: $api.Event.Handler<string>
			}
		) => slime.jrunscript.git.Repository.Local
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
				var verifyEmptyRepository = function(repository: slime.jrunscript.git.Repository.Local) {
					verify(repository).is.type("object");
					verify(repository).log().length.is(0);
				};

				run(function worksWhenCreatingDirectory() {
					var location = fifty.jsh.file.location();
					verify(location).directory.is(null);
					var createdLocation = internal.subject.init({
						pathname: location
					});
					verify(location).directory.is.type("object");
					verifyEmptyRepository(createdLocation);
				});

				run(function worksWithEmptyDirectory() {
					var directory = fifty.jsh.file.directory();

					fixture.write({
						directory: directory,
						files: {
							"a": "a"
						}
					});

					var captor = fifty.$api.Events.Captor("stdout", "stderr");

					var isType = function(type: string): $api.Function.Predicate<$api.Event<any>> {
						return $api.Function.pipe(
							$api.Function.property("type"),
							$api.Function.Predicate.is(type)
						);
					};

					var ofType = function(type: string) {
						return $api.Function.Array.filter(isType(type));
					}

					var repository = internal.subject.init({
						pathname: directory.pathname
					}, captor.handler);

					verifyEmptyRepository(repository);
					verify(repository).directory.getFile("a").is.type("object");

					verify(captor).events.evaluate(ofType("stdout")).length.is(2);
					verify(captor).events.evaluate(ofType("stdout"))[1].detail.is("");
				});
			};
		}
	//@ts-ignore
	)(fifty)

	namespace Repository {
		(
			function(
				fifty: slime.fifty.test.kit
			) {
				fifty.tests.types.Repository = {};
				fifty.tests.types.Repository.Local = {};
				fifty.tests.types.Repository.Local.config = function() {
					run(function old() {
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

					run(function list() {
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

					run(function set() {
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
	}

	(function(fifty: slime.fifty.test.kit) {
		const verify = fifty.verify;

		var commitFile = function(repository: git.Repository.Local,p) {
			var path = p;
			repository.directory.getRelativePath(path).write(path, { append: false });
			repository.add({ path: path });
			repository.commit({ all: true, message: path });
		}

		fifty.tests.submoduleWithDifferentNameAndPath = function() {
			var tmpdir = fifty.jsh.file.directory();
			var sub = internal.subject.init({ pathname: tmpdir.getRelativePath("sub") });
			commitFile(sub, "b");
			var parent = internal.subject.init({ pathname: tmpdir.getRelativePath("parent") });
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
		}
	//@ts-ignore
	})(fifty);
}

(function(fifty: slime.fifty.test.kit) {
	fifty.tests.suite = function() {
		run(fifty.tests.Installation.init);
		run(fifty.tests.types.Repository.Local.config);
	}
//@ts-ignore
})(fifty);