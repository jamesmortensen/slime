//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 * @param { slime.$api.Global } $api
	 * @param { slime.web.Context } $context
	 * @param { slime.web.Exports } $exports
	 */
	function($api,$context,$exports) {
		/**
		 * @param { string } string
		 * @returns { Pick<slime.web.object.url.Argument,"scheme" | "authority" | "path" | "fragment"> & { query: string } }
		 */
		var parse = function(string) {
			var matcher = /(?:([^\:\/\?\#]+)\:)?(?:\/\/([^\:\/\?\#]+))?(?:\:(\d+))?([^\?\#]*)(?:\?([^#]*))?(?:\#(.*))?/;
			var match = matcher.exec(string);

			var toNumber = function(portMatch) {
				return (portMatch) ? Number(portMatch) : portMatch;
			}

			//	TODO	does this code actually work if there is no port number?
			var authority = (match[2] || match[3]) ? { host: match[2], port: toNumber(match[3]) } : void(0);
			if (authority && authority.host) {
				var tokens = authority.host.split("@");
				if (tokens.length == 2) {
					authority.host = tokens[1];
					authority.userinfo = tokens[0];
				}
			}
			return {
				scheme: match[1],
				authority: authority,
				path: match[4],
				query: match[5],
				fragment: match[6]
			};
		};

		/**
		 *
		 * @param { slime.web.Url } url
		 */
		var toString = function(url) {
			return (function() {
				var rv = "";
				if (this.scheme) {
					rv += this.scheme + "://";
				}
				if (typeof(this.userinfo) != "undefined") {
					rv += this.userinfo + "@";
				}
				if (this.host) {
					rv += this.host;
				}
				if (typeof(this.port) != "undefined") {
					rv += ":" + this.port;
				}
				rv += this.path;
				if (typeof(this.query) != "undefined" && this.query !== null) {
					rv += "?" + this.query;
				}
				if (typeof(this.fragment) != "undefined" && this.fragment !== null) {
					rv += "#" + this.fragment;
				}
				return rv;
			}).call(url);
		}

		$exports.Url = Object.assign(
			/**
			 * @constructor
			 * @param { slime.web.object.url.Argument } o
			 */
			function(o) {
				this.scheme = o.scheme;
				this.path = o.path;
				this.fragment = o.fragment;

				["scheme","path","query","fragment"].forEach(function(item) {
					if (typeof(o[item]) != "undefined") {
						this[item] = o[item];
					}
				},this);
				if (o.authority) {
					this.userinfo = o.authority.userinfo;
					this.host = o.authority.host;
					this.port = o.authority.port;
				}

				if (typeof(o.query) == "object" && typeof(o.query.length) == "number") {
					this.query = $exports.Url.query(this.query);
				} else if (typeof(o.query) == "string") {
					this.query = o.query;
				}

				this.form = function() {
					if (typeof(this.query) == "undefined") return null;
					var form = new $exports.Form({ urlencoded: this.query });
					return form;
				}

				this.resolve = function(reference) {
					//	See http://tools.ietf.org/html/rfc3986#section-5.2
					//	particularly 5.2.2 for this pseudocode
					var R = parse(reference);
					var T = {};
					var Base = o;

					var defined = function(v) {
						return typeof(v) != "undefined";
					};

					var remove_dot_segments = function(s) {
						var tokens = s.split("/");
						var rv = [];
						for (var i=0; i<tokens.length; i++) {
							if (tokens[i] == ".") {
								//	no replacement, just remove
							} else if (tokens[i] == "..") {
								rv.splice(rv.length-1,1);
							} else {
								rv.push(tokens[i]);
							}
						}
						return rv.join("/");
					};

					var merge = function(base,relative) {
						if (base == "") return "/" + relative;
						var dir = base.substring(0,base.lastIndexOf("/")+1);
						return dir + relative;
					}

					if (defined(R.scheme)) {
						T.scheme = R.scheme;
						T.authority = R.authority;
						T.path = remove_dot_segments(R.path);
						T.query = R.query;
					} else {
						if (defined(R.authority)) {
							T.authority = R.authority;
							T.path = remove_dot_segments(R.path);
							T.query = R.query;
						} else {
							if (R.path == "") {
								T.path = Base.path;
								if (defined(R.query)) {
									T.query = R.query;
								} else {
									T.query = Base.query;
								}
							} else {
								if (R.path.substring(0,1) == "/") {
									T.path = remove_dot_segments(R.path);
								} else {
									T.path = merge(Base.path,R.path);
									T.path = remove_dot_segments(T.path);
								}
								T.query = R.query;
							}
							T.authority = Base.authority;
						}
						T.scheme = Base.scheme;
					}
					T.fragment = R.fragment;
					return new $exports.Url(T);
				}

				this.toString = function() {
					return toString(this);
				}
			},
			{
				codec: {
					string: {
						decode: function(string) {
							var argument = parse(string);
							return {
								scheme: argument.scheme,
								userinfo: (argument.authority && argument.authority.userinfo),
								host: (argument.authority && argument.authority.host),
								port: (argument.authority && argument.authority.port),
								path: argument.path,
								query: argument.query,
								fragment: argument.fragment
							}
						},
						encode: function(url) {
							return toString(url);
						}
					}
				},
				resolve: function(url, reference) {
					var object = $exports.Url.parse($exports.Url.codec.string.encode(url));
					return object.resolve(reference);
				},
				parse: void(0),
				query: void(0)
			}
		);
		$exports.Url.parse = function(string) {
			return new $exports.Url(parse(string))
		}
		$exports.Url.query = Object.assign(function(array) {
			return array.map(function(item) {
				return $context.escaper.encode(item.name) + "=" + $context.escaper.encode(item.value);
			}).join("&");
		},{ parse: void(0) });
		$exports.Url.query.parse = function(string) {
			return (function(string) {
				var decode = function(string) {
					return $context.escaper.decode(string);
				}

				if (!string) return null;
				var tokens = string.split("&");
				//jsh.shell.echo("tokens: " + tokens.length + " " + tokens);
				var rv = tokens.map(function(pair) {
					var split = pair.split("=");
					//jsh.shell.echo("split = " + split);
					if (split.length != 2) {
						return null;
					}
					return { name: decode(split[0]), value: decode(split[1]) }
				});
				var nulls = rv.filter(function(item) {
					return item === null;
				});
				return (nulls.length) ? null : rv;
			})(string);
		};

		var FORM_TYPE = $api.mime.Type.codec.declaration.decode("application/x-www-form-urlencoded");

		/**
		 * @constructor
		 */
		var Form = function(p) {
			//	See https://www.w3.org/TR/REC-html40/interact/forms.html#h-17.13.4
			/** @type { slime.web.form.Control[] } */
			var controls;

			/** @type { (p: slime.web.form.Argument) => p is slime.web.form.argument.UrlEncoded } */
			var isString = function(p) {
				return Boolean(p["urlencoded"]);
			}

			if (isString(p)) {
				controls = p.urlencoded.split("&").map(function(control) {
					var tokens = control.split("=");
					return {
						name: $context.escaper.decode(tokens[0]),
						value: $context.escaper.decode(tokens[1])
					};
				});
			} else if (p.controls && p.controls instanceof Array) {
				controls = p.controls;
			} else {
				throw new TypeError("Required: urlencoded or controls");
			}

			this.controls = controls;

			this.getUrlencoded = function() {
				return controls.map(function(item) {
					return $context.escaper.encode(item.name) + "=" + $context.escaper.encode(item.value);
				}).join("&");
			}

			this.getEntityBody = function() {
				return {
					type: FORM_TYPE,
					string: this.getUrlencoded()
				}
			}
		};

		/**
		 *
		 * @param { slime.web.form.Control[] } controls
		 * @returns { { [x: string]: string } }
		 */
		var controlsToObject = $api.fp.pipe(
			$api.fp.Array.map(
				/** @returns { readonly [string, string] } */
				function(control) {
					return [control.name,control.value]
				}
			),
			Object.fromEntries
		);

		/**
		 * @type { slime.web.exports.Form }
		 */
		var FormExport = {
			//	Present in Java; used here for (potentially flawed) TypeScript definition
			Multipart: void(0),
			//	TODO	make strongly-typed
			type: FORM_TYPE,
			construct: function(p) {
				return new Form(p);
			},
			codec: {
				urlencoded: {
					encode: function(form) {
						return new Form({ controls: form.controls }).getUrlencoded();
					},
					decode: function(string) {
						var object = new Form({ urlencoded: string });
						return {
							controls: object.controls
						}
					}
				}
			},
			object: function() {
				return function(form) {
					return controlsToObject(form.controls);
				}
			},
			Control: {
				isNamed: function(name) {
					return $api.fp.Predicate.property("name", $api.fp.is(name));
				}
			}
		}

		/**
		 * @constructor
		 * @param { slime.web.form.Argument } p
		 */
		$exports.Form = Object.assign(
			/**
			 * @constructor
			 * @param {*} p
			 * @returns
			 */
			function(p) {
				//	TODO	should error out if called as a function; this will not work in that case

				//			no idea why these properties must be declared this way
				this.controls = void(0);
				this.getUrlencoded = void(0);
				this.getEntityBody = void(0);

				Form.apply(this,arguments);
			},
			FormExport
		);

		if ($context.window) {
			$exports.window = new function() {
				this.url = function() {
					return $exports.Url.parse($context.window.location.href);
				};

				this.query = {
					controls: function() {
						return $api.fp.pipe(
							$exports.window.url,
							$api.fp.property("query"),
							$exports.Url.query.parse
						)(void(0))
					},
					object: function() {
						var controls = $exports.window.query.controls();
						if (controls === null) return null;
						return $api.fp.result(
							controls,
							$api.fp.Array.map(
								/** @returns { readonly [string, string] } */
								function(control) {
									return [control.name,control.value]
								}
							),
							Object.fromEntries
						)
					}
				}
			}
		}
	}
//@ts-ignore
)($api,$context,$exports)
