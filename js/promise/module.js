var SlimePromise = function Targeter(p) {
	if (!p) p = {};
	var Promise = $context.Promise();
	
	if (typeof(p) == "function") {
		p = { executor: p };
	}
	
	var executor = (function(p) {
		if (p.executor) return p.executor;
		if (p.promise) return $api.deprecate(function() {
			return p.promise;
		})();
	})(p);
	
	var delegate = (p.delegate) ? p.delegate : void(0);

	if (!delegate && !executor) throw new TypeError("Required: either 'delegate' promise or 'executor' function");

	var wrap = function(v) {
		if (typeof(v) == "object" && v instanceof Promise) {
			return new Targeter({ delegate: v, target: p.target });
		} else {
			var lineForBreakpoint = 1;
		}
		return v;
	};

	var getDelegate = function() {
		if (!delegate) delegate = new Promise(executor);
		return delegate;
	}

	this.toString = function() {
		return p.toString();
	}

	this.target = function(target) {
		p.target = target;
	}

	this.then = function(resolved,rejected) {
		var args = [];
		if (arguments.length > 0) args.push(function() {
			return resolved.apply(p.target,arguments);
		});
		if (arguments.length > 1) args.push(function() {
			return rejected.apply(p.target,arguments);
		});
		var delegate = getDelegate();
		var toWrap = delegate.then.apply(delegate,args);
		return wrap(toWrap);
	};

	this.catch = function(rejected) {
		return getDelegate().catch(function() {
			return rejected.apply(p.target,arguments);
		});
	};
};

$exports.Promise = SlimePromise;

var Controllable = function(evaluator) {
	var resolveIt;

	this.toString = function() {
		return "Controllable Promise: " + promise;
	};

	var promise = new Promise(function(resolve,reject) {
		resolveIt = resolve;
	});

	this.then = function() {
		return promise.then.apply(promise,arguments);
	}

	this.resolve = function(value) {
		if (arguments.length == 0 && evaluator) {
			value = evaluator();
		}
		window.console.log("Resolving " + this + " to " + value);
		resolveIt(value);
	}
};

$exports.Controlled = Controllable;
