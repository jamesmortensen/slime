interface jsh {
	java: slime.jrunscript.host.Exports;
	http: slime.jrunscript.http.client;

	tools: {
		git: slime.jrunscript.git.Exports,
		hg: any,
		node: slime.jrunscript.node.Exports,
		install: any,
		github: slime.jrunscript.tools.github.Exports
	}

	script: {
		getopts: Function & { UNEXPECTED_OPTION_PARSER: any },
		file: slime.jrunscript.file.File,
		Application: any,
		loader: slime.Loader
	};

	shell: {
		console: (message: string) => void,
		exit: (code: number) => void,
		jsh: any,
		os: {
			name: string,
			process: {
				list: () => slime.jrunscript.shell.system.Process[]
			}
		}
		environment: any,
		echo: Function,
		run: Function & { stdio: any },
		embed: (p: { method: Function, argument: object, started: (p: { output?: string, error?: string }) => boolean }, events?: any ) => void,
		HOME: slime.jrunscript.file.Directory,
		PATH: any,
		TMPDIR: slime.jrunscript.file.Directory,
		PWD: slime.jrunscript.file.Directory,
		browser: any,
		listeners: any,
		system: {
			apple: {
				plist: {
					xml: {
						encode: Function,
						decode: Function
					}
				}
			}
		},
		stdio: any
	};

	unit: {
		mock: slime.jsh.unit.mock;
	}

	loader: any;
	js: any;
	document: any;
	file: any;
	time: any;
	ui: any;
	ip: any;
}

declare namespace Packages {
	const java: any
}

declare namespace jsh {
	//	Indexed access properties; see https://www.typescriptlang.org/docs/handbook/advanced-types.html#index-types

	const java: jsh['java'];
	const http: jsh['http'];

	const tools: jsh['tools'];
	const script: jsh['script'];
	const shell: jsh['shell'];
	const unit: jsh['unit'];

	const loader: jsh['loader'];
	const js: jsh['js'];
	const document: jsh['document'];
	const file: jsh['file'];
	const time: jsh['time'];
	const ui: jsh['ui'];
	const ip: jsh['ip'];
}