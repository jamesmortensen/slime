//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.tools.documentation {
	export interface Configuration {
		base: slime.jrunscript.file.Directory
		watch: boolean
	}

	export type factory = (p: slime.servlet.httpd) => slime.servlet.handler

	/**
	 * Using a configuration, creates a function capable of creating a servlet handler that can serve Typedoc documentation given
	 * the httpd API.
	 */
	export type implementation = (configuration: Configuration) => factory

	export namespace internal.asTextHandler {
		export type Context = { httpd: slime.servlet.httpd }
		export type Export = slime.servlet.httpd["Handler"]["Loader"];
		export type Factory = slime.loader.Product<Context,Export>
	}
}