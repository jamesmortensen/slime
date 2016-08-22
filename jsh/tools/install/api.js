//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//
//	The Original Code is the jsh JavaScript/Java shell.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2014 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

var downloads = (function() {
	if ($context.downloads) return $context.downloads;
})();
var client = new $context.api.http.Client();

$exports.downloads = downloads;

$exports.download = function(p) {
	var name = (p.name) ? p.name : p.url.split("/").slice(-1)[0];
	var rv;
	if (!downloads || !downloads.getFile(name)) {
		var tmp = $context.api.shell.TMPDIR.createTemporary({ suffix: ".download" });
		tmp.remove();
		$context.api.shell.echo("Downloading from " + p.url);
		var response = client.request({
			url: p.url
		});
		if (response.status.code != 200) {
			throw new Error("Got HTTP code: " + response.status.code + " when downloading " + p.url);
		}
		tmp.pathname.write(response.body.stream);
		if (downloads) {
			tmp.move(downloads.getRelativePath(name));
			return downloads.getFile(name);
		} else {
			return tmp;
		}
	} else {
		$context.api.shell.echo("Using cached file: " + downloads.getFile(name));
		return downloads.getFile(name);
	}
}