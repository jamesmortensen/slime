namespace slime {
	namespace jrunscript {
		namespace file {
			interface Pathname {
				directory: Directory,
				parent: Pathname,
				createDirectory: (p: { exists: (d: Directory) => boolean } ) => Directory,
				write: (any,any) => void,
				file: File
			}

			interface Node {
				pathname: Pathname,
				remove: () => void,
				parent: Directory
			}

			interface File extends Node {
				read: (any) => any
			}

			interface Directory extends Node {
				getRelativePath: (string) => Pathname,
				getFile: (string) => File,
				getSubdirectory: (string) => Directory
			}
		}
	}
}