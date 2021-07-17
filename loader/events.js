//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 *
	 * @param { slime.runtime.internal.events.Context } $context
	 * @param { slime.loader.Export<slime.runtime.internal.events.Export> } $export
	 */
	function($context,$export) {
		/**
		 * @constructor
		 * @param { Parameters<slime.$api.Global["Events"]>[0] } [p]
		 */
		var Emitter = function(p) {
			if (!p) p = {};

			var source = (p.source) ? p.source : this;

			/** @returns { { bubble: (event: slime.$api.Event<any>) => void } } */
			var getParent = function() {
				/** @returns { { bubble: (event: slime.$api.Event<any>) => void } } */
				var castToInternal = function(events) {
					return events;
				}

				if (p.parent) return castToInternal(p.parent);
				if (p.getParent) return castToInternal(p.getParent());
			}

			/**
			 * @type { { [type: string]: slime.$api.event.Handler<any>[] } }
			 */
			var byType = {};

			/** @type { new (type: string, detail: any) => slime.$api.Event } */
			var Event = function(type,detail) {
				this.type = type;
				this.source = source;
				this.timestamp = Date.now();
				this.detail = detail;
				this.path = [];

				//	TODO	consider greater compatibility:
				//	http://www.w3.org/TR/2000/REC-DOM-Level-2-Events-20001113/events.html#Events-interface
			};

			/**
			 * @type { slime.$api.Events<{ [name: string]: any }>["listeners"] }
			 */
			var listeners = {
				add: function(name,handler) {
					if (!byType[name]) {
						byType[name] = [];
					}
					byType[name].push(handler);
				},

				remove: function(name,handler) {
					if (byType[name]) {
						var index = byType[name].indexOf(handler);
						if (index != -1) {
							byType[name].splice(index,1);
						}
					}
				}
			};

			//	TODO	capability is undocumented. Document? Deprecate? Remove?
			for (var x in p.on) {
				listeners.add(x,p.on[x]);
			}

			this.listeners = listeners;

			//	TODO	roadmap: after some uses of this have been removed, add an optional 'old' property to allow this behavior
			//			but overall we should not be adding arbitrary properties to an object just because it is an event emitter
			if (p.source) {
				p.source.listeners = new function() {
					this.add = $context.deprecate(function(name,handler) {
						listeners.add(name, handler);
					});

					this.remove = $context.deprecate(function(name,handler) {
						listeners.remove(name, handler);
					})
				};
			}

			/**
			 *
			 * @param { slime.$api.Event<any> } event
			 */
			function handle(event) {
				if (byType[event.type]) {
					byType[event.type].forEach(function(listener) {
						//	In a DOM-like structure, we would need something other than 'source' to act as 'this'
						listener.call(source,event)
					});
				}
				var parent = getParent();
				if (parent) {
					//	TODO	this appears to be a bug; would the path not consist of the source object several times in a row,
					//			once for each bubble? Possibly this should be event.path.unshift(this)? Should write test for path
					//			and see
					event.path.unshift(source);
					parent.bubble(event);
				}
			}

			//	Private method; used by children to send an event up the chain.
			Object.defineProperty(
				this,
				"bubble",
				{
					/**
					 *
					 * @param { slime.$api.Event<any> } event
					 */
					value: function(event) {
						handle(event);
					}
				}
			);

			this.fire = function(type,detail) {
				handle(new Event(type,detail));
			}
		};

		var ListenersInvocationReceiver = function(on) {
			var source = {};
			var events = new Emitter({ source: source });

			this.attach = function() {
				for (var x in on) {
					source.listeners.add(x,on[x]);
				}
			};

			this.detach = function() {
				for (var x in on) {
					source.listeners.remove(x,on[x]);
				}
			};

			this.emitter = events;
		};

		var listening = function(f,defaultOn) {
			var EmitterInvocationReceiver = function(emitter) {
				this.attach = function(){};
				this.detach = function(){};
				this.emitter = emitter;
			}

			return function(p,receiver) {
				var invocationReceiver = (receiver instanceof Emitter)
					? new EmitterInvocationReceiver(receiver)
					: new ListenersInvocationReceiver(
						(function() {
							if (receiver) return receiver;
							if (defaultOn) return defaultOn;
							return {};
						})()
					)
				;
				invocationReceiver.attach();
				try {
					return f.call( this, p, invocationReceiver.emitter );
				} finally {
					invocationReceiver.detach();
				}
			}
		};

		/**
		 *
		 * @param { Parameters<slime.$api.fp.Exports["impure"]["ask"]>[0] } f
		 */
		function ask(f) {
			var rv = function(on) {
				var receiver = new ListenersInvocationReceiver(on);
				receiver.attach();
				try {
					return f.call(this, receiver.emitter);
				} finally {
					receiver.detach();
				}
			}
			return rv;
		}

		/**
		 *
		 * @param { Parameters<slime.$api.fp.Exports["impure"]["tell"]>[0] } f
		 */
		function tell(f) {
			var rv = function(on) {
				var receiver = new ListenersInvocationReceiver(on);
				receiver.attach();
				try {
					f.call(this, receiver.emitter);
				} finally {
					receiver.detach();
				}
			}
			return rv;
		}

		$export({
			/**
			 * @param { Parameters<slime.$api.Global["Events"]>[0] } p
			 */
			create: function(p) {
				return new Emitter(p);
			},
			Function: listening,
			//@ts-ignore
			ask: ask,
			//@ts-ignore
			tell: tell,
			toHandler: function(handler) {
				return new ListenersInvocationReceiver(handler);
			},
			action: function(f) {
				return function(handler) {
					var invocationReceiver = new ListenersInvocationReceiver(handler);
					invocationReceiver.attach();
					try {
						return f.call( this, invocationReceiver.emitter );
					} finally {
						invocationReceiver.detach();
					}
				}
			}
		});
	}
//@ts-ignore
)($context,$export);