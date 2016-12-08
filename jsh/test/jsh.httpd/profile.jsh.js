//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//
//	The Original Code is the jsh JavaScript/Java shell.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2016 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

var parameters = jsh.script.getopts({
	options: {
		resources: jsh.file.Pathname
	}
});

var tmp = jsh.shell.TMPDIR.createTemporary({ directory: true });

jsh.loader.plugins(jsh.shell.jsh.src.getRelativePath("rhino/http/servlet/tools"));

jsh.httpd.tools.build({
	destination: tmp.pathname,
	Resources: function() {
		this.file(parameters.options.resources.file);
	},
	compile: [],
	servlet: "WEB-INF/foo"
});