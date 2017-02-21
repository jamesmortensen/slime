//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//
//	The Original Code is the jsh JavaScript/Java shell.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2017 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

plugin({
	isReady: function() {
		return jsh.test;
	},
	load: function() {
		jsh.test.provision = {};

		var loadhg = function() {
			if (!global.hg) {
				jsh.loader.plugins(jsh.shell.jsh.src.getRelativePath("rhino/tools/hg"));
			}
		}

		var getMockConfiguration = function(base,isPrivateRepository) {
			loadhg();
			var repository = new hg.Repository({ local: base });
			var all = [];

			var addRepositories = function recurse(top) {
				all.push(top);
				var sub = top.subrepositories();
				if (sub) {
					sub.forEach(function(r) {
						recurse(r);
					})
				}
			};

			addRepositories(repository);

			var bitbucket = {
				src: {
				}
			};
			var isPrivate = function(owner,repository) {
				if (owner == "davidpcaldwell" && (repository == "slim" || repository == "slime")) return false;
				if (owner == "davidpcaldwell") return true;
				return isPrivateRepository(owner,repository);
			}
			all.forEach(function(r) {
				var origin = r.paths.default;
				var tokens = origin.url.path.substring(1).split("/");
				var owner = tokens[0];
				var repository = tokens[1];
				if (!bitbucket.src[owner]) {
					bitbucket.src[owner] = {};
				}
				if (!bitbucket.src[owner][repository]) {
					bitbucket.src[owner][repository] = {
						directory: r.directory,
						access: (isPrivate(owner,repository)) ? { user: owner, password: "foo" } : void(0)
					}
				}
			});
			return bitbucket;
		};

		jsh.test.provision.serve = function(o) {
			loadhg();
			var server = new jsh.test.mock.Web();
			var bitbucket = (function() {
				if (o.bitbucket) return o.bitbucket;
				//	TODO	publish this API and make it work for non-davidpcaldwell repositories
				if (o.base) return getMockConfiguration(o.base);
			})();
			if (!bitbucket.src.davidpcaldwell) o.bitbucket.src.davidpcaldwell = {};
			if (!bitbucket.src.davidpcaldwell.slime) {
				bitbucket.src.davidpcaldwell.slime = {
					directory: jsh.shell.jsh.src,
					downloads: {
						"jdk-8u112-macosx-x64.dmg": jsh.shell.user.downloads.getFile("jdk-8u112-macosx-x64.dmg"),
						"jdk-8u112-linux-x64.tar.gz": jsh.shell.user.downloads.getFile("jdk-8u112-linux-x64.tar.gz")
					}
				};
			}
			server.add(jsh.test.mock.Web.bitbucket(bitbucket));
			var version = (o.version) ? o.version : "tip";
			var script = (function() {
				var repository = String(new hg.Repository({ local: o.base }).paths.default.url);
				if (repository.substring(repository.length-1) != "/") repository += "/";
				repository += "raw/";
				repository += version + "/";
				repository += o.script;
				return repository;
			})();
			var command = {
				mock: {
					server: {
						host: (o.host) ? o.host : "127.0.0.1",
						port: server.port
					}
				},
				script: script,
				user: o.user
			};
			var mock = new jsh.test.provision.Command(command);
			jsh.shell.console(mock);
			delete command.mock;
			jsh.shell.console("");
			var real = new jsh.test.provision.Command(command);
			jsh.shell.console(real);
			server.run();
			return server;
		};
		jsh.test.provision.serve.getMockBitbucketConfiguration = getMockConfiguration;
		jsh.test.provision.Server = $api.deprecate(jsh.test.provision.serve);
		jsh.test.provision.Server.getMockBitbucketConfiguration = $api.deprecate(getMockConfiguration);

		var writeUrl = function(url,mock,version) {
			if (mock) url = url.replace(/https:\/\//g, "http://");
			if (mock) {
				url = url.replace(/raw\/tip/g, "raw/local");
			} else if (version) {
				url = url.replace(/raw\/tip/g, "raw/" + version);
			}
			return url;
		}

		var proxy = function(mock) {
			return "export http_proxy=http://" + mock.server.host + ":" + mock.server.port;
		}

		var variables = function(mock) {
			if (mock) return ["INONIT_PROVISION_VERSION=local","INONIT_PROVISION_PROTOCOL=http"]
			return [];
		};

		var curl = function(closed,mock,version) {
			return "curl -s -L " + ((closed) ? "-o $TMP_INSTALLER " : "") + writeUrl("https://bitbucket.org/api/1.0/repositories/davidpcaldwell/slime/raw/tip/jsh/tools/provision/remote.bash",mock,version);
		};

		jsh.test.provision.Command = function(p) {
			this.commands = [];
			if (p.mock) this.commands.push(proxy(p.mock));

			this.toString = function() {
				if (this.commands.length > 1) {
					return "(" + this.commands.join(";\n") + ")";
				} else {
					return this.commands[0];
				}
			}

			if (!p.user) {
				var mockVariables = variables(p.mock).join(" ");
				if (mockVariables) mockVariables += " ";
				this.commands.push(curl(false,p.mock,p.version) + " | env " + mockVariables + "INONIT_PROVISION_SCRIPT_JSH=" + writeUrl(p.script,p.mock) + " bash");
			} else {
				this.commands.push("export TMP_INSTALLER=$(mktemp)");
				this.commands.push("export INONIT_PROVISION_SCRIPT_JSH=" + writeUrl(p.script,p.mock));
				this.commands.push("export INONIT_PROVISION_USER=" + p.user);
				this.commands.push.apply(this.commands,variables(p.mock).map(function(declaration) {
					return "export " + declaration;
				}));
				this.commands.push(curl(true,p.mock,p.version));
				this.commands.push("chmod +x $TMP_INSTALLER");
				this.commands.push("$TMP_INSTALLER");
			}
		}

	}
})