//@ts-check
(function() {
	if (!jsh.shell.jsh.src.getSubdirectory("local/jdk/11")) {
		jsh.shell.run({
			command: jsh.shell.jsh.src.getFile("jsh.bash"),
			arguments: [
				"--install-jdk-11"
			]
		});
	}

	jsh.shell.run({
		command: jsh.shell.jsh.src.getFile("jsh.bash"),
		arguments: [ jsh.shell.jsh.src.getFile("jsh/test/jsh-data.jsh.js") ],
		environment: $api.Object.compose(jsh.shell.environment, {
			JSH_LAUNCHER_JDK_HOME: jsh.shell.jsh.src.getSubdirectory("local/jdk/11").toString()
		})
	})
})()