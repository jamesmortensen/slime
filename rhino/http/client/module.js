//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 * @param { slime.jrunscript.Packages } Packages
	 * @param { slime.$api.Global } $api
	 * @param { slime.jrunscript.http.client.Context } $context
	 * @param { slime.Loader } $loader
	 * @param { slime.jrunscript.http.client.Exports } $exports
	 */
	function(Packages,$api,$context,$loader,$exports) {
		Packages.java.lang.System.setProperty("sun.net.http.allowRestrictedHeaders", "true");

		(
			function verifyContext($context) {
				$context.property("api").require();
				$context.property("api","js").require();
				$context.property("api","js").require();
				$context.property("api","java").require();
				$context.property("api","web").require();
			}
		)($api.Value($context,"$context"));

		var code = {
			/** @type { slime.jrunscript.http.client.internal.cookies.Load } */
			cookies: $loader.factory("cookies.js")
		};

		var scripts = {
			cookies: code.cookies()
		};

		var allowMethods = function() {
			var methodsField = $context.api.java.toNativeClass(Packages.java.net.HttpURLConnection).getDeclaredField("methods");

			var modifiersField = $context.api.java.toNativeClass(Packages.java.lang.reflect.Field).getDeclaredField("modifiers");
			modifiersField.setAccessible(true);
			modifiersField.setInt(methodsField, methodsField.getModifiers() & ~Packages.java.lang.reflect.Modifier.FINAL);

			methodsField.setAccessible(true);

			var oldMethods = $context.api.java.Array.adapt(methodsField.get(null));
			var newMethods = oldMethods.concat(Array.prototype.slice.call(arguments));

			methodsField.set(
				null,
				$context.api.java.Array.create({
					type: Packages.java.lang.String,
					array: newMethods.map(function(s) { return new Packages.java.lang.String(s); })
				})
			);
		};

		allowMethods("PATCH");

		//	TODO	Pretty much all this does currently is log "Requesting:" followed by the URL being requested; should document and make
		//			this much more advanced; probably should configure at instance level, not module level
		var debug = ($context.debug) ? $context.debug : function(){};

		/**
		 * @this { slime.jrunscript.http.client.spi.Response["headers"] }
		 * @param { string } name
		 */
		function headersImplementationForGet(name) {
			var values = this
				.filter(function(header) { return header.name.toUpperCase() == name.toUpperCase() })
				.map(function(header) { return header.value; })
			;
			if (values.length == 0) return null;
			if (values.length == 1) return values[0];
			return values;
		}

		/**
		 *
		 * @param { slime.jrunscript.http.client.spi.Response["headers"] } headers
		 * @returns { slime.jrunscript.http.client.Response["headers"] }
		 */
		function withHeadersGet(headers) {
			/** @type { slime.jrunscript.http.client.Response["headers"] } */
			var rv = Object.assign(headers, { get: void(0) });
			rv["get"] = headersImplementationForGet;
			return rv;
		}

		/**
		 *
		 * @param { slime.jrunscript.http.client.request.Body } body
		 */
		function getRequestBodyType(body) {
			if (typeof(body.type) == "string") {
				return $api.mime.Type.codec.declaration.decode(body.type);
			} else if (!body.type) {
				//	TODO	Would be more accurate to return null and remove the content type, but this does not seem to work; Java
				//			seems to default to application/x-www-form-urlencoded
				return $api.mime.Type.codec.declaration.decode("application/octet-stream");
			} else {
				return body.type;
			}
		}

		/**
		 *
		 * @param { slime.jrunscript.http.client.request.Body } body
		 * @returns { slime.jrunscript.runtime.io.InputStream }
		 */
		function getRequestBodyStream(body) {
			//	TODO	Does not handle stream/$stream from rhino/mime
			//			above is a very old comment; may no longer apply

			/** @type { (body: slime.jrunscript.http.client.request.Body) => body is slime.jrunscript.http.client.request.body.Stream } */
			var isStream = function(body) {
				return Boolean(body["stream"]);
			}

			/** @type { (body: slime.jrunscript.http.client.request.Body) => body is slime.jrunscript.http.client.request.body.Binary } */
			var isBinary = function(body) {
				return Boolean(body["read"] && body["read"].binary);
			}

			/** @type { (body: slime.jrunscript.http.client.request.Body) => body is slime.jrunscript.http.client.request.body.String } */
			var isString = function(body) {
				return typeof body["string"] != "undefined";
			}

			if (isStream(body)) return body.stream;
			if (isBinary(body)) return body.read.binary();
			if (isString(body)) {
				var buffer = new $context.api.io.Buffer();
				buffer.writeText().write(body.string);
				buffer.writeText().close();
				return buffer.readBinary();
			}
			throw new TypeError("Body is not a recognized type: " + body);
		}

		var useJavaCookieManager = (function() {
			//	Currently we handle the bridge to Java properties here so as not to introduce a dependency on rhino/shell, but
			//	there may be a better way to deal with this;
			//	TODO	perhaps system properties should be moved into rhino/host
			var getProperty = function(name) {
				var _rv = Packages.java.lang.System.getProperty(name);
				if (_rv) return String(_rv);
				return null;
			}

			if ($context.gae) return false;
			if (getProperty("os.name") == "FreeBSD" && /^1\.6\.0/.test(getProperty("java.version"))) return false;
			return true;
		})();

		var Cookies = function() {
			if (!useJavaCookieManager) {
				return scripts.cookies.inonit();
			} else {
				return scripts.cookies.java();
			}
		};

		/**
		 * @type { slime.jrunscript.http.client.spi.implementation }
		 * @returns { slime.jrunscript.http.client.spi.Response }
		 */
		function spi(p) {
			/**
			 *
			 * @param { slime.jrunscript.native.java.net.URLConnection } $urlConnection
			 */
			var getResponseStatus = function($urlConnection) {
				if ($urlConnection.getResponseCode() == -1) {
					//	used to check for response message here, but at least one extant HTTP server (Stash) omits the OK
					throw new Error("Response was not valid HTTP: " + $urlConnection);
				}
				return {
					code: Number($urlConnection.getResponseCode()),
					reason: String($urlConnection.getResponseMessage())
				};
			};

			/**
			 *
			 * @param { slime.jrunscript.native.java.net.URLConnection } $urlConnection
			 * @returns { slime.jrunscript.http.client.Header[] }
			 */
			var getResponseHeaders = function($urlConnection) {
				var headers = [];
				var more = true;
				var i = 1;
				while(more) {
					var name = $urlConnection.getHeaderFieldKey(i);
					if (name != null) {
						var value = $urlConnection.getHeaderField(i);
						headers.push({name: String(name), value: String(value)});
					} else {
						more = false;
					}
					i++;
				}
				return headers;
			};

			/**
			 *
			 * @param { slime.jrunscript.native.java.net.URLConnection } $urlConnection
			 * @returns { slime.jrunscript.runtime.io.InputStream }
			 */
			var getResponseBodyStream = function($urlConnection) {
				var result = (function() {
					try {
						return $urlConnection.getInputStream();
					} catch (e) {
						return $urlConnection.getErrorStream();
					}
				})();
				return (result) ? $context.api.io.java.adapt(result) : null;
			}

			// var mode = {
			// 	proxy: p.proxy,
			// 	timeout: p.timeout
			// }

			var hostHeader;
			if (p.url.scheme == "https" && p.proxy && p.proxy.https) {
				//	Currently implemented by re-writing the URL; would be better to implement a tunnel through an HTTP proxy but
				//	could not get that working with Tomcat, which returned 400 errors when https requests are sent to http listener
				//	TODO	does this work for default port?
				hostHeader = p.url.host + ((p.url.port) ? ":" + p.url.port : "");
				p.url.host = p.proxy.https.host;
				p.url.port = p.proxy.https.port;
			}

			var $url = new Packages.java.net.URL(p.url.toString());
			debug("Requesting: " + p.url);

			var $urlConnection = (function(proxy) {
				if (!proxy) {
					return $url.openConnection();
				} else if (proxy.https) {
					return $url.openConnection();
				} else if (proxy.http || proxy.socks) {
					var _type = (function() {
						if (proxy.http) return {
							type: Packages.java.net.Proxy.Type.HTTP,
							specifier: proxy.http
						}
						if (proxy.socks) return {
							type: Packages.java.net.Proxy.Type.SOCKS,
							specifier: proxy.socks
						};
						throw new Error("Unrecognized proxy type in " + proxy);
					})();
					var _proxy = new Packages.java.net.Proxy(
						_type.type,
						new Packages.java.net.InetSocketAddress(_type.specifier.host,_type.specifier.port)
					);
					return $url.openConnection(_proxy);
				}
			})(p.proxy);

			$urlConnection.setRequestMethod(p.method);

			if (p.timeout) {
				if (p.timeout.connect) {
					$urlConnection.setConnectTimeout(p.timeout.connect);
				}
				if (p.timeout.read) {
					$urlConnection.setReadTimeout(p.timeout.read);
				}
			}

			if (hostHeader) {
				$urlConnection.addRequestProperty("Host",hostHeader);
			}
			p.headers.forEach( function(header) {
				$urlConnection.addRequestProperty(header.name,header.value);
			});

			$urlConnection.setInstanceFollowRedirects(false);

			if (p.body) {
				$urlConnection.setDoOutput(true);

				$urlConnection.setRequestProperty(
					"Content-Type",
					$api.mime.Type.codec.declaration.encode(getRequestBodyType(p.body))
				);

				$context.api.io.Streams.binary.copy(
					getRequestBodyStream(p.body),
					$context.api.io.java.adapt($urlConnection.getOutputStream()),
					{
						onFinish: function(from,to) {
							to.close();
						}
					}
				);
			}

			/** @type { slime.jrunscript.http.client.spi.Response } */
			var rv = {
				status: getResponseStatus($urlConnection),
				headers: getResponseHeaders($urlConnection),
				stream: getResponseBodyStream($urlConnection)
			}

			return rv;
		}

		/**
		 * @param { slime.jrunscript.http.client.Pairs } p
		 * @returns { { name: string, value: string }[] }
		 */
		var Parameters = function(p) {
			if (typeof(p) == "object" && p instanceof Array) {
				return p;
			} else if (typeof(p) == "object") {
				var rv = [];

				/** @type { (v: any) => v is Array } */
				var isArray = function(v) {
					return v instanceof Array;
				}

				/** @type { (v: any) => v is string } */
				var isString = function(v) {
					return typeof(v) == "string";
				}

				/** @type { (v: any) => v is number } */
				var isNumber = function(v) {
					return typeof(v) == "number";
				}

				for (var x in p) {
					var value = p[x];
					if (isString(value)) {
						rv.push({ name: x, value: value });
					} else if (isNumber(value)) {
						rv.push({ name: x, value: String(value) });
					} else if (typeof(value) == "object" && isArray(value)) {
						value.forEach( function(item) {
							rv.push({ name: x, value: item });
						});
					} else {
						throw new TypeError("Illegal argument to Parameters: property " + x + ": " + p[x]);
					}
				}
				return rv;
			} else {
				throw new TypeError("Illegal argument to Parameters: " + p);
			}
		}

		/**
		 *
		 * @param { slime.jrunscript.http.client.spi.Response } spiresponse
		 * @param { slime.jrunscript.http.client.Request } request
		 * @returns { slime.jrunscript.http.client.Response }
		 */
		var toResponse = function(spiresponse,request) {
			var type = (function() {
				var string = headersImplementationForGet.call(spiresponse.headers, "Content-Type");
				if (string) {
					return $context.api.io.mime.Type.parse(string);
				}
				return null;
			})();

			var rv = {
				request: request,
				status: $api.Object.compose(spiresponse.status, { message: spiresponse.status.reason }),
				headers: withHeadersGet(spiresponse.headers),
				body: {
					type: type,
					stream: spiresponse.stream
				}
			}

			$api.deprecate(rv.status, "message");

			return rv;
		};

		/**
		 *
		 * @param { slime.jrunscript.http.client.Configuration } configuration
		 * @param { slime.jrunscript.http.client.internal.Cookies } cookies
		 * @param { slime.jrunscript.http.client.Request } p
		 * @returns { slime.jrunscript.http.client.spi.Request }
		 */
		var interpretRequest = function(configuration,cookies,p) {
			var method = (p.method) ? p.method.toUpperCase() : "GET";
			var url = (function() {
				var rv = (typeof(p.url) == "string") ? $context.api.web.Url.parse(p.url) : p.url;
				if (p.params || p.parameters) {
					$api.deprecate(function() {
						//	First deal with really old "params" version
						if (p.params && !p.parameters) {
							p.parameters = p.params;
							delete p.params;
						}
						//	Then deal with slightly less old "parameters" version
						var string = $context.api.web.Url.query(Parameters(p.parameters));
						if (string) {
							if (rv.query) {
								rv.query += "&" + string;
							} else {
								rv.query = string;
							}
						}
					})();
				}
				return rv;
			})();
			var headers = (p.headers) ? Parameters(p.headers) : [];
			var authorization = (function() {
				if (configuration && configuration.authorization) return configuration.authorization;
				if (p.authorization) return p.authorization;
			})();
			if (authorization) {
				headers.push({ name: "Authorization", value: authorization });
			}

			var proxy = (function() {
				if (p.proxy) return p.proxy;
				if (configuration && configuration.proxy) {
					if (typeof(configuration.proxy) == "function") {
						return configuration.proxy(p);
					} else if (typeof(configuration.proxy) == "object") {
						return configuration.proxy;
					}
				}
			})();

			cookies.get(url,headers);

			return {
				method: method,
				url: url,
				headers: headers,
				body: p.body,
				proxy: proxy,
				timeout: p.timeout
			};
		}

		/**
		 *
		 * @param { slime.jrunscript.http.client.Configuration } configuration
		 */
		var Client = function(configuration) {
			var cookies = Cookies();

			/**
			 * @param { slime.jrunscript.http.client.Request & { evaluate?: any, parse?: any } } p
			 */
			this.request = function(p) {
				var spirequest = interpretRequest(configuration,cookies,p);
				var myspi = (configuration && configuration.spi) ? configuration.spi(spi) : spi;
				var spiresponse = myspi(spirequest);
				cookies.set(spirequest.url,spiresponse.headers);

				var isRedirect = function(status) {
					return (status.code >= 300 && status.code <= 303) || status.code == 307;
				}

				if (isRedirect(spiresponse.status)) {
					var redirectTo = headersImplementationForGet.call(spiresponse.headers, "Location");
					if (!redirectTo) throw new Error("Redirect without location header.");
					var redirectUrl = spirequest.url.resolve(redirectTo);
					//	TODO	copy object rather than modifying
					var rv = {};
					for (var x in p) {
						//	Treating 302 as 303, as many user agents do that; see discussion in RFC 2616 10.3.3
						//	TODO	document this, perhaps after designing mode to be more general
						var TREAT_302_AS_303 = (configuration && configuration.TREAT_302_AS_303);
						var IS_303 = (TREAT_302_AS_303) ? (spiresponse.status.code == 302 || spiresponse.status.code == 303) : spiresponse.status.code == 303;
						if (x == "method" && IS_303) {
							rv.method = "GET";
						} else if (x == "body" && IS_303) {
							//	leave body undefined
						} else {
							rv[x] = p[x];
						}
					}
					rv.url = redirectUrl;
					var callback = new function() {
						this.next = rv;
						this.request = p;
						this.response = spiresponse;
					};
					if (p.on && p.on.redirect) {
						p.on.redirect(callback);
					}
					//	rv.body is undefined
					return (callback.next) ? arguments.callee(callback.next) : toResponse(spiresponse, p);
				} else {
					var response = toResponse(spiresponse, p);

					var postprocessor = (function() {
						if (p.evaluate === JSON) {
							return function(response) {
								if (response.status.code >= 200 && response.status.code <= 299) {
									return JSON.parse(response.body.stream.character().asString());
								} else {
									throw new Error("Status code " + response.status.code);
								}
							}
						}
						if (p.evaluate) return p.evaluate;
						if (p.parse) return $api.deprecate(p.parse);
						return function(response) {
							return response;
						};
					})();

					return postprocessor(response);
				}
			}

			this.Loader = (function(parent) {
				return function(base) {
					return new $context.api.io.Loader({
						resources: new function() {
							this.toString = function() {
								return "rhino/http/client Loader: base=" + base;
							}

							this.get = function(path) {
								var url = base + path;
								var response = parent.request({
									url: url
								});
								if (response.status.code == 200) {
									var length = response.headers.get("Content-Length");
									var len = (length) ? Number(length) : null;
									return new $context.api.io.Resource({
										length: len,
										read: {
											binary: function() {
												return response.body.stream;
											}
										}
									});
								} else if (response.status.code == 404) {
									return null;
								} else {
									//	TODO	figure out what this API should do in this case
									throw new Error("Status when loading " + url + " is HTTP " + response.status.code);
								}
							}
						}
					});
				}
			})(this);
		}

		$exports.Client = Client;

		$exports.Authentication = {
			Basic: {
				/**
				 * @param { { user: string, password: string }} p
				 */
				Authorization: function(p) {
					return "Basic " + String(
						Packages.javax.xml.bind.DatatypeConverter.printBase64Binary(
							new Packages.java.lang.String(p.user + ":" + p.password).getBytes()
						)
					);
				}
			}
		}

		$exports.Body = new function() {
			var QueryString = function(string) {
				var decode = function(string) {
					return String(Packages.java.net.URLDecoder.decode(string, "UTF-8"));
				}

				var pairs = string.split("&").map( function(token) {
					var assign = token.split("=");
					return { name: decode(assign[0]), value: decode(assign[1]) };
				});

				return pairs;
			}
			QueryString.encode = function(array) {
				var encode = function(string) {
					return String(Packages.java.net.URLEncoder.encode(string, "UTF-8"));
				}

				return array.map( function(item) {
					return encode(item.name) + "=" + encode(item.value);
				}).join("&");
			};

			var UrlQuery = function(p) {
				if (typeof(p) == "string") {
					return QueryString(p);
				} else {
					return Parameters(p);
				}
			}

			this.Form = function(p) {
				var TYPE = $context.api.web.Form.type;
				if (p.form) {
					return {
						type: TYPE,
						string: p.form.getUrlencoded()
					}
				}
				return {
					type: TYPE,
					string: QueryString.encode(UrlQuery(p))
				};
			};

			this.Json = function(p) {
				return {
					type: "application/json",
					string: JSON.stringify(p)
				}
			};
		}

		$exports.Parser = new function() {
			this.ok = function(f) {
				return function(response) {
					if (response.status.code != 200) {
						var error = Object.assign(
							new Error("HTTP Status code: " + response.status.code + " message=" + response.status.message),
							{ page: response.body.stream.character().asString() }
						);
						throw error;
					}
					return f(response);
				}
			}

			this.OK = $api.deprecate(this.ok);
		}

		//	TODO	is this used anywhere?
		/** @constructor */
		$exports.Loader = function(client) {
			this.getCode = function(url) {
				client.request({
					url: url,
					parse: function(response) {
						if (response.status.code == 200) {
							return {
								name: url,
								_in: response.body.stream.java.adapt()
							};
						} else {
							throw new Error("Not found: " + url);
						}
					}
				});
			}
		};
	}
//@ts-ignore
)(Packages,$api,$context,$loader,$exports)
