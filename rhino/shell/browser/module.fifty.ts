//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jrunscript.shell.browser {
	export interface Context {
		api: {
			js: any
			java: any
			file: any
			httpd: {
				Tomcat: new (p: {}) => jsh.httpd.Tomcat
			}
		}
		os: any
		run: any
		HOME: slime.jrunscript.file.Directory
		TMPDIR: slime.jrunscript.file.Directory
		environment: any
	}

	export interface ProxyConfiguration {
		/**
		 * JavaScript code for a Proxy Auto-Configuration file, allowing the use of JavaScript code to define the mapping between
		 * hosts and proxies. See the [Mozilla Developer Network](https://developer.mozilla.org/en-US/docs/Web/HTTP/Proxy_servers_and_tunneling/Proxy_Auto-Configuration_PAC_file)
		 * for documentation of this format.
		 */
		code?: string

		/** @deprecated Use `code`. */
		pac?: string

		port?: number
	}

	export interface ProxyTools {
		Server: () => {
			url: string
			start: () => void
			stop: () => void
		}
		code: string
		response: slime.servlet.Response
	}

	export interface Exports {
		inject: any

		chrome: object.Chrome

		Chrome: {
			getMajorVersion: (chrome: Chrome) => number

			Installation: (p: {
				/**
				 * The Chrome executable for this installation.
				 */
				 program: string

				/**
				 * The default user data directory for this installation.
				 */
				user: string
			}) => object.Chrome
		}

		installed: {
			/**
			 * An object representing the global Chrome installation, or `undefined` if it is not installed or not detected.
			 */
			chrome: Chrome
		}

		ProxyConfiguration: (o: ProxyConfiguration) => ProxyTools
	}
}
