//@ts-check

/**
 * @typedef {object} slime.jrunscript.tools.github.Context
 * @property { { http: slime.jrunscript.http.client.Exports, shell: jsh.shell } } library
 */

/**
 * @typedef { object } slime.jrunscript.tools.github.Repository
 * @property { number } id
 * @property { string } node_id
 * @property { string } name
 * @property { string } full_name
 */

/**
 * @typedef { object } slime.jrunscript.tools.github.Session
 * @property { { list: () => slime.jrunscript.tools.github.Repository[] } } repositories
 */

/**
 * @typedef {object} slime.jrunscript.tools.github.Exports
 * @property { (o: any) => slime.jrunscript.tools.github.Session } Session
 */

//	Work around tsc bug not allowing first expression to be parenthetical
void(0);
(
	/**
	 * @param {slime.jrunscript.tools.github.Context} $context
	 * @param {slime.jrunscript.tools.github.Exports} $exports
	 * @param {*} Packages
	 */
	function($context,$exports,Packages) {
		$exports.Session = function(o) {
			var apiUrl = function(relative) {
				return "https://api.github.com/" + relative;
			};

			var parseLinkHeader = function(value) {
				return $api.Function.result(
					value,
					$api.Function.String.split(", "),
					$api.Function.Array.map(function(string) {
						var relationFormat = /^\<(.+?)\>\; rel\=\"(.+)\"/;
						var parsed = relationFormat.exec(string);
						return {
							url: parsed[1],
							rel: parsed[2]
						}
					}),
					$api.Function.Array.map(function(relation) {
						return [relation.rel, relation.url];
					}),
					$api.Function.Object.fromEntries
				);
			}

			var apiClient = (function(o) {
				/**
				 * @type { slime.jrunscript.http.client.Client }
				 */
				var client = new $context.library.http.Client({
					authorization: (o.credentials) ? $context.library.http.Authentication.Basic.Authorization({
						user: o.credentials.user,
						password: o.credentials.password
					}) : void(0)
				});

				var evaluate = function(response) {
					if (response.status.code == 404) return null;
					var string = response.body.stream.character().asString();
					if (response.status.code != 200) {
						$context.library.shell.console("Response code: " + response.status.code + " " + response.request.method + " " + response.request.url);
						$context.library.shell.console(string);
						$context.library.shell.console("");
					}
					var rv = (string) ? JSON.parse(string) : void(0);
					if (response.headers.get("Link")) {
						var link = parseLinkHeader(response.headers.get("Link"));
						rv.next = link.next;
					}
					if (response.status.code == 403 && rv && rv.documentation_url == "https://developer.github.com/v3/#abuse-rate-limits") {
						return {
							retry: true
						}
					}
					if (rv && rv.message == "Bad credentials") throw new Error("Bad credentials.");
					return rv;
				};

				/** @type { (p: slime.jrunscript.http.client.Request) => slime.jrunscript.tools.github.Repository[] } */
				var request = (function(was) {
					return function(p) {
						var more = true;
						var retry = 1;
						var rv;
						var next;
						while(more) {
							var json = was.call(this, $api.Object.compose(
								p,
								{ evaluate: evaluate },
								(next) ? { url: next } : {}
							));
							if (rv) {
								rv = rv.concat(json);
							} else {
								rv = json;
							}
							if (rv && rv.retry) {
								//	TODO	X.X should use Retry-After
								//			see https://developer.github.com/v3/guides/best-practices-for-integrators/#dealing-with-abuse-rate-limits
								$context.library.shell.console("Sleeping for " + retry + " seconds...");
								Packages.java.lang.Thread.sleep(retry * 1000);
								retry *= 2;
							} else if (json.next) {
								next = json.next;
								//	more is still true, will cycle
							} else {
								return rv;
							}
						}
					}
				})(client.request);

				return { request: request }
			})(o);

			return new function() {
				this.repositories = new function() {
					this.list = function() {
						return apiClient.request({
							url: apiUrl("user/repos")
						});
					};
				}
			};
		}
	}
//@ts-ignore
)($context,$exports,Packages)
