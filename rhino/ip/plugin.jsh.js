//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//
//	The Original Code is the rhino/ip SLIME module.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2016 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

plugin({
	isReady: function() {
		return jsh.shell;
	},
	load: function() {
		jsh.ip = $loader.module("module.js", {
			api: {
				shell: jsh.shell
			}
		});
	}
});