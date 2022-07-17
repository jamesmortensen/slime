//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.internal.jsh.launcher {
	export interface Context {
	}

	export interface Exports {
	}

	export namespace test {
		export interface Result {
			src: string
			home: string
			logging: string
			foo1: string
			foo2: string
			tmp: string
			rhino: {
				running: boolean
				optimization: number
				classpath: string
			}
		}

		export interface ShellInvocation {
			vmarguments?: slime.jrunscript.shell.invocation.Token[]
			bash?: string | slime.jrunscript.file.Pathname | slime.jrunscript.file.Directory
			logging?: string
			properties?: { [name: string]: string }
			shell?: slime.jrunscript.shell.invocation.Token[]
			script?: slime.jrunscript.file.File
			arguments?: slime.jrunscript.shell.invocation.Token[]
			environment: { [name: string]: string }
			stdio?: slime.jrunscript.shell.invocation.old.Stdio
			evaluate?: any
		}

		export interface ShellImplementation {
			type: "unbuilt" | "built"
			shell: slime.jrunscript.shell.invocation.Token[]
			coffeescript: slime.jrunscript.file.File
		}

		export interface Scenario {
			name: string
			execute: (verify: slime.definition.verify.Verify) => void
		}
	}

	// (
	// 	function($export: slime.loader.Export<Exports>) {
	// 		var fifty: slime.fifty.test.Kit = null;
	// 		var verify = fifty.verify;
	// 	}
	// )

	// (
	// 	function(
	// 		fifty: slime.fifty.test.Kit
	// 	) {
	// 		fifty.tests.suite = function() {

	// 		}
	// 	}
	// //@ts-ignore
	// )(fifty);

	export type Script = slime.loader.Script<Context,Exports>
}
