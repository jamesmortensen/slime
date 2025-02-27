//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

(
	function() {
		$loader.run("initialize.js", { $api: $api });
		var asynchrony = window.XMLHttpRequest.asynchrony;

		var OldStep = function(o) {
			this.before = function() {
				if (o.edits) {
					o.edits();
				}
			};

			this.run = function() {
				if (o.event) {
					o.event();
				}
			};

			this.promise = function() {
				var running = asynchrony.promise();
				if (o.event) {
					o.event();
				}
				new window.Promise(function fake(resolve,reject) {
					resolve();
				}).then(function() {
				})
				return running;
			};

			this.async = o.wait || !o.event;

			this.after = function(scope) {
				if (o.tests) {
					o.tests(scope);
				}
		//		scope.fail();
				if (o.cleanup) {
					o.cleanup();
				} else if (o.undo) {
					$api.deprecate(function() {
						o.undo();
					})();
				}
			};
		};

		var Step = function(target,o) {
			this.before = function(scope) {
				if (o.setup) {
					$api.deprecate(function() {
						o.setup.call(target);
					})();
				}
				var verify = new $context.api.unit.Verify(function(f) {
					scope.test(f);
				});
				if (o.before) {
					o.before.call(target,verify);
				}
			};

			this.run = function() {
				var fake = {
					toString: function() {
						return "Asynchronous wrapper for " + ((o.run) ? o.run.toString() : " empty run()");
					}
				};
				asynchrony.started(fake);
				if (o.run) {
					o.run.call(target);
				}
				asynchrony.finished(fake);
			};

			this.promise = function() {
				var running = asynchrony.promise();
				if (o.run) {
					o.run.call(target);
				}
				new window.Promise(function fake(resolve,reject) {
					resolve();
				}).then(function() {
				})
				return running;
			}

			this.async = true;

			this.after = function(scope) {
				var verify = new $context.api.unit.Verify(function(f) {
					scope.test(f);
				});
				if (o.check) {
					$api.deprecate(function() {
						o.check.call(target,verify);
					})();
				}
				if (o.after) {
					o.after.call(target,verify);
				}
				if (o.cleanup) {
					$api.deprecate(function() {
						o.cleanup.call(target);
					})();
				}
			}
		};

		var Set = function(p) {
			var target = {};
			var steps = [];
			var index = 0;
			var success = true;
			var next;

			//	Possibly this should become a constructor argument rather than a modifier method at some point
			this.target = function(page) {
				target = page;
			}

			this.test = function(test) {
				if (test.edits || test.event || test.tests) {
					steps.push(new OldStep(test));
				} else {
					steps.push(new Step(target,test));
				}
			}

			this.next = function(f) {
				next = f;
			}

			var evaluateTests = function(index) {
				if (index < 0) return;
				steps[index].after(p.scope);
				if (!p.scope.success) success = false;
			}

			var proceed = function() {
				evaluateTests(index-1);
				fire();
			}

			var fire = function() {
				var step = steps[index];
				if (step) {
					step.before(p.scope);
					index++;
					step.run();
					if (!step.async) {
						proceed();
					}
				} else {
					if (p.events) p.events.fire("end", (index > 0) ? success : true);
					if (p.scope.fire) p.scope.fire("end", { success: (index > 0) ? success : true });
					if (next) next();
				}
			}

			//	TODO	arguably should get rid of window and put these in $context

			this.run = function() {
				asynchrony.next(proceed);

				if (!asynchrony.open()) fire();
			}

			this.promise = function promiseForSet() {
				return new $context.api.Promise(function(resolve,reject) {
					var success = true;
					var promise = $context.api.Promise.resolve();
					for (var i=0; i<steps.length; i++) {
						(function(step) {
							promise = promise.then(function() {
								step.before(p.scope);
							}).then(function() {
								window.console.log(asynchrony.toString());
								return step.promise();
							}).then(function() {
								step.after(p.scope);
								if (!p.scope.success) {
									success = false;
								}
							});
						})(steps[i]);
					}
					promise.then(function() {
						if (p.events) p.events.fire("end", (index > 0) ? success : true);
						if (p.scope.fire) p.scope.fire("end", { success: (index > 0) ? success : true });
						resolve(success);
					});
				});
			}
		};

		var global = new function() {
			var target;

			var tests = [];

			this.target = function(page) {
				target = page;
			};

			this.getTarget = function() {
				return target;
			};

			var Old = function() {
				var Tests = function() {
					var events = $api.Events({ source: this });
					var scope = new $context.api.unit.EventsScope({ events: events });

					var set = new Set({ events: events, scope: scope });

					this.target = function(page) {
						set.target(page);
					};

					this.test = function(test) {
						set.test(test);
					};


					//	TODO	this is used by the unit test button to run the tests; could encapsulate
					this.run = function(next) {
						set.run(next);
					};
				};

				var global = new Tests();

				this.structure = function() {
					return {
						name: "Tests",
						old: true
					};
				};

				this.run = function(_callbacks) {
					if (!_callbacks) throw new Error("Missing callbacks!");
					global.listeners.add("console", function(e) {
						window.console.log(e.detail);
					});
					global.listeners.add("test", function(e) {
						if (_callbacks.event) _callbacks.event(e);
						_callbacks.log(e.detail.success, e.detail.message);
					});
					global.listeners.add("end", function(e) {
						_callbacks.end(e.detail);
						if (_callbacks.after) {
							//	TODO	deprecated; should combine after() with end(success)
							debugger;
							_callbacks.after();
						}
					});
					global.listeners.add("log", function(e) {
						_callbacks.log(e.detail.success, e.detail.message);
					});
					global.target(target);
					for (var i=0; i<tests.length; i++) {
						global.test(tests[i]);
					}
					global.run();
				}
			};

			var New = function(suite) {
				var getStructure = function(part) {
					var rv = {
						id: part.id,
						name: part.name
					};
					if (part.parts) {
						var parts = part.parts;
						rv.parts = {};
						for (var x in parts) {
							rv.parts[x] = getStructure(parts[x]);
						}
					}
					return rv;
				};

				this.structure = function() {
					return getStructure(suite);
				};

				var path;

				this.path = function() {
					path = arguments[0];
				}

				this.run = function(_callbacks) {
					suite.listeners.add("scenario", function(e) {
			//				_callbacks.fire(e);
						console.log("scenario", Object.keys(e.detail).join(","), e);
						_callbacks.event(e);
					});
					suite.listeners.add("test", function(e) {
						console.log("test", Object.keys(e.detail).join(","), e.detail.message, e);
			//				_callbacks.fire(e);
						_callbacks.event(e);
					});
					suite.run({ path: path },function(success) {
						console.log("success = " + success);
						_callbacks.end(success);
						//	TODO	this should not have to be hacked in manually
						// _callbacks.event({
						// 	type: "scenario",
						// 	detail: {
						// 		end: {
						// 			id: suite.id,
						// 			name: suite.name
						// 		},
						// 		success: success
						// 	},
						// 	path: [],
						// 	timestamp: new Date()
						// });
						//	Stop asynchronous events from being delivered
						asynchrony.next(null);
					});
				};

				if ($context.api && $context.api.Promise) {
					this.promise = function(_callbacks) {
						var self = this;
						return new $context.api.Promise(function(resolve,reject) {
							resolve(self.run(_callbacks));
						});
					}
				}
			};

			var delegate = new Old();

			this.test = function() {
				tests.push(arguments[0]);
			}

			this.suite = function() {
				delegate = new New(arguments[0]);
			};

			this.path = function(path) {
				delegate.path(path);
			}

			this.structure = function() {
				return delegate.structure();
			};

			this.run = function(_callbacks) {
				return delegate.run(_callbacks);
			};

			this.promise = function(_callbacks) {
				if (!delegate.promise) throw new Error();
				return delegate.promise(_callbacks);
			}
		};

		var Scenario = function() {
			var target;

			var getTarget = function() {
				if (target) return target;
				return global.getTarget();
			};

			var tests = [];
			var next;

			this.next = function(f) {
				next = f;
			}

			this.target = function(page) {
				target = page;
			};

			this.test = function(t) {
				tests.push(t);
			};

			var createSet = function(verify) {
				var set = new Set({ scope: verify.scope });
				set.target(getTarget());
				if (next) set.next(next);
				tests.forEach(function(test) {
					set.test(test);
				});
				return set;
			}

			this.execute = function(scope,verify) {
				var set = createSet(verify);
				set.run();
			}

			this.promise = function(scope,verify) {
				var set = createSet(verify);
				return set.promise();
			}
		}

		$exports.target = function(page) {
			global.target(page);
		};

		$exports.Scenario = function() {
			Scenario.call(this);
		};

		//	undocumented; can be used for creating webview for tests
		$exports.structure = function() {
			return global.structure();
		}

		$exports.suite = function() {
			global.suite(arguments[0]);
		}

		$exports.setPath = function() {
			global.path(arguments[0]);
		}

		$exports.test = $api.deprecate(function(test) {
			global.test(test);
		});

		//	TODO	this is used by the unit test button to run the tests; could encapsulate
		//	undocumented as it does not currently need to be directly called; called only by UI
		$exports.run = function(_callbacks) {
			global.run(_callbacks);
		};

		//	currently undocumented
		$exports.promise = function(_callbacks) {
			return global.promise(_callbacks);
		}

		//	currently undocumented
		$exports.fire = $loader.module("events.js");

		//	currently undocumented
		//	TODO	this appears unused. Deprecating for now, pending more thorough check
		$exports.ui = $api.deprecate(function() {
			var unit = this;

			var loadUnitTests = function() {
				var testing = document.createElement("div");
				var heading = document.createElement("h1");
				heading.appendChild(document.createTextNode("Unit Tests"));
				testing.appendChild(heading);
				var results = document.createElement("table");
				testing.appendChild(results);
				var resultsHead = results.createTHead();
				var resultsHeadRow = resultsHead.insertRow(-1);
				var resultsResultTh = resultsHeadRow.insertCell(-1);
				resultsResultTh.appendChild(document.createTextNode("Result"));
				var resultsMessageTh = resultsHeadRow.insertCell(-1);
				resultsMessageTh.appendChild(document.createTextNode("Message"));

				var unitButton = document.createElement("input");
				unitButton.setAttribute("type", "button");
				unitButton.setAttribute("value", "Unit tests");
				document.body.insertBefore(unitButton,document.body.firstChild);
				unitButton.onclick = function(e) {
					document.body.insertBefore(testing,document.body.firstChild);
					unit.run(new function() {
						var addRow = function(b,message) {
							var tbody = results.tBodies[0];
							if (!tbody) {
								results.appendChild(document.createElement("tbody"));
								tbody = results.tBodies[0];
							}
							var index = (tbody.rows.length == 0) ? 0 : tbody.rows.length-1;
							var row = tbody.insertRow(index);
							var result = row.insertCell(-1);
							result.appendChild(document.createTextNode( (b) ? "Success" : "Failure" ));
							var messageTd = row.insertCell(-1);
							messageTd.appendChild(document.createTextNode( message ));
							return row;
						}
						var last = addRow(false,"Incomplete");
						this.log = function(b,message) {
							addRow(b,message);
						}
						//	TODO	combine these two methods
						this.end = function(b) {
							addRow(b,"OVERALL");
							results.deleteRow(results.rows.length-1);
							unitButton.parentNode.removeChild(unitButton);
						}
					});
				}
			};

			loadUnitTests();
		})
	}
)();
