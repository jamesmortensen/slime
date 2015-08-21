//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//
//	The Original Code is the jsh JavaScript/Java shell.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2015 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

if (!jsh.unit) {
	jsh.loader.plugins(jsh.script.file.getRelativePath("../../loader/api"));
	jsh.loader.plugins(jsh.script.file.getRelativePath("../../jsh/unit"));
}
var parameters = jsh.script.getopts({
	options: {
		view: "console",
		port: Number,
		"chrome:profile": jsh.file.Pathname
	}
});

var suite = new jsh.unit.Suite(new jsh.unit.Scenario.Html({
	name: "jsh Unit Tests",
	pathname: jsh.script.file.parent.getRelativePath("api.html")
}));

jsh.unit.interface.create(suite, new function() {
	if (parameters.options.view == "ui") {
		this.chrome = {
			profile: parameters.options["chrome:profile"],
			port: parameters.options.port
		};
	} else {
		this.view = parameters.options.view;
	}
});
