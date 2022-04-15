//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.fifty.test.internal.scope.jsh {
	export interface Scope {
		loader: slime.Loader
		directory: slime.jrunscript.file.Directory
	}

	export type Export = (scope: slime.fifty.test.internal.scope.jsh.Scope) => slime.fifty.test.Kit["jsh"]

	export type Script = slime.loader.Script<void,Export>
}

(
	function($api: slime.$api.Global, jsh: slime.jsh.Global, $export: slime.loader.Export<slime.fifty.test.internal.scope.jsh.Export>) {
		var tmp = {
			location: function() {
				var directory = jsh.shell.TMPDIR.createTemporary({ directory: true });
				var rv = directory.pathname;
				directory.remove();
				return rv;
			},
			directory: function() {
				return jsh.shell.TMPDIR.createTemporary({ directory: true }) as slime.jrunscript.file.Directory;
			}
		};

		$export(
			function(scope) {
				return {
					file: {
						object: {
							temporary: {
								location: tmp.location,
								directory: tmp.directory
							},
							getRelativePath: function(path) {
								return scope.directory.getRelativePath(path);
							}
						}
					},
					plugin: {
						mock: function(p) {
							return jsh.$fifty.plugin.mock(
								$api.Object.compose(
									p,
									{ $loader: scope.loader }
								)
							)
						}
					},
					$slime: jsh.unit.$slime
				}
			}
		);
	}
//@ts-ignore
)($api, jsh, $export)
