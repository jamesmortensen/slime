//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jrunscript.tools.profiler {
	export interface Scope {
		$context: Context
		$loader: slime.Loader
	}

	export interface Context {
		console: (message: string) => void
		profiles: slime.jrunscript.tools.profiler.Profile[]
		to: {
			html?: {
				location: slime.jrunscript.file.Pathname
				inline: {
					css: boolean
					json: boolean
					js: boolean
				}
			}
			json?: {
				location: slime.jrunscript.file.Pathname
			}
		}
	}

	export interface JavaCode {
		className: string
		methodName: string
		signature: string
	}

	export interface JavascriptCode {
		sourceName: string
		lineNumber?: number
		lineNumbers?: number[]
		functionName?: string
	}

	export interface SelfCode {
		self: Code
	}

	export type Code = JavaCode | JavascriptCode | SelfCode

	export interface Node {
		code: Code
		statistics: {
			count: number
			elapsed: number
		}
		children: Node[]
		self: SelfCode
	}

	export interface Profile {
		thread: {
			name: string
		}
		timing: {
			root: Node
		}
	}
}