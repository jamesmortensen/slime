//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 *
	 * @param { slime.$api.Global } $api
	 * @param { slime.loader.Export<slime.definition.test.promises.Export> } $export
	 */
	function($api,$export) {
		//	TODO	this log message is because loading this more than once may cause it not to work; should come up with optimal
		//			strategy for dealing with this (either making it work or a strategy to prevent multiple loads or make a second
		//			load a no-op)
		window.console.log("loading loader/api/promises.js ..." + new Error("Stack trace").stack);

		/** @type { slime.definition.test.promises.internal.Events } */
		var events = $api.Events();

		var RegisteredPromise = (function(was) {
			/**
			 * @constructor
			 */
			function RegisteredPromise(executor) {
				console.log("Created RegisteredPromise with executor", executor.toString() + " from " + new Error("Stack trace").stack);
				this.then = void(0);
				this.catch = void(0);
				var rv = new was(executor);
				rv["executor"] = executor.toString();
				events.fire("created", rv);
				rv.then(function(value) {
					console.log("settled - fulfilled", rv, value);
					events.fire("settled", rv);
					return value;
				}).catch(function(error) {
					console.log("settled - rejected", rv, error);
					events.fire("settled", rv);
					throw error;
				})
				return rv;
			}
			//	Copy all properties
			for (var x in was) {
				RegisteredPromise[x] = was[x];
			}
			//	Make typescript happy if above didn't work

			//	At least in Chrome, this calls Promise constructor
			RegisteredPromise.resolve = was.resolve;
			RegisteredPromise.reject = was.reject;

			RegisteredPromise.race = was.race;
			RegisteredPromise.all = was.all;
			return RegisteredPromise;
		})(window.Promise);

		window.Promise = RegisteredPromise;

		var controlledPromiseId = 0;
		/**
		 *
		 * @returns { ReturnType<slime.definition.test.promises.Export["controlled"]> }
		 */
		var ControlledPromise = function() {
			var id = ++controlledPromiseId;
			var resolver;
			var rejector;
			var executor = function(resolve,reject) {
				resolver = function(value) {
					console.log("resolving ControlledPromise", id, value);
					resolve(value);
				};
				rejector = reject;
			}
			executor.toString = function() {
				return "<ControlledPromise " + id + ">";
			}
			var promise = new RegisteredPromise(executor);
			promise.toString = executor.toString;
			return {
				promise: promise,
				resolve: resolver,
				reject: rejector
			}
		};

		var Registry = function(p) {
			var name = (p && p.name);
			var list = [];

			var created = function(e) {
				console.log("registering created promise with", name, e.detail);
				list.push(e.detail);
			};

			events.listeners.add("created", created);

			//	Unused but could be used to remove promises when they are ressolved / caught, should that become necessary
			var remove = function(instance) {
				var index = list.indexOf(instance);
				if (index == -1) {
					console.log("Not registered with", name, instance, instance.toString());
				} else {
					list.splice(index,1);
				}
			};

			var settled = function(e) {
				remove(e.detail);
				if (list.length == 0) {
					controlled.resolve(void(0));
				} else {
					console.log("pending", name, list);
				}
			}

			events.listeners.add("settled", settled);

			var controlled = ControlledPromise();
			//	We used to use our own promises here and did not want the ControlledPromise to count as "registered." Now we just
			//	use the out-of-the-box Promise implementation for ControlledPromise objects.
			remove(controlled.promise);

			// var allSettled = function(promises) {
			// 	// /**
			// 	//  *
			// 	//  * @param { Promise<any> } promise
			// 	//  * @returns { Promise<any> }
			// 	//  */
			// 	// var settle = function(promise) {
			// 	// 	//	Not using .finally() to preserve IE compatibility, perhaps unwisely
			// 	// 	return promise.then(function(value) {
			// 	// 		console.log("settled - fulfilled", promise, value);
			// 	// 		remove(promise);
			// 	// 		return value;
			// 	// 	}).catch(function(e) {
			// 	// 		console.log("settled - rejected", promise, e)
			// 	// 		remove(promise);
			// 	// 		return e;
			// 	// 	});
			// 	// };

			// 	// return Promise.all(
			// 	// 	promises.map(settle)
			// 	// );

			// };

			return {
				wait: function() {
					console.log("waiting for list length", list.length, name, list);
					if (list.length == 0) {
						console.log("resolving wait promise for", name);
						controlled.resolve(void(0));
					}
					return controlled.promise.then(function() {
						console.log("wait promise resolved for", name);
						events.listeners.remove("created", created);
						events.listeners.remove("settled", created);
					});
				},
				test: {
					list: function() {
						return list;
					},
					clear: function() {
						list.splice(0,list.length);
					},
					setName: function(value) {
						name = value;
					}
				}
			}
		};

		$export({
			Promise: window.Promise,
			controlled: ControlledPromise,
			Registry: Registry,
			console: console
		})
	}
//@ts-ignore
)($api,$export);
