//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jrunscript.http.client {
	export type Pairs = { name: string, value: string }[] | { [x: string]: string | string[] }

	export interface Request {
		method?: string
		url: slime.web.Url | string
		params?: Pairs
		parameters?: Pairs
		headers?: Pairs
		authorization?: Authorization
		proxy?: any
		body?: request.Body
		timeout?: Timeouts
		on?: any
	}

	export namespace request {
		export type Body = body.Stream | body.Binary | body.String

		export namespace body {
			type Type = { type: slime.mime.Type | string }
			export type Stream = Type & { stream: slime.jrunscript.runtime.io.InputStream }
			export type Binary = Type & { read: { binary: () => slime.jrunscript.runtime.io.InputStream } }
			export type String = Type & { string: string }
		}
	}

	export interface Response {
		request: Request
		/**
		 * See https://datatracker.ietf.org/doc/html/rfc7230#section-3.1.2
		 */
		status: {
			code: number
			reason: string
		}
		headers: Header[]
		body: {
			type: slime.mime.Type
			//	TODO	Possibly should be slime.jrunscript.InputStream or slime.jrunscript.io.InputStream
			stream: slime.jrunscript.runtime.io.InputStream
		}
	}

	export interface Header {
		name: string
		value: string
	}

	type Authorization = string

	export namespace client {
		export interface request {
			(p: Request & { evaluate: JSON }): any
			<T>(p: Request & { evaluate: (Response) => T }): T
			<T>(p: Request & { parse: (Response) => T }): T
			(p: Request): Response
		}
	}

	export interface Client {
		request: client.request,
		Loader: any
	}

	export interface Context {
		debug: any
		gae: boolean
		api: {
			web: slime.web.Exports
			java: slime.jrunscript.host.Exports
			js: any
			io: slime.jrunscript.io.Exports
		}
	}

	export type spi = (
		p: {
			method: string
			url: slime.web.Url
			headers: Header[]
			proxy: any
			timeout: Timeouts
			body: Request["body"]
		}
	) => {
		status: {
			code: number
			reason: string
		}
		headers: Header[]
		stream: slime.jrunscript.runtime.io.InputStream
	}

	export namespace internal {
		export interface Cookies {
			set(url: slime.web.Url, headers: Header[])
			get(url: slime.web.Url, headers: Header[])
		}
	}

	export interface Proxy {
		http?: {
			host: any
			port: any
		}
		https?: {
			host: any
			port: any
		}
		socks?: {
			host: any
			port: any
		}
	}

	export interface Timeouts {
		connect: any
		read: any
	}

	export interface Exports {
		Client: new (configuration?: {
			authorization?: any
			spi?: (standard: spi) => spi
			proxy?: Proxy | ((p: Request) => Proxy)
			TREAT_302_AS_303?: boolean
		}) => Client

		Authentication: {
			Basic: {
				Authorization: (p: { user: string, password: string }) => Authorization
			}
		}

		test: {
			disableHttpsSecurity()
		}

		Body: any
		Loader: any
		Parser: any
	}
}