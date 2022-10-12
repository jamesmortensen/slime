//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 *
	 * @param { slime.$api.fp.internal.impure.Context } $context
	 * @param { slime.loader.Export<slime.$api.fp.internal.impure.Exports> } $export
	 */
	function($context,$export) {
		/** @type { slime.$api.fp.impure.Exports } */
		var impure = {
			now: {
				input: function(input) {
					return input();
				},
				output: function(p, f) {
					f(p);
				},
				process: function(process) {
					process();
				}
			},
			Input: {
				value: function(v) {
					return function() {
						return v;
					}
				},
				map: function(input, map) {
					return function() {
						return map(input());
					}
				},
				process: function(input, output) {
					return function() {
						output(input());
					}
				}
			},
			Process: {
				compose: function(processes) {
					return function() {
						processes.forEach(function(process) {
							process();
						});
					}
				},
				output: function(p,f) {
					return function() {
						f(p);
					}
				}
			},
			tap: function(f) {
				return function(t) {
					f(t);
					return t;
				}
			}
		}

		var input = function(ask, handler) {
			return function() {
				var adapted = $context.events.ask(ask);
				return adapted(handler);
			}
		};

		/** @type { slime.$api.fp.world.Exports } */
		var world = {
			Question: {
				pipe: function(a,q) {
					return function(n) {
						return q(a(n));
					}
				},
				map: function(q,m) {
					return function(p) {
						return function(events) {
							var rv = q(p)(events);
							return m(rv);
						}
					}
				},
				wrap: function(a,q,m) {
					return world.Question.map(
						world.Question.pipe(a, q),
						m
					);
				}
			},
			question: function(question, handler) {
				return function(p) {
					var ask = question(p);
					var adapted = $context.events.ask(ask);
					return adapted(handler);
				}
			},
			action: function(action, handler) {
				return function(p) {
					var tell = action(p);
					var adapted = $context.events.tell(tell);
					adapted(handler);
				}
			},
			input: input,
			tell: function(tell, handler) {
				return function() {
					var adapted = $context.events.tell(tell);
					adapted(handler);
				}
			},
			now: {
				question: function(question, argument, handler) {
					var ask = question(argument);
					var adapted = $context.events.ask(ask);
					return adapted(handler);
				},
				action: function(action, argument, handler) {
					var tell = action(argument);
					var adapted = $context.events.tell(tell);
					adapted(handler);
				}
			},
			execute: function(tell, handler) {
				var adapted = $context.events.tell(tell);
				adapted(handler);
			},
			old: {
				ask: $context.events.ask,
				tell: $context.events.tell
			}
		}

		$export({
			impure: impure,
			world: world
		})
	}
//@ts-ignore
)($context,$export);