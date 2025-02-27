//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

plugin({
	isReady: function() {
		return jsh.shell && Boolean(jsh.shell.PATH.getCommand("mvn"));
	},
	load: function() {
		if (!global.maven && !global.mvn) {
			global.maven = $loader.module("module.js", {
				mvn: jsh.shell.PATH.getCommand("mvn"),
				HOME: jsh.shell.HOME
			});
		}
	}
});
