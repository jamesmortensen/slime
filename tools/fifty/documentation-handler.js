//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 * Implementation of the Typedoc documentation server. Currently relies on the `jsh` and `httpd` APIs, but probably could
	 * narrow dependencies on those.
	 *
	 * @param { slime.$api.Global } $api
	 * @param { slime.jsh.Global } jsh
	 * @param { { httpd: slime.servlet.httpd } } $context
	 * @param { slime.Loader } $loader
	 * @param { (value: slime.tools.documentation.implementation) => void } $export
	 */
	function($api,jsh,$context,$loader,$export) {
		$export(
			function(configuration) {
				var base = configuration.base;
				/** @type { slime.tools.documentation.factory } */

				var rv = function(httpd) {
					/** @type { slime.tools.documentation.internal.asTextHandler.Factory } */
					var asTextHandlerCode = $loader.factory("as-text-handler.js");
					var asTextHandler = asTextHandlerCode({ httpd: httpd });
					function update(src) {
						var result = jsh.wf.typescript.typedoc({
							project: src,
							stdio: {
								output: String,
								error: String
							}
						});
						if (result.status != 0) {
							var body = "OUTPUT:\n" + result.stdio.output + "\nERROR:\n" + result.stdio.error;
							return {
								status: { code: 500 },
								body: {
									type: "text/plain",
									string: body
								}
							}
						}
					}
					return httpd.Handler.series(
						//	Allows links to src/path/to/file.ext within Typedoc
						function(request) {
							var typedocPattern = /^(?:(.+)\/)?local\/doc\/typedoc\/src\/(.*)/;
							var match = typedocPattern.exec(request.path);
							if (match) {
								var src = (match[1]) ? base.getSubdirectory(match[1]) : base;
								return asTextHandler({
									loader: new jsh.file.Loader({ directory: src }),
									index: "index.html"
								})($api.Object.compose(request, { path: match[2] }))
							}
						},
						function(request) {
							var typedocPattern = /^(?:(.+)\/)?local\/doc\/typedoc\/update/;
							var match = typedocPattern.exec(request.path);
							if (match) {
								var src = (match[1]) ? base.getSubdirectory(match[1]) : base;
								var response = update(src);
								if (response) return response;
								return {
									status: { code: 200 },
									body: {
										type: "text/plain",
										string: "Ran typedoc successfully."
									}
								}
							}
						},
						function(request) {
							var typedocPattern = /^(?:(.+)\/)?local\/doc\/typedoc\/((.*)\.html$)/;
							var match = typedocPattern.exec(request.path);
							if (match) {
								var src = (match[1]) ? base.getSubdirectory(match[1]) : base;
								var output = src.getRelativePath("local/doc/typedoc");
								if (!output.directory || configuration.watch) {
									var response = update(src);
									if (response) return response;
								}
								jsh.shell.console("Serving: " + request.path);
								return httpd.Handler.Loader({
									loader: new jsh.file.Loader({ directory: src.getSubdirectory("local/doc/typedoc") }),
									index: "index.html"
								})($api.Object.compose(request, { path: match[2] }))
							}
						}
					)
				};
				return rv;
			}
		)
	}
//@ts-ignore
)($api,jsh,$context,$loader,$export);