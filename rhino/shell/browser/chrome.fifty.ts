//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jrunscript.shell.browser {
	export interface Chrome {
		/**
		 * The version of this browser, e.g., `"Google Chrome 99.0.4844.84"`.
		 */
		readonly version: string

		/**
		 * The pathname of the browser executable.
		 */
		readonly program: string
	}

	export namespace object {
		export interface DefaultInstance {
			open?: any
		}

		export interface CreatedInstance {
			launch?: any
			run?: any
		}

		export interface Instance {
		}

		export namespace instance {
			export interface DefaultConfiguration {
				install: true
				directory?: slime.jrunscript.file.Directory
			}

			//	TODO	review; it looks like probably this should be bifurcated for default and created instances
			export interface CreatedConfiguration {
				location?: slime.jrunscript.file.Pathname
				directory?: slime.jrunscript.file.Directory
				proxy?: ProxyTools
				hostrules?: string[]

				/**
				 * Whether to open DevTools for each tab; in other words, whether to pass the `--auto-open-devtools-for-tabs` option
				 * to the Chrome command line.
				 */
				devtools?: boolean
			}
		}

		export interface Chrome extends slime.jrunscript.shell.browser.Chrome {
			Instance: {
				new (u: instance.DefaultConfiguration): DefaultInstance

				new (u: instance.CreatedConfiguration): CreatedInstance
			}

			instance?: DefaultInstance
		}
	}
}

namespace slime.jrunscript.shell.browser.internal.chrome {
	export interface Context {
		os: any
		run: any
		api: {
			js: any
			java: slime.jrunscript.host.Exports
			file: any
		}
		HOME: slime.jrunscript.file.Directory
		TMPDIR: slime.jrunscript.file.Directory
		environment: any
	}

	export interface Exports {
		getMajorVersion: (chrome: slime.jrunscript.shell.browser.Chrome) => number
	}

	export namespace test {
		export const subject = (function(fifty: slime.fifty.test.Kit) {
			var script: Script = fifty.$loader.script("chrome.js");
			return script({
				HOME: fifty.global.jsh.shell.HOME,
				TMPDIR: fifty.global.jsh.shell.TMPDIR,
				api: {
					js: fifty.global.jsh.js,
					java: fifty.global.jsh.java,
					file: fifty.global.jsh.file
				},
				environment: fifty.global.jsh.shell.environment,
				//	TODO	these can't be right
				os: fifty.global.jsh.shell.os,
				run: fifty.global.jsh.shell.run
			});
		//@ts-ignore
		})(fifty);
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;
			const { subject } = test;

			fifty.tests.getMajorVersion = function() {
				verify(subject).getMajorVersion({ version: "Google Chrome 96.0.4664.93", program: "/foo" }).is(96);
			}
		}
	//@ts-ignore
	)(fifty);

	export interface Exports {
		Installation: slime.jrunscript.shell.browser.Exports["Chrome"]["Installation"]
	}

	export interface Exports {
		installed: object.Chrome
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.suite = function() {
				fifty.run(fifty.tests.getMajorVersion);
			}
		}
	//@ts-ignore
	)(fifty);

	(
		function(
			Packages: slime.jrunscript.Packages,
			fifty: slime.fifty.test.Kit
		) {
			const { jsh } = fifty.global;

			const { subject } = test;

			fifty.tests.world = function() {
				var version = subject.installed.version;
				fifty.global.jsh.shell.console("Chrome version = [" + version + "]");
			}

			fifty.tests.manual = {};

			fifty.tests.manual.chrome = {};

			fifty.tests.manual.chrome.Installation = function() {
				//	macOS: env JSH_TEST_SHELL_CHROME_PROGRAM="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" JSH_TEST_SHELL_CHROME_USER="${HOME}/Library/Application Support/Google/Chrome"
				var chrome = subject.Installation({
					program: jsh.shell.environment.JSH_TEST_SHELL_CHROME_PROGRAM,
					user: jsh.shell.environment.JSH_TEST_SHELL_CHROME_USER
				});
				var TMP = jsh.shell.TMPDIR.createTemporary({ directory: true });
				var instance = new chrome.Instance({
					location: TMP.pathname
				});
				var process;
				jsh.java.Thread.start(function() {
					Packages.java.lang.System.err.println("Starting ...");
					try {
						instance.run({
							uri: "https://google.com/",
							on: {
								start: function(p) {
									Packages.java.lang.System.err.println("Got start callback.");
									process = p;
								}
							}
						});
					} catch (e)  {
						jsh.shell.console(e);
						jsh.shell.console(e.stack);
					}
				});
				Packages.java.lang.Thread.sleep(5000);
				process.kill();
			};

			fifty.tests.manual.chrome.installed = function() {
				jsh.shell.console("version = " + subject.installed.version);
				jsh.shell.console("program = " + subject.installed.program);
			}
		}
	//@ts-ignore
	)(Packages,fifty);


	export type Script = slime.loader.Script<Context,Exports>
}
