//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

package inonit.script.runtime.io.cygwin;

import java.io.*;
import java.util.*;

import inonit.script.runtime.io.*;
import inonit.system.*;

class NodeImpl extends Filesystem.Node {
	private static void check(CygwinFilesystem parent) {
		if (parent == null) {
			throw new RuntimeException("'parent' is null");
		}
	}

	private static void check(String scriptPath) {
		if (scriptPath.startsWith("C:")) {
			throw new RuntimeException("Script path appears to be OS; scriptPath = " + scriptPath);
		}
	}

	static NodeImpl create(CygwinFilesystem parent, String path) {
		check(parent);
		check(path);
		NodeImpl rv = new NodeImpl();
		rv.parent = parent;
		rv.scriptPath = path;
		return rv;
	}

	static NodeImpl create(CygwinFilesystem parent, File file) {
		check(parent);
		NodeImpl rv = new NodeImpl();
		rv.parent = parent;
		rv.host = file;
		return rv;
	}

	static NodeImpl createDirectory(CygwinFilesystem parent, NodeImpl directory, String leafName) throws CygwinFilesystem.CygpathException {
		File directoryHost = directory.getCygwinHostFile();
		String directoryScriptPath = directory.getCygwinScriptPath();
		check(parent);
		check(directoryScriptPath);
		NodeImpl rv = new NodeImpl();
		rv.parent = parent;
		rv.directory = new Boolean(true);
		rv.host = new File(directoryHost, leafName);
		rv.scriptPath = directoryScriptPath + ( (directoryScriptPath.endsWith("/")) ? "" : "/" ) + leafName;
		rv.softlink = new Boolean(false);
		rv.exists = new Boolean(true);
		return rv;
	}

	//	ordinary file
	static NodeImpl createFile(CygwinFilesystem parent, NodeImpl directory, String leafName) throws CygwinFilesystem.CygpathException {
		File directoryHost = directory.getCygwinHostFile();
		String directoryScriptPath = directory.getCygwinScriptPath();
		check(parent);
		check(directoryScriptPath);
		NodeImpl rv = new NodeImpl();
		rv.parent = parent;
		rv.directory = new Boolean(false);
		rv.host = new File(directoryHost, leafName);
		rv.scriptPath = directoryScriptPath + ( (directoryScriptPath.endsWith("/")) ? "" : "/" ) + leafName;
		rv.softlink = new Boolean(false);
		rv.exists = new Boolean(true);
		return rv;
	}

	static NodeImpl createLink(CygwinFilesystem parent, NodeImpl directory, String leafName) throws CygwinFilesystem.CygpathException {
		String directoryScriptPath = directory.getCygwinScriptPath();
		check(parent);
		check(directoryScriptPath);
		NodeImpl rv = new NodeImpl();
		rv.parent = parent;
		rv.directory = null;
		rv.host = null;
		rv.scriptPath = directoryScriptPath + ( (directoryScriptPath.endsWith("/")) ? "" : "/" ) + leafName;
		rv.softlink = new Boolean(true);
		//	Softlink may point to non-existent file
		rv.exists = null;
		return rv;
	}

	private CygwinFilesystem parent;

	private String scriptPath;
	private File host;

	private Boolean directory;
	private Boolean softlink;
	private Boolean exists;

	public String toString() {
		return getClass().getName() + " scriptPath = " + scriptPath + " host = " + host;
	}

	private File toHostFileImpl(String scriptPath) throws CygwinFilesystem.CygpathException {
		return parent.toHostFileImpl(scriptPath);
	}

	File getCygwinHostFile() throws CygwinFilesystem.CygpathException {
		if (host == null) {
			host = toHostFileImpl(scriptPath);
		}
		return host;
	}

	public File getHostFile() throws IOException {
		try {
			return getCygwinHostFile();
		} catch (CygwinFilesystem.CygpathException e) {
			throw new IOException(e);
		}
	}

	public Filesystem.Node getParent() {
		return NodeImpl.create(parent, host.getParentFile());
	}

	private void uncache() {
		directory = null;
		softlink = null;
		exists = null;
		if (scriptPath != null) {
			host = null;
		}
	}

	public boolean exists() throws IOException {
		if (exists == null) {
			try {
				exists = new Boolean(getHostFile().exists());
			} catch (IOException e) {
				String[] tokens = scriptPath.substring(1).split("/");
				if (tokens[0].equals("cygdrive") && tokens[1].endsWith(".exe")) {
					exists = new Boolean(false);
				} else {
					throw e;
				}
			}
		}
		return exists.booleanValue();
	}

	private String getCanonicalPath() throws CygwinFilesystem.CygpathException {
		try {
			return getCygwinHostFile().getCanonicalPath();
		} catch (IOException e) {
			throw new CygwinFilesystem.CanonicalPathException(e);
		}
	}

	String getCygwinScriptPath() throws CygwinFilesystem.CygpathException {
		if (scriptPath == null) {
			scriptPath = parent.toScriptPath(getCanonicalPath());
		}
		return scriptPath;
	}

	public String getScriptPath() throws IOException {
		try {
			return getCygwinScriptPath();
		} catch (CygwinFilesystem.CygpathException e) {
			throw new IOException(e);
		}
	}

	boolean isCygwinDirectory() throws CygwinFilesystem.CygpathException {
		return getCygwinHostFile().isDirectory();
	}

	public boolean isDirectory() throws IOException {
		if (directory == null) {
			directory = new Boolean( getHostFile().isDirectory() );
		}
		return directory.booleanValue();
	}

	boolean isSoftlink() throws CygwinFilesystem.CygpathException, Command.Result.Failure {
		if (softlink == null) {
			softlink = new Boolean( parent.isSoftlink(this) );
		}
		return softlink.booleanValue();
	}

	private void process(Command.Result result) throws IOException {
		if (!result.isSuccess()) {
			if (result.getLaunchException() != null) {
				throw new IOException(result.getLaunchException());
			} else if (result.getErrorStream() != null) {
				throw new IOException(new Streams().readString(result.getErrorStream()));
			}
		}
	}

	public void delete() throws IOException {
		if (!exists()) {
			throw new IOException("Does not exist: " + this);
		} else {
			uncache();
			try {
				process(parent.delete(this));
			} catch (CygwinFilesystem.CygpathException e) {
				throw new IOException(e);
			} catch (Command.Result.Failure e) {
				process(e.getResult());
			}
		}
	}

	public void move(Filesystem.Node to) throws IOException {
		uncache();
		try {
			NodeImpl other = (NodeImpl)to;
			process(parent.move(this, other));
		} catch (CygwinFilesystem.CygpathException e) {
			throw new IOException(e);
		} catch (Command.Result.Failure e) {
			process(e.getResult());
		}
	}

	public void mkdir() throws IOException {
		uncache();
		try {
			process(parent.mkdir(this));
		} catch (CygwinFilesystem.CygpathException e) {
			throw new IOException(e);
		} catch (Command.Result.Failure e) {
			process(e.getResult());
		}
	}

	public void mkdirs() throws IOException {
		uncache();
		try {
			process(parent.mkdirs(this));
		} catch (CygwinFilesystem.CygpathException e) {
			throw new IOException(e);
		} catch (Command.Result.Failure e) {
			process(e.getResult());
		}
	}

	public Filesystem.Node[] list() throws IOException {
		try {
			return parent.list(this);
		} catch (CygwinFilesystem.CygpathException e) {
			throw new IOException(e);
		} catch (Command.Result.Failure e) {
			process(e.getResult());
			throw new RuntimeException("Unreachable; above line should always throw exception.");
		}
	}

	public final OutputStream writeBinary(boolean append) throws IOException {
		uncache();
		return new java.io.FileOutputStream(getHostFile(), append);
	}

	public final Writer writeText(boolean append) throws IOException {
		uncache();
		return new java.io.FileWriter(getHostFile(), append);
	}

	//	Optional method used only in move operations as of this writing; allows script to "invalidate" a Pathname (causing it to
	//	forget the cached information) in anticipation of the data changing. If caching were eliminated, could get rid of this.
	public void invalidate() {
		uncache();
	}
}
