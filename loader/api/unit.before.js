//	LICENSE
//	The contents of this file are subject to the Mozilla Public License Version 1.1 (the "License"); you may not use
//	this file except in compliance with the License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
//	
//	Software distributed under the License is distributed on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either
//	express or implied. See the License for the specific language governing rights and limitations under the License.
//	
//	The Original Code is the SLIME loader infrastructure.
//	
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2010 the Initial Developer. All Rights Reserved.
//	
//	Contributor(s):
//	END LICENSE

$exports.Scenario = function(properties) {
	if (!properties) {
		throw new TypeError("'properties' argument must be present.");
	}
	var Scenario = arguments.callee;
	var scenario = this;
	
	this.name = properties.name;
	
	var Scope = function() {
		var self = this;
		if (Object.prototype.__defineGetter__) {
			var success = true;
			this.__defineGetter__("success", function() {
				return success;
			});
			var fail = function() {
				debugger;
				success = false;
			}
		} else {
			this.success = true;
			var fail = function() {
				debugger;
				self.success = false;
			}
		}

		this.scenario = function(object) {
			var child = new Scenario(object);
			var result = child.run(console);
			if (!result) {
				fail();
			}
		}

		this.test = function(assertion) {
			if (typeof(assertion) == "boolean") {
				assertion = {
					success: assertion
				}
			} else if (typeof(assertion) == "function") {
				this.test( assertion() );
				return;
			} else if (typeof(assertion) == "undefined") {
				throw "Assertion is undefined.";
			}
			if (!assertion.messages) assertion.messages = {};
			if (!assertion.messages.success) {
				assertion.messages.success = function() { return "Success." };
			}
			if (!assertion.messages.failure) {
				assertion.messages.failure = function() { return "FAILED!"; }
			}
			if (!assertion.success) {
				fail();
			}
			if (console.test) console.test(assertion);
		}

		this.start = function(console) {
			if (console.start) console.start(scenario);
		}

		this.end = function(console) {
			if (console.end) console.end(scenario, this.success);
		}
	}
	
	var run = function(console,callback) {
		var scope = new Scope();
		
		//	Could we use this to make syntax even terser?
		//	After a bunch of trying, I was able to get scope.test to be available
		//	to the callee as __parent__.test but not as test
		//	this.__parent__ = scope;
		//	this.test = scope.test;
		scope.start(console);
		
		var initializeAndExecute = function(scope) {
			if (properties.initialize) properties.initialize.call(this);
			properties.execute.call(this,scope);			
		}
		
		if (Scenario.HALT_ON_EXCEPTION) {
			initializeAndExecute.call(this,scope);
		} else {
			try {
				initializeAndExecute.call(this,scope);
			} catch (e) {
				scope.test({
					success: null,
					error: e,
					messages: new function() {
						this.failure = "Exception thrown: " + e;
					}
				});
			}
		}
		if (properties.destroy) {
			properties.destroy.call(this);
		}
		scope.end(console);
		if (callback) {
			callback.success(scope.success);
		}
		return scope.success;
	}
	
	this.start = function(console,callback) {
		run(console,callback);
	}

	this.run = function(console) {
		return run(console);
	}

	this.toString = function() {
		return "Scenario: " + this.name;
	}
}
$exports.Scenario.HALT_ON_EXCEPTION = false;
