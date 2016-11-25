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

var client = ($context.client) ? $context.client : new $context.api.http.Client();

var algorithms = {
	gzip: new function() {
		var tar = $context.api.shell.PATH.getCommand("tar");

		this.getDestinationPath = function(basename) {
			var TGZ = /(.*)\.tgz$/;
			var TARGZ = /(.*)\.tar\.gz$/;
			if (TGZ.test(basename)) return TGZ.exec(basename)[1];
			if (TARGZ.test(basename)) return TARGZ.exec(basename)[1];
			//	TODO	list directory and take only option if there is only one and it is a directory?
			throw new Error("Cannot determine destination path for " + basename);
		};

		if (tar) {
			this.extract = function(file,to) {
				$context.api.shell.run({
					command: $context.api.shell.PATH.getCommand("tar"),
					arguments: ["xf", file.pathname],
					directory: to
				});
			}
		}
	},
	zip: new function() {
		this.getDestinationPath = function(basename) {
			var ZIP = /(.*)\.zip$/;
			if (ZIP.test(basename)) return ZIP.exec(basename)[1];
			//	TODO	list directory and take only option if there is only one and it is a directory?
			throw new Error("Cannot determine destination path for " + basename);
		};

		this.extract = function(file,to) {
			$context.api.file.unzip({
				zip: file,
				to: to
			});
		}
	}
};

var listener = function(on) {
	if (!on) on = {};
	if (!on.console) on.console = function(s) {};
	return on;
}

var installLocalArchive = function(p,on) {
	var algorithm = p.format;
	var untardir = $context.api.shell.TMPDIR.createTemporary({ directory: true });
	on.console("Extracting " + p.file + " to " + untardir);
	algorithm.extract(p.file,untardir);
	var unzippedDestination = (function() {
		if (p.getDestinationPath) {
			return p.getDestinationPath(p.file);
		}
		var path = algorithm.getDestinationPath(p.file.pathname.basename);
		if (path) return path;
		//	TODO	list directory and take only option if there is only one and it is a directory?
		throw new Error("Cannot determine destination path for " + p.file);
	})();
	on.console("Assuming destination directory created was " + unzippedDestination);
	var unzippedTo = untardir.getSubdirectory(unzippedDestination);
	on.console("Directory is: " + unzippedTo);
	unzippedTo.move(p.to, {
		overwrite: false,
		recursive: true
	});
	return p.to.directory;
};

var get = function(p,on) {
	if (!p.file) {
		if (p.url) {
			//	Apache supplies name so that url property, which is getter that hits Apache mirror list, is not invoked
			var find = (typeof(p.url) == "function") ? $api.Function.singleton(p.url) : function() { return p.url; };
			if (!p.name) p.name = find().split("/").slice(-1)[0];
			var pathname = $context.downloads.getRelativePath(p.name);
			if (!pathname.file) {
				//	TODO	we could check to make sure this URL is http
				//	Only access url property once because in Apache case it is actually a getter that can return different values
				on.console("Downloading from " + find() + " to: " + $context.downloads);
				var response = client.request({
					url: find()
				});
				pathname.write(response.body.stream, { append: false });
				on.console("Wrote to: " + $context.downloads);
			} else {
				on.console("Found " + pathname.file + "; using cached version.");
			}
			p.file = pathname.file;
		}
	}
	return p;
};

var install = function(p,on) {
	get(p,on);
	return installLocalArchive(p,on);
};

$exports.get = function(p,on) {
	on = listener(on);
	get(p,on);
	return p.file;
}

$exports.format = {
	zip: algorithms.zip
};

if (algorithms.gzip.extract) {
	$exports.format.gzip = algorithms.gzip;
}

$exports.install = function(p,on) {
	on = listener(on);
	install(p,on);
}

if (algorithms.gzip.extract) {
	$exports.gzip = $api.deprecate(function(p,on) {
		p.format = algorithms.gzip;
		$exports.install(p,on);
	});
}

$exports.zip = $api.deprecate(function(p,on) {
	p.format = algorithms.zip;
	$exports.install(p,on);
});

var apache = $loader.file("apache.js", {
	client: client,
	get: $exports.get
});

$exports.apache = apache;
