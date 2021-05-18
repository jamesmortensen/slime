//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jrunscript.io {
	interface Context {
		$slime: slime.jrunscript.runtime.Exports
		api: {
			java: slime.jrunscript.host.Exports
		}
		nojavamail: boolean
	}

	interface Exports {
		Streams: slime.jrunscript.runtime.io.Exports["Streams"]
		Buffer: slime.jrunscript.runtime.io.Exports["Buffer"]
		Resource: slime.jrunscript.runtime.Exports["Resource"]
		Loader: slime.jrunscript.runtime.Exports["Loader"]
		java: {
			adapt: any
		}
		mime: slime.jrunscript.io.mime.Exports
		archive: {
			zip: {
				encode: (p: {
					entries: { path: string, resource: slime.Resource }[]
					stream: slime.jrunscript.runtime.io.OutputStream
				}) => void

				decode: (p: {
					stream: slime.jrunscript.runtime.io.InputStream
					output: {
						file: (p: { path: string }) => slime.jrunscript.runtime.io.OutputStream
						directory: (p: { path: string }) => void
					}
				}) => void
			}
		}
		grid: any
	}
}