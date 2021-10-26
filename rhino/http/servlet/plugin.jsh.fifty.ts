//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jsh.httpd {
	export namespace servlet {
		export type byLoad = { load: (scope: slime.servlet.Scope) => void }
		export type byFile = { file: slime.jrunscript.file.File }
		type byResource = { resource: string }

		export type descriptor = (byLoad | byFile | byResource) & {
			parameters?: Parameters
		}

		export type Parameters = { [name: string]: any }
	}

	export interface Tomcat {
		base: slime.jrunscript.file.Directory

		port: number

		https: {
			port: number
		}

		map: (p: {
			path: string,
			resources?: slime.Loader,
			servlets?: { [pattern: string]: servlet.descriptor }
			webapp?: any
		}) => void

		/**
		 * Configures the given servlet as a single top-level servlet in this Tomcat server.
		 */
		servlet: (servlet: servlet.descriptor & { resources?: slime.Loader }) => void

		start: () => void

		run: () => void

		stop: () => void
	}

	export namespace tomcat {
		export interface Configuration {
			/**
			 * The port on which the server's HTTP service should run; if omitted, an ephemeral port will be used.
			 */
			port?: number

			/**
			 * The base directory against which the server should run; if omitted, a temporary directory will be used.
			 */
			base?: slime.jrunscript.file.Directory

			/**
			 * If present, describes an HTTPS service that should run.
			 */
			https?: {
				port: number
				keystore?: {
					file: slime.jrunscript.file.File
					password: string
				}
			}
		}
	}

	export interface Exports {
		nugget: any
		spi: {
			argument: (resources: slime.Loader, servlet: slime.jsh.httpd.servlet.descriptor) => {
				resources: slime.Loader,
				load: servlet.byLoad["load"],
				$loader?: slime.Loader
			}
		}
		Resources: slime.jsh.httpd.resources.Export
		Tomcat?: {
			new (p?: tomcat.Configuration): Tomcat

			serve: any
		}
		plugin: {
			tools: () => void
		}
		tools: {
			build: {
				(p: {

				}): void

				getJavaSourceFiles: (p: any) => any[]
			}
		}
	}
}