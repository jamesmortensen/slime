//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.jrunscript.file.internal.java {
	export interface Context {
		api: {
			io: slime.jrunscript.io.Exports
		}
	}

	/**
	 * A Java object representing a filesystem location, analogous to `java.io.File`.
	 */
	type Peer = slime.jrunscript.native.inonit.script.runtime.io.Filesystem.Node

	export interface FilesystemProvider {
		separators: {
			pathname: string
			searchpath: string
			line: string
		}

		newPeer: (string: string) => Peer

		relative: (base: string, relative: string) => Peer

		exists: (peer: Peer) => any

		isDirectory: (peer: Peer) => boolean

		peerToString: (peer: Peer) => string

		isRootPath: (path: string) => boolean

		getParent: (peer: Peer) => Peer

		createDirectoryAt: (peer: Peer) => void

		read: {
			binary: (peer: Peer) => slime.jrunscript.runtime.io.InputStream
			character: (peer: Peer) => slime.jrunscript.runtime.io.Reader
		}

		write: {
			binary: (peer: Peer, append: boolean) => slime.jrunscript.runtime.io.OutputStream
		}

		getLastModified: (peer: Peer) => Date

		setLastModified: (peer: Peer, date: Date) => void

		remove: (peer: Peer) => void

		move: (peer: Peer, to: Peer) => void

		list: (peer: Peer) => Peer[]

		temporary: (parent: Peer, parameters: {
			prefix: string
			suffix: string
			directory: boolean
		}) => Peer

		java: {
			adapt: (_jfile: slime.jrunscript.native.java.io.File) => Peer
		}
	}

	export interface System {
		separator: {
			file: string
		}
		isAbsolute: (pathname: string) => boolean
		isRootPath: (pathname: string) => boolean
	}

	export interface Exports {
		FilesystemProvider: new (_peer: slime.jrunscript.native.inonit.script.runtime.io.Filesystem) => FilesystemProvider
	}

	export interface Exports {
		test: {
			unix: System
			windows: System
			systemForPathnameSeparator: (separator: string) => System
			trailingSeparatorRemover: (system: System) => (pathname: string) => string
			nodeCreator: (_peer: slime.jrunscript.native.inonit.script.runtime.io.Filesystem) => (path: string) => Peer
		}
	}

	(
		function(
			Packages: slime.jrunscript.Packages,
			fifty: slime.fifty.test.kit
		) {
			const { verify } = fifty;

			var file: file.Script = fifty.$loader.script("file.js");
			var code: Script = fifty.$loader.script("java.js");

			var subject = code({
				api: {
					io: fifty.global.jsh.io
				}
			});

			fifty.tests.sandbox = function() {
				var _fs = Packages.inonit.script.runtime.io.Filesystem.create();
				var createNode = subject.test.nodeCreator(_fs);
				var thisFile = fifty.$loader.getRelativePath("java.fifty.ts");

				var thisNode = createNode(thisFile.toString());
				verify(thisNode).exists().is(true);
				verify(thisNode).isDirectory().is(false);

				//	We don't really have a sandbox way to test creating nodes with relative paths, because we can't control the
				//	PWD we are given and the files would be relative to the VM working directory.
			}

			fifty.tests.suite = function() {
				var test = verify(subject.test);
				test.unix.isAbsolute("/").is(true);
				test.unix.isAbsolute("a/b").is(false);

				test.windows.isAbsolute("C:\\foo").is(true);
				test.windows.isAbsolute("C:/foo").is(true);
				test.windows.isAbsolute("\\\\brea").is(true);
				test.windows.isAbsolute("foo").is(false);
				test.windows.isAbsolute("foo\\bar").is(false);
				test.windows.isAbsolute("foo/bar").is(false);

				test.unix.isRootPath("/").is(true);
				test.unix.isRootPath("").is(true);
				test.unix.isRootPath("/foo").is(false);
				test.unix.isRootPath("foo").is(false);
				test.unix.isRootPath("foo/bar").is(false);

				test.windows.isRootPath("C:\\").is(true);
				test.windows.isRootPath("C:/").is(true);
				test.windows.isRootPath("\\\\host").is(true);
				test.windows.isRootPath("C:\\foo").is(false);
				test.windows.isRootPath("C:/foo").is(false);
				test.windows.isRootPath("foo").is(false);
				test.windows.isRootPath("foo\\bar").is(false);
				test.windows.isRootPath("foo/bar").is(false);

				var slash = subject.test.systemForPathnameSeparator("/");
				verify(slash).is(subject.test.unix);
				var backslash = subject.test.systemForPathnameSeparator("\\");
				verify(backslash).is(subject.test.windows);

				//	TODO	the tests below just render the same string before and after; is there a better way to write tests
				//			that invoke a top-level function? Could we create one?

				var removeUnixSlashes = subject.test.trailingSeparatorRemover(subject.test.unix);
				verify(removeUnixSlashes("/foo/bar/")).is("/foo/bar");
				verify(removeUnixSlashes("/foo/bar/")).is("/foo/bar");

				var removeWindowsSlashes = subject.test.trailingSeparatorRemover(subject.test.windows);
				verify(removeWindowsSlashes("C:\\foo\\bar\\")).is("C:\\foo\\bar");
				verify(removeWindowsSlashes("C:\\foo\\bar")).is("C:\\foo\\bar");
				//	TODO	do we like the below behavior? It's internal API, anyway.
				verify(removeWindowsSlashes("C:/foo/bar/")).is("C:\\foo\\bar");
			}
		}
	//@ts-ignore
	)(Packages,fifty);


	export type Script = slime.loader.Script<Context,Exports>
}

namespace slime.jrunscript.file.internal.spi {
	export interface Exports {
		canonicalize: (path: string, separator: string) => string
		getParentPath: (path: string, separator: string) => string
	}

	export type Script = slime.loader.Script<void,Exports>
}