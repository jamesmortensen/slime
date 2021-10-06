//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jrunscript.node {
	export interface Context {
		module: {
			file: any,
			shell: any
		},
		library: {
			install: any
		}
	}

	interface Version {
		number: string
	}

	export interface Installation {
		version: Version
		run: <T>(p: {
			command?: string
			project?: slime.jrunscript.file.Directory
			arguments?: Parameters<slime.jrunscript.shell.Exports["run"]>[0]["arguments"]
			directory?: Parameters<slime.jrunscript.shell.Exports["run"]>[0]["directory"]
			environment?: Parameters<slime.jrunscript.shell.Exports["run"]>[0]["environment"]
			stdio?: Parameters<slime.jrunscript.shell.Exports["run"]>[0]["stdio"]
			evaluate?: (p: any) => T
		}) => T
		modules: {
			installed: { [key: string]: { version: string } },
			install: Function,
			require: Function,
			uninstall: Function
		},
		npm: {
			run: (p: {
				command: string
				global?: boolean
				arguments?: string[]
				stdio?: any
				evaluate?: any
				directory?: slime.jrunscript.file.Directory
			}) => any
		}
	}

	export namespace install {
		export interface Events {
			console: string
		}
	}

	export interface Exports {
		Installation: new (o: { directory: slime.jrunscript.file.Directory }) => slime.jrunscript.node.Installation
		at: (p: { location: slime.jrunscript.file.Pathname }) => slime.jrunscript.node.Installation
		Project: Function,
		install: (
			p: {
				version?: string,
				location: slime.jrunscript.file.Pathname,
				update?: boolean
			},
			events?: slime.$api.events.Handler<install.Events>
		) => slime.jrunscript.node.Installation
	}
}