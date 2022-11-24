//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jsh.test.remote {
	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;
			const { $api, jsh } = fifty.global;

			var slime = fifty.jsh.file.relative("../..");

			var loader = jsh.file.world.Location.directory.loader.synchronous({ root: slime });

			var code: {
				testing: slime.jrunscript.tools.github.internal.test.Script
			} = {
				testing: jsh.loader.synchronous.script("rhino/tools/github/test/module.js")(loader)
			};

			var library = {
				testing: code.testing({
					slime: jsh.file.object.directory(slime)
				})
			};

			var lock = jsh.java.Thread.Lock();

			var server = library.testing.startMock(jsh);

			var toInvocation = function(line: string[], input?: string) {
				return jsh.shell.Invocation.create({
					command: line[0],
					arguments: line.slice(1),
					stdio: {
						input: input,
						output: "string",
						error: "string"
					}
				});
			};

			var getOutput = $api.fp.pipe(
				$api.fp.impure.tap(function(t) {
					debugger;
				}),
				$api.fp.world.mapping(jsh.shell.world.question),
				$api.fp.impure.tap(function(t) {
					if (t.status != 0) {
						jsh.shell.console("Status: " + t.status);
						jsh.shell.console("stderr:");
						jsh.shell.console(t.stdio.error);
					}
					debugger;
				}),
				$api.fp.property("stdio"),
				$api.fp.property("output")
			)

			fifty.tests.suite = function() {
				var settings: slime.jsh.unit.mock.github.Settings = {
					mock: server,
					branch: "local"
				};
				var download = library.testing.getDownloadJshBashCommand(
					jsh.shell.PATH,
					settings
				);
				var invoke = library.testing.getBashInvocationCommand(settings);
				jsh.shell.console(download.join(" "));
				jsh.shell.console(invoke.join(" "));
				var launcherBashScript = $api.fp.now.invoke(
					toInvocation(download),
					getOutput
				);
				jsh.shell.console("bash = " + launcherBashScript);
				jsh.shell.console("invoke = " + invoke);
				var scriptOutput = $api.fp.now.invoke(
					toInvocation(invoke, launcherBashScript),
					getOutput
				);
				if (!scriptOutput) throw new Error("No script output.");
				var output = JSON.parse(scriptOutput);
				verify(output).evaluate.property("engines").is.type("object");
			}
		}
	//@ts-ignore
	)(fifty);
}
