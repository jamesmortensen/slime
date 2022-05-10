//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.$api {
	/**
	 * An occurrence in which other parts of a program might be interested. Events have a
	 */
	export interface Event<T> {
		type: string
		source: object
		timestamp: number
		detail: T
		path: any[]
	}

	export interface Events<D> {
		listeners: {
			add: <K extends keyof D>(type: K, handler: event.Handler<D[K]>) => void
			remove: <K extends keyof D>(type: K, handler: event.Handler<D[K]>) => void
		},
		fire: <K extends keyof D>(type: K, detail?: D[K]) => void
	}

	export namespace event {
		/**
		 * A function that receives events.
		 */
		export type Handler<T> = (e: Event<T>) => void
	}
}

namespace slime.runtime.internal.events {
	export interface Context {
		deprecate: slime.$api.Global["deprecate"]
	}

	export interface Export {
		create: (p?: {
			source?: any
			parent?: slime.$api.Events<any>
			getParent?: () => slime.$api.Events<any>
			on?: { [x: string]: any }
		}) => slime.$api.Events<any>

		Function: slime.$api.Global["Events"]["Function"]
		toHandler: slime.$api.Global["Events"]["toHandler"]
		action: slime.$api.Global["Events"]["action"]

		ask: slime.$api.fp.Exports["impure"]["ask"]
		tell: slime.$api.fp.Exports["impure"]["tell"]
	}
}
