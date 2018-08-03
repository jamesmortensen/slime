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

//	build a shell
var build = jsh.shell.TMPDIR.createTemporary({ directory: true });
var src = jsh.script.file.parent.parent.parent.parent;
jsh.shell.echo("Building shell ...");
jsh.shell.jrunscript({
	arguments: [src.getFile("rhino/jrunscript/api.js"), "jsh", src.getRelativePath("jsh/etc/build.jsh.js"), "-notest", "-nodoc", build.toString()]
});
var script = src.getFile("jsh/test/jsh.shell/properties.jsh.js");
jsh.shell.echo("Built shell: " + build);
jsh.shell.jsh({
	shell: build,
	script: script,
	arguments: ["Built shell: " + build]
});
jsh.shell.echo("Unbuilt shell: " + src);
jsh.shell.jsh({
	shell: src,
	script: script,
	arguments: ["Unbuilt shell: " + src]
});