//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	The Original Code is the Java interface to the SLIME document API.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2010-2013 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

plugin({
	isReady: function() {
		return jsh.js && jsh.js.document && jsh.java;
	},
	load: function() {
		jsh.document = $loader.module("module.js", {
			pure: jsh.js.document,
			api: {
				java: jsh.java
			}
		});
	}
});

plugin({
	isReady: function() {
		return jsh.document && jsh.shell;
	},
	load: function() {
		if (jsh.shell.jsh.lib && jsh.shell.jsh.lib.getFile("jsoup.jar")) {
			jsh.loader.plugins(jsh.shell.jsh.lib.getRelativePath("jsoup.jar"));
			jsh.document.Document.Html.$reload();
		}
	}
})
