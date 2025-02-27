//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime {
	export namespace mime {
		/**
		 * A MIME type.
		 */
		export interface Type {
			/**
			 * The MIME media type for this type; for `text/plain`, `"text"`.
			 */
			media: string

			/**
			 * The MIME subtype for this type; for `text/plain`, `"plain"`.
			 */
			subtype: string

			/**
			 * Each property of the object represents a MIME type parameter of the form *`name`*=*`value`* that will be appended to
			 * the MIME type. The name of the property is the name of the parameter, while the value of the property is the value of
			 * the parameter.
			 */
			parameters: { [x: string]: string }
		}

		/**
		 * @deprecated
		 */
		 export interface Object extends Type {
			/**
			 * @deprecated
			 * @param string
			 */
			is(string: string): boolean

			/**
			 * Returns a string representation of this MIME type, suitable for a MIME type declaration.
			 */
			toString(): string
		}
	}

	export interface Resource {
		/**
		 * The name of the resource, if available.
		 */
		name: string

		/**
		 * The type of the resource, or `null` if the type cannot be determined. If no type was specified, and a name
		 * was specified, the implementation will attempt to deduce the type from the name.
		 */
		type: mime.Type,

		/**
		 * Provides the content of this resource in a format specified by its argument.
		 */
		read?: {
			/**
			 * Returns the content of this resource as a string.
			 */
			(p: StringConstructor): string

			/**
			 * Returns the content of this resource as JSON.
			 */
			(p: JSON): any

			//  XML, XMLList allowed
			/**
			 * @deprecated E4X is deprecated.
			 *
			 * Allows the XML and XMLList constructors as arguments, and returns the resource as an E4X `type="xml"` object.
			 */
			(p: any): any

			string: () => string
		}
	}

	export namespace resource {
		export interface ReadInterface {
			/**
			 * Returns the content of the resource as a string.
			 */
			string?: () => string
		}

		/**
		 * An object that provides the implementation for a {@link slime.Resource}.
		 */
		export interface Descriptor {
			//	TODO	remove mime.Type
			/**
			 * The MIME type of the resource.
			 */
			type?: string | mime.Type

			/**
			 * The name of the resource. May be used (by file extension, for example) to determine the type of the file.
			 */
			//	TODO	should we provide default implementation of this property that sets it to the basename as determined by
			//			path? Or to the full path?
			name?: string

			read?: ReadInterface
		}
	}

	/**
	 * Generally speaking, the SLIME runtime is responsible for providing basic constructs to SLIME embeddings.
	 *
	 * The SLIME runtime (`expression.js`) is an expression that evaluates to an object providing its capabilities to
	 * the embedder.
	 *
	 * Embeddings must supply two values in the scope when executing the runtime. They must supply a value for `$engine` that is either
	 * `undefined` or is a value of type {@link $engine} specifying information about the underlying JavaScript engine, and
	 * they must supply a value for `$slime` of type {@link slime.runtime.$slime.Deployment | $slime.Deployment} that provides information about the SLIME installation.
	 *
	 * In return, the embedding will be supplied with an {@link Exports} object that provides the SLIME runtime.
	 *
	 * All code loaded by the SLIME runtime has access to the {@link $api} object (as `$api`), providing a basic set of JavaScript
	 * utilities, and a {@link $platform} object (as `$platform`), providing more advanced JavaScript engine capabilities that
	 * depend on the underlying JavaScript engine.
	 *
	 * [Older documentation](src/loader/api.html)
	 */
	export namespace runtime {
		(
			function(
				fifty: slime.fifty.test.Kit
			) {
				fifty.tests.runtime = {
					exports: fifty.test.Parent()
				};
			}
		//@ts-ignore
		)(fifty);

		export namespace $slime {
			export interface TypeScript {
				compile: (code: string) => string
			}

			export interface CoffeeScript {
				compile: (code: string) => string
			}

			export interface Script {
				name: string
				js: string
			}

			/**
			 * An object providing access to the SLIME execution environment.
			 */
			export interface Deployment {
				/**
				 * Provides a component source file of the runtime.
				 * @param path The path to a SLIME source file, relative to `expression.js`.
				 * @returns An executable JavaScript script. The code contained in the source file. **This interface may change to return an instance of the *script* type.**
				 */
				getRuntimeScript(path: string): Script

				/**
				 * Should provide an implementation of CoffeeScript, if one is present.
				 *
				 * @returns An object containing the CoffeeScript implementation, or `null` if CoffeeScript is not present.
				 */
				getCoffeeScript?(): {
					/**
					 * The JavaScript code for the CoffeeScript object, which can be executed to produce the CoffeeScript object.
					 */
					code?: string

					/**
					 * The CoffeeScript object.
					 */
					object?: CoffeeScript
				}

				typescript?: TypeScript

				flags?: {
					[name: string]: string
				}
			}
		}

		/**
		 * The `$engine` object can be provided in the scope by the embedding in order to provide additional capabilities the
		 * JavaScript engine may have.
		 */
		export interface $engine {
			/**
			 * @deprecated Possibly unused substantively (but used syntactically by loader/jrunscript, in a probably-obsolete way)
			 */
			Object: {
				defineProperty: any
			}

			Error?: {
				decorate: any
			}

			/**
			 * A function that can execute JavaScript code with a given scope and *target* (`this` value).
			 *
			 * @param script An object describing the file to execute.
			 * @param scope A scope to provide to the object; all the properties of this object must be in scope while the code executes.
			 * @param target An object that must be provided to the code as `this` while the code is executing.
			 */
			execute?(
				script: {
					name: string,
					/** A string of JavaScript code to execute. */
					js: string
				},
				scope: { [x: string]: any },
				target: object
			): any

			/**
			 * A constructor that implements the behavior defined by {@link $platform.MetaObject}.
			 */
			MetaObject: any
		}

		export interface Scope {
			$engine: slime.runtime.$engine | undefined
			$slime: slime.runtime.$slime.Deployment

			/**
			 * Note that in the rare case of a browser with Java, Packages may not include inonit.* classes
			 */
			Packages?: slime.jrunscript.Packages
		}

		/**
		 * An object provided by SLIME to embedders who load its runtime with a suitable {@link slime.runtime.Scope}. Provides
		 * tools that may be directly provided to callers as APIs, or may be used to build APIs useful for the embedding.
		 *
		 * ## Loading code
		 *
		 * Note that although there are global `run()`, `file()`, and `value()` methods that
		 * can be used to execute code, there is no global `module()` method. Since modules themselves load code, in
		 * order to create a module, code loading capability is needed. For this reason, the loader API exposes the ability to
		 * load modules via first creating a {@link slime.Loader} implementation and then using the
		 * `module()` method of the `Loader`.
		 */
		export interface Exports {
		}

		export namespace resource {
			export interface Exports {
				new (o: slime.resource.Descriptor): slime.Resource

				ReadInterface: {
					string: (content: string) => slime.resource.ReadInterface
				}
			}
		}

		export interface Exports {
			/**
			 * Creates a {@link slime.Resource | Resource}.
			 */
			Resource: resource.Exports
		}

		(
			function(
				$platform: slime.runtime.$platform,
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;

				var api = (
					function(): slime.runtime.Exports {
						var scope = {
							$slime: {
								getRuntimeScript: function(path) {
									return {
										name: path,
										js: fifty.$loader.get(path).read(String)
									}
								},
								getCoffeeScript: function() {
									return null;
								}
							},
							$engine: void(0)
						}

						var rv;

						var $slime = scope.$slime;
						var $engine = scope.$engine;
						rv = eval(fifty.$loader.get("expression.js").read(String))

						return rv;
					}
				)();

				fifty.tests.runtime.exports.Resource = function() {
					fifty.run(function type() {
						var toString = function(p): string { return p.toString(); };

						(function() {
							var resource = new api.Resource({});
							verify(resource).type.is(null);
						})();
						(function() {
							var resource = new api.Resource({
								type: api.mime.Type.parse("application/json")
							});
							verify(resource).type.evaluate(toString).is("application/json");
						})();
						(function() {
							var resource = new api.Resource({
								name: "foo.js"
							});
							verify(resource).type.evaluate(toString).is("application/javascript");
						})();
						(function() {
							var resource = new api.Resource({
								name: "foo.x"
							});
							verify(resource).type.is(null);
						})();
					});

					fifty.run(function name() {
						(function() {
							var resource = new api.Resource({
								name: "foo"
							});
							verify(resource).name.is("foo");
						})();
						(function() {
							var resource = new api.Resource({});
							verify(resource).evaluate.property("name").is(void(0));
						})();
					});

					fifty.run(function read() {
						var readResource = fifty.evaluate.create(
							function(resource: slime.Resource): string {
								return resource.read(String);
							},
							"read(String)"
						);

						var newReadResource = fifty.evaluate.create(
							function(resource: slime.Resource): string {
								return resource.read.string();
							},
							"read.string()"
						);

						(function() {
							var resource = new api.Resource({
								read: api.Resource.ReadInterface.string("foo")
							});
							verify(resource).evaluate(readResource).is("foo");
							verify(resource).evaluate(newReadResource).is("foo");
						})();

						(function() {
							var resource = new api.Resource({
								read: {
									string: function() {
										return "bar";
									}
								}
							});
							verify(resource).evaluate(readResource).is("bar");
						})();

						(function() {
							var resource = new api.Resource({
								read: api.Resource.ReadInterface.string(JSON.stringify({ foo: "bar" }))
							});
							var json: { foo: string, baz?: any } = resource.read(JSON);
							verify(json).foo.is("bar");
							verify(json).evaluate.property("baz").is(void(0));
						})();

						if ($platform.e4x) {
							var global = (function() { return this; })();
							var XML = global["XML"];
							var XMLList = global["XMLList"];
							var resource = new api.Resource({
								read: api.Resource.ReadInterface.string("<a><b/></a>")
							});
							var xml = resource.read(XML);
							verify(xml).is.type("xml");

							var list = { list: resource.read(XMLList) };
							verify(list).list.is.type("xml");
							verify(list).evaluate(function(v): number { return v.list.length(); }).is(1);
						}
					})
				}
			}
		//@ts-ignore
		)($platform,fifty);

		export interface Exports {
			//	TODO	scope and target parameter documentation refers to slime.Loader, but that API does not actually define
			//			them in Fifty (probably does in JSAPI).

			/**
			 * Analogous to {@link slime.Loader}'s `run()`, except that the caller specifies a
			 * {@link slime.Resource} to execute rather than a path within a {@link slime.Loader}.
			 *
			 * @param code A resource to execute. If no MIME type can be determined, the type will be assumed to be
			 * `application/javascript`.
			 * `application/javascript` scripts will be executed as
			 * JavaScript. `application/vnd.coffeescript` will be interpreted as CoffeeScript. The
			 * `name` property, if provided, may be used by the underlying JavaScript engine when evaluating
			 * the resource as code (for display in tools, for example).
			 *
			 * @param scope See {@link slime.Loader}'s `run()` method.
			 *
			 * @param target See {@link slime.Loader}'s `run()` method.
			 */
			run: (
				code: slime.Resource,
				scope?: { [name: string]: any },
				target?: object
			) => void

			//	TODO	could parameterize types here, with C, E; must C and E extend object? any?
			/**
			 * Analogous to {@link slime.Loader}'s `file()` method, except that the caller specifies a
			 * {@link slime.Resource} to execute rather than a path within a {@link slime.Loader}.
			 *
			 * @param code A resource to execute. See the `run()` method for details about this argument.
			 *
			 * @param $context See {@link slime.Loader}'s `file()` method.
			 *
			 * @param target See {@link slime.Loader}'s `file()` method.
			 *
			 * @returns See {@link slime.Loader}'s `file()` method.
			 */
			file: (
				code: slime.Resource,
				$context?: { [name: string]: any },
				target?: object
				//	TODO	return type should probably be { [name: string]: any }, but this causes a compilation failure currently
			) => any

			/**
			 * Analogous to {@link slime.Loader}'s `value()` method, except that the caller specifies a
			 * {@link slime.Resource} to execute rather than a path within a {@link slime.Loader}.
			 *
			 * @param code A resource to execute. See the `run()` method for details about this argument.
			 *
			 * @param scope See {@link slime.Loader}'s `value()` method.
			 *
			 * @param target See {@link slime.Loader}'s `value()` method.
			 *
			 * @returns See {@link slime.Loader}'s `value()` method.
			 */
			value: (
				code: slime.Resource,
				scope?: { [name: string]: any },
				target?: object
			) => { [name: string]: any }
		}

		export namespace internal {
			export type Resource = resource.Exports
			export type methods = {
				run: any
			}
			export namespace mime {
				export interface Context {
					Function: slime.$api.Global["fp"]
					deprecate: slime.$api.Global["deprecate"]
				}
			}

			export namespace loaders {
				export interface Scope {
					toExportScope: slime.runtime.Exports["old"]["loader"]["tools"]["toExportScope"]
					Loader: runtime.loader.old.Constructor
				}

				export type Script = slime.old.loader.Script<Scope,slime.runtime.Exports["old"]["loader"]>
			}

			/**
			 * An internal object derived from {@link slime.runtime.$engine} which adds default implementations.
			 */
			export interface Engine {
				execute: (code: { name?: string, js: string }, scope: { [x: string]: any }, target: any) => any
				Error: {
					decorate?: <T>(errorConstructor: T) => T
				}
				MetaObject: slime.runtime.$engine["MetaObject"]
			}

			/**
			 * A subset of the {@link $slime.Deployment} interface that can load SLIME runtime scripts.
			 */
			export interface Code {
				getRuntimeScript: $slime.Deployment["getRuntimeScript"]
			}
		}

		/**
		 * Provides information about and capabilities of the underlying JavaScript platform; loaded code can use this information
		 * in its implementation.
		 */
		export interface $platform {
			/** @deprecated */
			execute: any

			/**
			 * An object containing properties describing the platform's capabilities for objects.
			 */
			Object: {
				/**
				 * An object containing properties describing the platform's meta-object capabilities.
				 */
				defineProperty?: {
					/**
					 * If `true`, the platform supports the ECMA-262 version 5 `Object.defineProperty` method.
					 */
					ecma?: boolean

					//	TODO	rename
					/**
					 * If `true`, the platform supports `__defineGetter__` and `__defineSetter__` as defined by Mozilla.
					 */
					accessor?: boolean

					/**
					 * (Conditional; if platform supports it) Sets whether a named property on an object is read-only.
					 *
					 * @param object An object.
					 * @param property The name of a property.
					 * @param readonly Whether the property should be read-only (`true`) or writable (`false`).
					 */
					setReadOnly?: (object: object, property: string, readonly: boolean) => void
				}
			}
			e4x: any
			MetaObject: any
			java: any
		}

		(
			function(
				$platform: $platform,
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;

				fifty.tests.$platform = function() {
					var o: { x: number } = { x: void(0) };
					o.x = 3;
					verify(o).x.is(3);
					o.x = 4;
					verify(o).x.is(4);
					var setReadOnly = (function() {
						if ($platform.Object.defineProperty && $platform.Object.defineProperty.setReadOnly) {
							return $platform.Object.defineProperty.setReadOnly;
						}
					})();
					if (setReadOnly) {
						setReadOnly(o,"x",true);
						o.x = 5;
						verify(o).x.is(4);
						setReadOnly(o,"x",false);
						o.x = 5;
						verify(o).x.is(5);
					} else {
						//	TODO	seems to go here under Rhino; can we just remove this?
						const message = "setReadOnly not implemented";
						verify(message).is(message);
					}
				}
			}
		//@ts-ignore
		)($platform,fifty);

		export namespace test {
			export const subject: slime.runtime.Exports = (function(fifty: slime.fifty.test.Kit) {
				var script: slime.runtime.test.Script = fifty.$loader.script("fixtures.ts");
				return script().subject(fifty);
			//@ts-ignore
			})(fifty);
		}

		export interface Exports {
			old: {
				/**
				 * Creates a *Loader*. A Loader loads resources from a specified source.
				 */
				Loader: loader.old.Constructor

				loader: {
					source: {
						/**
						 * Creates an loader source defined by a single JavaScript object.
						 * @param o An object with named properties; each property either contains a loader object, in which case it
						 * is a loader which provides its children, or a resource object, whose properties are {@link resource.Descriptor}s.
						 */
						object: (o: object) => slime.old.loader.Source
					}

					/**
					 * A loader that uses a series of loaders to resolve resources. For a given path, each loader is searched in turn
					 * until a resource is found.
					 *
					 * The created loaders currently have the following limitations: <!---	TODO	address them	--->
					 *
					 * * They are not enumerable
					 * * They do not respect the `.child` implementations of their elements
					 * * They do not provide a sensible `.toString` implementation.
					 *
					 * @param loaders A list of {@link slime.Loader}s
					 * @returns A loader that looks up resources in the given list of underlying loaders.
					 *
					 * @experimental
					 */
					series: (loaders: old.Loader[]) => old.Loader

					tools: {
						toExportScope: <S extends { [x: string]: any },T>(scope: S) => S & { $export: (t: T) => void, $exports: T }
					}
				}
			}
		}

		export interface Exports {
			/**
			 * Creates a *namespace*. A namespace is an object which is globally visible because it is rooted to the global object
			 * (e.g., `window` in the browser). So, in the browser, the namespace `inonit.foo.bar` would be an object that is the
			 * `bar` property of an object that is the `foo` property of an object that is the `inonit` property of `window`. It
			 * could be referenced as `inonit.foo.bar` in JavaScript code, or alternatively as `window.inonit.foo.bar` in the
			 * browser.
			 *
			 * In the event portions of the sequence of rooting objects do not exist, they will be created. So, for example, in the
			 * browser-based example above, if the `window.inonit` object exists, but the `window.inonit` object does not have a
			 * property named `foo`, an object will be created and assigned to the `foo` property of `window.inonit`, and then an
			 * object will be created and assigned to that object's `bar` property.
			 *
			 * If the full sequence of rooting objects exists, the object at the given location will be returned.
			 *
			 * @param name The name/location of the namespace to create (or return if it exists).
			 *
			 * @returns The object at the specified location. The object (and its parents) will be created if it does not exist.
			 */
			namespace: (name: string) => object
		}

		export interface Exports {
			/**
			 * The same object as `$platform`.
			 */
			$platform: $platform

			/**
			 * The same object as `$platform.java`.
			 */
			java?: any

			/**
			 * An additional way for embedding environments to access the {@link slime.$api.Global | $api} object.
			 */
			$api: slime.$api.Global

			/**
			 * @deprecated Replaced by `$api.mime`.
			 */
			mime: slime.$api.mime.Export
			readonly typescript: slime.runtime.$slime.TypeScript
		}

		(
			function(
				Packages: slime.jrunscript.Packages,
				fifty: slime.fifty.test.Kit
			) {
				const { verify } = fifty;
				const { $api, jsh } = fifty.global;

				fifty.tests.jsapi = (
					function() {
						//	TODO	this is a problem with type definition of fifty.test.Parent
						var rv = Object.assign(fifty.test.Parent(), { _1: void(0), _2: void(0), _3: void(0) });
						var $jsapi = {
							loader: {
								module: fifty.$loader.module,
								file: fifty.$loader.file,
								//	TODO	either support this or drop support for it
								coffee: void(0),
								getRelativePath: (fifty.jsh) ? function(path) {
									var rv = fifty.jsh.file.relative(path);
									return jsh.file.Pathname(rv.pathname);
								} : void(0)
							}
						};
						var api = test.subject;
						var Mock = function recurse() {
							var contents = {};

							this.add = function(path,value) {
								var tokens = path.split("/");
								if (tokens.length == 1) {
									if (typeof(value) == "string") {
										value = (function(string) {
											return {
												read: {
													string: function() { return string; }
												}
											}
										})(value);
									}
									contents[path] = { resource: value };
								} else {
									if (!contents[tokens[0]]) {
										contents[tokens[0]] = { child: new recurse() };
									}
									contents[tokens[0]].child.add(tokens.slice(1).join("/"), value);
								}
							}

							this.loader = new api.old.Loader({
								get: function(path) {
									var tokens = path.split("/");
									if (tokens.length == 1) {
										debugger;
										return (contents[path]) ? contents[path].resource : null;
									} else {
										if (contents[tokens[0]]) {
											var loader = contents[tokens[0]].child.loader.source;
											if (!loader) {
												throw new Error("No loader at " + tokens[0] + " for " + path);
											}
											if (!loader.get) throw new Error("No loader.get in " + Object.keys(loader));
											return loader.get(tokens.slice(1).join("/"));
										}
										return null;
									}
								},
								list: function(prefix) {
									if (prefix) {
										var tokens = prefix.split("/");
										return contents[tokens[0]].child.loader.source.list(tokens.slice(1).join("/"));
									} else {
										var rv = [];
										for (var x in contents) {
											var item = { path: x, resource: Boolean(contents[x].resource), loader: Boolean(contents[x].child) };
											rv.push(item);
										}
									}
								}
							});
						}
						rv._1 = function() {
							var Tests = function(p: { loadTestModule: (path: string, context: object) => any }) {
								var a = function(scope) {
									if (!scope.verify) throw new Error("No scope.verify; scope keys = " + Object.keys(scope));
									if (!p.loadTestModule) throw new Error("No p.loadTestModule");
									var module = scope.verify(p.loadTestModule("test/data/a/", {
										d: 1970
									}), "test/data/a");
									module.a.is(3);
									module.b.is(4);
									module.c.is(5);
									module.d.is(1970);
									module.e.is(4);
									module.f.is(6);
									module.fThis.is("fThis");
									module.mThis.is("mThis");
									module.value.is(5);
									module.vThis.thisName.is("vThis:4");
								};

								var b = function(scope) {
									var module = scope.verify(p.loadTestModule("test/data/b/", {
									}), "test/data/b");
									module.submodule.message.is("ititit");
								}

								var c = function(scope) {
									var module = scope.verify(p.loadTestModule("test/data/c/main.js", {
									}), "test/data/c/main");
									module.value.is(13);
									module.other.is(42);
								};

								var rhino = function(scope) {
									var module = scope.verify(p.loadTestModule("jrunscript/test/data/1/", {
									}), "rhino/test/data/1");
									var $java = (function() {
										if (this.jsh && this.jsh.java && this.jsh.java.getClass) return this.jsh.java.getClass("slime.Data");
										try {
											Packages.java.lang.Class.forName("slime.Data");
											return true;
										} catch (e) {
											return false;
										}
									})();
									if ($java) {
										module.data.is("From Java");
									} else {
										module.data.is("No Java");
									}
								};

								var coffee = function(scope) {
									//	TODO	for some reason these (at least sometimes) do not run in browser
									if ($jsapi.loader.coffee) {
										// TODO: Below works around issue with relative path being incorrect when this file
										// is invoked from a file which in turn is invoked from another file; happens in
										// test suite currently. Should be refactored out as we work to run tests directly
										// rather than via includes
										var PREFIX = ($jsapi.loader.getRelativePath && $jsapi.loader.getRelativePath(".").basename == "jrunscript") ? "../" : "";
										var loader = $jsapi.loader.module(PREFIX + "test/data/coffee/loader.js");
										var coffee = $jsapi.loader.module(PREFIX + "test/data/coffee/module.coffee");
										scope.verify(coffee,"coffee").a.is(2);
										scope.verify(coffee,"coffee").file.b.is(3);
										scope.verify(loader,"loader").file.b.is(3);
										var file = $jsapi.loader.file(PREFIX + "test/data/coffee/file.coffee");
										scope.verify(file,"file").b.is(3);
									} else {
										scope.verify("No CoffeeScript").is("No CoffeeScript");
									}
								}

								this.run = function(scope) {
									a(scope);
									b(scope);
									c(scope);
									rhino(scope);
									coffee(scope);
								}
							};
							new Tests({
								loadTestModule: function(path: string, context: object): any {
									return fifty.$loader.module(path, context);
								}
							}).run({
								test: test,
								verify: verify
							});
						};
						rv._2 = function() {
							var loader = new api.old.Loader({
								//	TODO	take care of the below; expand type definition or update test
								//@ts-ignore
								get: function(path) {
									if (path == "a") {
										return {
											string: "a"
										}
									} else if (path == "b/c") {
										return {
											string: "c"
										}
									}
								},
								//	TODO	take care of the below; expand type definition or update test
								//@ts-ignore
								list: function(prefix) {
									if (prefix == "b/") return [ { path: "c", resource: true } ];
									return [ { path: "a", resource: true }, { path: "b", loader: true } ]
								}
							});
							var listing = loader.list({ descendants: function() { return true; } } );
							verify(listing).length.is(3);
							//	TODO	take care of the below; expand type definition or update test
							//@ts-ignore
							verify(listing)[0].path.length.is(1);
							verify(listing)[0].path.is("a");
							verify(listing)[1].path.is("b");
							verify(listing)[2].path.is("b/c");
						}
						rv._3 = function() {
							var mock1 = new Mock();
							mock1.add("a", "sa");
							var mock2 = new Mock();
							mock2.add("b/c", "sb/c");
							var series = api.old.loader.series([mock1.loader,mock2.loader]);
							verify(series).get("foo").is(null);
							verify(series).get("a").read(String).evaluate(String).is("sa");
							verify(series).get("b/c").read(String).evaluate(String).is("sb/c");
						}
						return rv;
					}
				)();

				fifty.tests.suite = function() {
					fifty.run(fifty.tests.runtime.exports);
					fifty.load("$api.fifty.ts");
					fifty.load("mime.fifty.ts");
					fifty.load("$api-Function.fifty.ts");
					fifty.load("$api-Function-old.fifty.ts");
					fifty.load("Loader.fifty.ts");
					fifty.load("events.fifty.ts");
				}

				if (jsh) fifty.tests.platforms = fifty.jsh.platforms(fifty);
			}
		//@ts-ignore
		)( (function() { return this; })().Packages, fifty)
	}
}
