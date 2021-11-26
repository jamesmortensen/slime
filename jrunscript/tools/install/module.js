//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 * @param { slime.$api.Global } $api
	 * @param { slime.jrunscript.tools.install.Context } $context
	 * @param { slime.Loader } $loader
	 * @param { slime.loader.Export<slime.jrunscript.tools.install.Exports> } $export
	 */
	function($api,$context,$loader,$export) {
		var downloads = $context.downloads ? $context.downloads : $context.api.shell.TMPDIR.createTemporary({ directory: true })

		var client = ($context.client) ? $context.client : new $context.api.http.Client();

		var scripts = {
			apache: $loader.script("apache.js")
		}

		var algorithms = {
			gzip: new function() {
				var tar = $context.api.shell.PATH.getCommand("tar");

				this.getDestinationPath = function(basename) {
					var TGZ = /(.*)\.tgz$/;
					var TARGZ = /(.*)\.tar\.gz$/;
					var TARXZ = /(.*)\.tar\.xz$/;
					if (TGZ.test(basename)) return TGZ.exec(basename)[1];
					if (TARGZ.test(basename)) return TARGZ.exec(basename)[1];
					if (TARXZ.test(basename)) return TARXZ.exec(basename)[1];
					//	TODO	list directory and take only option if there is only one and it is a directory?
					throw new Error("Cannot determine destination path for " + basename);
				};

				if (tar) {
					this.extract = function(file,to) {
						$context.api.shell.run({
							command: $context.api.shell.PATH.getCommand("tar"),
							arguments: ["xf", file.pathname],
							directory: to
						});
					}
				}
			},
			zip: new function() {
				this.getDestinationPath = function(basename) {
					var ZIP = /(.*)\.zip$/;
					if (ZIP.test(basename)) return ZIP.exec(basename)[1];
					//	TODO	list directory and take only option if there is only one and it is a directory?
					throw new Error("Cannot determine destination path for " + basename);
				};

				this.extract = function(file,to) {
					if ($context.api.shell.PATH.getCommand("unzip")) {
						$context.api.shell.run({
							command: "unzip",
							//	TODO	added -o option to deal with strange Selenium 4.0.0 ZIP file; examine further
							arguments: ["-o", file],
							directory: to
						});
					} else {
						$context.api.file.unzip({
							zip: file,
							to: to
						});
					}
				}
			}
		};

		var formats = (
			function() {
				var format = {
					zip: algorithms.zip
				};

				if (algorithms.gzip.extract) {
					format.gzip = algorithms.gzip;
				}
				return format;
			}
		)();

		/**
		 * @param { Parameters<slime.jrunscript.tools.install.Exports["get"]>[0] } p
		 * @param { slime.$api.Events<{ console: string }> } events
		 */
		var get = function(p,events) {
			//	TODO	If typeof(p.file) is undefined, probably should try to use user downloads directory with p.name if present as default value
			if (!p.file) {
				if (p.url) {
					//	Apache supplies name so that url property, which is getter that hits Apache mirror list, is not invoked
					if (!p.name) p.name = p.url.split("/").slice(-1)[0];
					var pathname = downloads.getRelativePath(p.name);
					if (!pathname.file) {
						//	TODO	we could check to make sure this URL is http
						//	Only access url property once because in Apache case it is actually a getter that can return different values
						events.fire("console", "Downloading from " + p.url + " to: " + downloads);
						var response = client.request({
							url: p.url
						});
						pathname.write(response.body.stream, { append: false });
						events.fire("console", "Wrote to: " + downloads);
					} else {
						events.fire("console", "Found " + pathname.file + "; using cached version.");
					}
					p.file = pathname.file;
				}
			}
			return p;
		};

		/**
		 * @param { { name?: string, getDestinationPath?: (file: slime.jrunscript.file.File) => string, url?: any, file?: slime.jrunscript.file.File, format?: Parameters<slime.jrunscript.tools.install.Exports["install"]>[0]["format"], to: slime.jrunscript.file.Pathname, replace?: boolean } } p
		 * @param { slime.$api.Events<{ console: string }> } events
		 * @returns { slime.jrunscript.file.Directory }
		 */
		var installLocalArchive = function(p,events) {
			if (!p.format) {
				var basename = (function() {
					if (p.name) return p.name;
					return (p.url) ? p.url.toString().split("/").slice(-1)[0] : p.file.pathname.basename;
				})();
				if (/\.tar\.xz$/.test(basename) && formats.gzip) p.format = formats.gzip;
				if (/\.tar\.gz$/.test(basename) && formats.gzip) p.format = formats.gzip;
				if (/\.tgz$/.test(basename) && formats.gzip) p.format = formats.gzip;
				if (/\.zip$/.test(basename)) p.format = formats.zip;
				if (/\.jar$/.test(basename)) p.format = formats.zip;
				if (!p.format) throw new TypeError("Required: 'format' property; basename = " + basename + "name=" + p.name + " url=" + p.url + " file=" + p.file);
			}
			var algorithm = p.format;
			var untardir = $context.api.shell.TMPDIR.createTemporary({ directory: true });
			events.fire("console", "Extracting " + p.file + " to " + untardir);
			algorithm.extract(p.file,untardir);
			var unzippedDestination = (function() {
				if (p.getDestinationPath) {
					return p.getDestinationPath(p.file);
				}
				var path = algorithm.getDestinationPath(p.file.pathname.basename);
				if (path) return path;
				//	TODO	list directory and take only option if there is only one and it is a directory?
				throw new Error("Cannot determine destination path for " + p.file);
			})();
			events.fire("console", "Assuming destination directory created was " + unzippedDestination);
			var unzippedTo = untardir.getSubdirectory(unzippedDestination);
			if (!unzippedTo) throw new TypeError("Expected directory " + unzippedDestination + " not found in " + untardir);
			events.fire("console", "Directory is: " + unzippedTo);
			unzippedTo.move(p.to, {
				overwrite: p.replace,
				recursive: true
			});
			return p.to.directory;
		};

		/**
		 * @param { Parameters<slime.jrunscript.tools.install.Exports["install"]>[0] } p
		 * @param { any } events
		 * @returns { slime.jrunscript.file.Directory }
		 */
		var install = function(p,events) {
			get(
				Object.assign(
					p,
					(
						(p.url) ? {
							url: String(p.url)
						} : {}
					)
				),
				events
			);
			return installLocalArchive(p,events);
		};

		/** @type { { get: slime.jrunscript.tools.install.Exports["get"], install: slime.jrunscript.tools.install.Exports["install"] }} */
		var $exports = {
			get: $api.Events.Function(
				/**
				 *
				 * @param { Parameters<slime.jrunscript.tools.install.Exports["get"]>[0] } p
				 * @param {*} events
				 */
				function(p,events) {
					get(p,events);
					return p.file;
				}
			),
			install: $api.Events.Function(function(p,events) {
				return install(p,events);
			})
		};

		$export({
			get: $exports.get,
			//	TODO	find is completely untested
			find: function(p) {
				return $api.Function.impure.ask(function(events) {
					get(p,events);
					return p.file;
				});
			},
			install: $exports.install,
			format: formats,
			apache: scripts.apache({
				client: client,
				get: $exports.get,
				downloads: downloads
			}),
			gzip: (algorithms.gzip.extract) ? $api.deprecate(function(p,on) {
				p.format = algorithms.gzip;
				$exports.install(p,on);
			}) : void(0),
			zip: $api.deprecate(function(p,on) {
				p.format = algorithms.zip;
				$exports.install(p,on);
			}),
			//	TODO	below seems to be used in plugin.jsh.tomcat.js
			$api: {
				Events: {
					Function: $api.deprecate(function(f,defaultOn) {
						var Listeners = function(p) {
							var source = {};
							var events = $api.Events({ source: source });

							this.add = function() {
								for (var x in p.on) {
									source.listeners.add(x,p.on[x]);
								}
							};

							this.remove = function() {
								for (var x in p.on) {
									source.listeners.remove(x,p.on[x]);
								}
							};

							this.events = events;
						};

						return function(p,on) {
							var listeners = new Listeners({
								on: $api.Function.evaluator(
									function() { return on; },
									function() { return defaultOn; },
									function() { return {}; }
								)()
							});
							listeners.add();
							try {
								return f(p,listeners.events);
							} finally {
								listeners.remove();
							}
						}
					})
				}
			}
		})

	}
//@ts-ignore
)($api,$context,$loader,$export)
