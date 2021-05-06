(
	function(
		fifty: slime.fifty.test.kit
	) {
		const subject: slime.jrunscript.shell.Exports["invocation"] = fifty.$loader.module("invocation.js");

		fifty.tests.suite = function() {
			var jsh = fifty.global.jsh;
			var verify = fifty.verify;

			run(function() {
				var sudoed = subject.sudo()(jsh.shell.Invocation({
					command: "ls"
				}));

				verify(sudoed).command.evaluate(String).is("sudo");
				verify(sudoed).arguments[0].is("ls");
				verify(sudoed).environment.evaluate.property("SUDO_ASKPASS").is(void(0));
 			});

			 run(function askpass() {
				 var sudoed = subject.sudo({
					 askpass: "/path/to/askpass"
				 })(jsh.shell.Invocation({
					 command: "ls"
				 }));

				 verify(sudoed).command.evaluate(String).is("sudo");
				 verify(sudoed).arguments[0].is("--askpass");
				 verify(sudoed).arguments[1].is("ls");
				 verify(sudoed).environment.SUDO_ASKPASS.is("/path/to/askpass");
			 });
		}
	}
//@ts-ignore
)(fifty);
