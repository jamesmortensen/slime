//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jsh {
	export interface Global {
		ui: {
			application: (
				p: slime.jsh.ui.application.Argument,
				events?: $api.events.Function.Receiver
			) => {
				port: number
				server: any
				browser: any
			}

			askpass: any
			javafx: any
			Chrome: any

			/**
			 * Deprecated; replaced by application
			 */
			browser: slime.jsh.Global["ui"]["application"]
		}
	}
}

namespace slime.jsh.ui.application {
	export namespace internal {
		export interface Exports {
			Application: slime.jsh.Global["ui"]["application"]
		}
	}

	export interface ServerConfiguration {
		/**
		 * See {@link slime.jsh.httpd.tomcat.Configuration}.
		 */
		port?: number

		https?: slime.jsh.httpd.tomcat.Configuration["https"]

		resources: slime.Loader
		parameters?: slime.jsh.httpd.servlet.Parameters
		servlet: slime.jsh.httpd.servlet.descriptor
	}

	export interface ServerRunning {
		server: slime.jsh.httpd.Tomcat
	}

	export type ServerSpecification = ServerRunning | ServerConfiguration

	export interface ChromeConfiguration {
		location?: slime.jrunscript.file.Pathname
		directory?: slime.jrunscript.file.Directory
		browser?: boolean
		debug?: {
			port?: number
		}
		hostrules?: string[]
	}

	export interface BrowserSpecification {
		proxy?: slime.jrunscript.shell.browser.ProxyConfiguration
			| ( (p: { port: number }) => slime.jrunscript.shell.browser.ProxyConfiguration )

		/**
		 * If `proxy` is not specified, this value provides a simple way of mapping all requests for the given host to the HTTP
		 * port of the application's server, and routing all other requests to their hosts.
		 */
		host?: string

		chrome?: ChromeConfiguration

		run?: any
		zoom?: any
		console?: any
		create?: any
	}

	export type BrowserConfiguration = BrowserSpecification | ((p: any) => void)

	interface ClientSpecification {
		browser: BrowserConfiguration

		url?: string

		/**
		 * The path in the server application to open when opening the application.
		 */
		path?: string
	}

	interface EventsConfiguration {
		close: () => void
	}

	interface EventsSpecification {
		on?: EventsConfiguration
	}

	interface Deprecated {
		/** @deprecated */
		zoom?: any
		/** @deprecated */
		console?: any
	}

	export type Argument = ServerSpecification & ClientSpecification & EventsSpecification & Deprecated
}
