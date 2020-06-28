namespace jsh.shell {
	interface Tools {
		rhino: {
			install: (
				p: {
					mock?: { lib: slime.jrunscript.file.Directory, rhino: slime.jrunscript.file.File }
					local?: slime.jrunscript.file.File
					replace?: boolean
					version?: string
				},
				events?: any
			) => void
			require: any
		}
		graal: any
		tomcat: any
		ncdbg: any
		kotlin: any
		jsyaml: any
		node: any
		javamail: any
		jsoup: any
		postgresql: any
		scala: any
	}
}