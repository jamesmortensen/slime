//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

package inonit.script.runtime.io.cygwin;

import java.io.*;
import java.util.*;

import java.lang.reflect.*;

import inonit.script.runtime.io.*;
import inonit.system.*;
import inonit.system.cygwin.*;

public class CygwinFilesystem extends Filesystem {
	public static CygwinFilesystem create(String root, String helper) {
		CygwinFilesystem rv = new CygwinFilesystem();
		Cygwin cygwin = Cygwin.create(new File(root));
		try {
			rv.paths = new HelperProcess(root, helper);
		} catch (IOException e) {
			rv.paths = new Subprocesses(cygwin);
		}
		rv.paths.initialize(new CachedCommands(cygwin));
		return rv;
	}

	public static CygwinFilesystem create(String root) {
		CygwinFilesystem rv = new CygwinFilesystem();
		Cygwin cygwin = Cygwin.create(new File(root));
		rv.paths = new Subprocesses(cygwin);
		rv.paths.initialize(new CachedCommands(cygwin));
		return rv;
	}

	private Implementation paths;
	private Commands commands;

	private CygwinFilesystem() {
	}

	@Override public String toString() {
		return getClass().getName() + " paths={" + paths + "}";
	}

	public final void finalize() {
		paths.destroy();
	}

	static class CygpathException extends Exception {
		CygpathException(IOException e) {
			super(e);
		}

		CygpathException(Cygwin.CygpathException e) {
			super(e);
		}
	}

	static class CanonicalPathException extends RuntimeException {
		CanonicalPathException(IOException e) {
			super(e);
		}
	}

	private static abstract class Commands {
		private OperatingSystem os = OperatingSystem.get();

		abstract String getWindowsPath(String unix) throws CygpathException;

		String getCommandOutput(String command, String[] arguments) throws CygpathException, Command.Result.Failure {
			Command.Result result = shellCommand(command,arguments).evaluate();
			InputStream output = result.getOutputStream();
			try {
				return new Streams().readString(output);
			} catch (IOException e) {
				throw new RuntimeException("Unreachable", e);
			}
//			String rv = "";
//			for (int i=0; i<1; i++) {
//				Command.Result result = os.execute(getWindowsPath(command), arguments);
//				//rv = os.getCommandOutput(getWindowsPath(command),arguments);
//				if (rv.length() > 0) return rv;
//			}
//			return rv;
		}

		Command.Result shellCommand(String command, String[] arguments) throws CygpathException {
			String windows = getWindowsPath(command);
			return os.execute(windows, arguments);
		}
	}

	private static class CachedCommands extends Commands {
		private HashMap<String,String> cache = new HashMap<String,String>();

		private Cygwin cygwin;

		CachedCommands(Cygwin cygwin) {
			this.cygwin = cygwin;
		}

		String getWindowsPath(String unix) throws CygpathException {
			if (cache.get(unix) == null) {
				try {
					cache.put(unix, cygwin.toWindowsPath(unix, false) );
				} catch (Cygwin.CygpathException e) {
					throw new CygpathException(e);
				}
			}
			return cache.get(unix);
		}
	}

	private static abstract class Implementation {
		private Commands commands;

		final void initialize(Commands commands) {
			this.commands = commands;
		}

		Commands commands() {
			return commands;
		}

		abstract String toUnixPath(String path) throws CygpathException;
		abstract String toWindowsPath(String path) throws CygpathException;
		abstract String[] list(NodeImpl node) throws CygpathException, Command.Result.Failure;

		boolean isSoftlink(NodeImpl node) throws CygpathException, Command.Result.Failure {
			//	TODO	Implement retries
			String path = node.getCygwinScriptPath();
			String output = commands.getCommandOutput("/bin/ls", new String[] { "-d", "--file-type", path });
			if (output.length() == 0) throw new RuntimeException("No output for ls " + path);
			output = output.substring(0, output.length() - 1);
			return output.endsWith("@");
		}

		Command.Result delete(NodeImpl node) throws CygpathException, Command.Result.Failure {
			String scriptPath = null;
			try {
				scriptPath = node.getScriptPath();
			} catch (IOException e) {
				throw new CygpathException(e);
			}
			if (node.isSoftlink()) {
				return commands.shellCommand( "/bin/rm", new String[] { scriptPath } ).evaluate();
			} else if (node.isCygwinDirectory()) {
				return commands.shellCommand( "/bin/rm", new String[] { "-Rf", scriptPath } ).evaluate();
			} else {
				return commands.shellCommand( "/bin/rm", new String[] { scriptPath } ).evaluate();
			}
		}

		Command.Result move(NodeImpl from, NodeImpl to) throws CygpathException, Command.Result.Failure {
			String f = null;
			String t = null;
			try {
				f = from.getScriptPath();
				t = to.getScriptPath();
				return commands.shellCommand("/bin/mv", new String[] { f, t }).evaluate();
			} catch (IOException e) {
				throw new CygpathException(e);
			}
		}

		Command.Result mkdir(NodeImpl node) throws CygpathException, Command.Result.Failure {
			return commands.shellCommand("/bin/mkdir", new String[] { node.getCygwinScriptPath() }).evaluate();
		}

		Command.Result mkdirs(NodeImpl node) throws CygpathException, Command.Result.Failure {
			return commands.shellCommand("/bin/mkdir", new String[] { "-p", node.getCygwinScriptPath() }).evaluate();
		}

		abstract void destroy();
	}

	private static class Subprocesses extends Implementation {
		private Cygwin cygwin;

		Subprocesses(Cygwin cygwin) {
			this.cygwin = cygwin;
		}

		public String toString() {
			return getClass().getName() + " cygwin=" + cygwin;
		}

		String toUnixPath(String path) throws CygpathException {
			try {
				return this.cygwin.toUnixPath(path,false);
			} catch (Cygwin.CygpathException e) {
				throw new CygpathException(e);
			}
		}

		String toWindowsPath(String path) throws CygpathException {
			try {
				return this.cygwin.toWindowsPath(path,false);
			} catch (Cygwin.CygpathException e) {
				throw new CygpathException(e);
			}
		}

		String[] list(NodeImpl node) throws CygpathException, Command.Result.Failure {
			String output = commands().getCommandOutput("/bin/ls", new String[] { "-A", "--file-type", node.getCygwinScriptPath() });
			ArrayList<String> names = new ArrayList<String>();
			String name = "";
			for (int i=0; i<output.length(); i++) {
				if (output.charAt(i) == '\n') {
					names.add( name );
					name = "";
				} else {
					name += output.charAt(i);
				}
			}
			return names.toArray(new String[0]);
		}

		void destroy() {
		}
	}

	private static class HelperProcess extends Implementation {
		private InputStream output;
		private PrintWriter input;

		private Subprocess subprocess;

		//	Formerly this method existed to wrap a reflection-based implementation that supported pre-1.5 VMs by returning null
		//	if System.getenv() was not present
		private Map<String,String> getenv() {
			return System.getenv();
		}

		public String toString() {
			return getClass().getName() + " subprocess=" + subprocess;
		}

		HelperProcess(final String root, final String path) throws IOException {
			if (path == null) throw new IllegalArgumentException("'path' must not be null.");

			final Streams.Bytes.Buffer stdin = new Streams.Bytes.Buffer();
			final Streams.Bytes.Buffer stdout = new Streams.Bytes.Buffer();

			Command.Configuration configuration = new Command.Configuration() {
				public String getCommand() {
					return path;
				}

				public String[] getArguments() {
					return new String[0];
				}
			};

			Command.Context context = new Command.Context() {
				public File getWorkingDirectory() {
					return new File(System.getProperty("user.dir"));
				}

				public Map getSubprocessEnvironment() {
					Map<String,String> toUse = new HashMap<String,String>();

					//	TODO	do we really have to copy the environment? The PATH below should be sufficient, maybe ...
					Map<String,String> existing = getenv();
					if (existing != null) {
						Iterator<String> keys = existing.keySet().iterator();
						while(keys.hasNext()) {
							String key = keys.next();
							String value = existing.get(key);
							toUse.put(key, value);
						}
					}

					//	TODO	Probably should prepend path here rather than overwriting
					toUse.put("PATH", root + "/bin");
					return toUse;
				}

				public OutputStream getStandardOutput() {
					return stdout.getOutputStream();
				}

				public InputStream getStandardInput() {
					return stdin.getInputStream();
				}

				public OutputStream getStandardError() {
					return System.err;
				}
			};

			this.subprocess = OperatingSystem.get().start(context, configuration);
			this.output = stdout.getInputStream();
			this.input = new PrintWriter(stdin.getOutputStream(), true);
		}

		synchronized String getResponse(String request) throws IOException {
			input.print(request + "\n");
			input.flush();
			String rv = "";
			char c;
			while((c = (char)output.read()) != '\n') {
				rv += c;
			}
			return rv;
		}

		synchronized String toUnixPath(String path) throws CygpathException {
			try {
				return getResponse("u" + path);
			} catch (IOException e) {
				throw new CygpathException(e);
			}
		}

		synchronized String toWindowsPath(String path) throws CygpathException {
			try {
				return getResponse("w" + path);
			} catch (IOException e) {
				throw new CygpathException(e);
			}
		}

		String[] list(NodeImpl directory) throws CygpathException {
			try {
				String response = getResponse("l" + directory.getScriptPath());
				if (response.length() == 0) return new String[0];
				return response.split("\\|");
			} catch (IOException e) {
				throw new CygpathException(e);
			}
		}

		void destroy() {
			subprocess.terminate();
		}
	}

	//
	//	Methods used by NodeImpl
	//

	boolean isSoftlink(NodeImpl node) throws CygpathException, Command.Result.Failure {
		return paths.isSoftlink(node);
	}

	Command.Result delete(NodeImpl node) throws CygpathException, Command.Result.Failure {
		return paths.delete(node);
	}

	Command.Result move(NodeImpl from, NodeImpl to) throws CygpathException, Command.Result.Failure {
		return paths.move(from, to);
	}

	File toHostFileImpl(String path) throws CygpathException {
		return new java.io.File(paths.toWindowsPath(path));
	}

	String toScriptPath(String file) throws CygpathException {
		return paths.toUnixPath(file);
	}

	Command.Result mkdir(NodeImpl node) throws CygpathException, Command.Result.Failure {
		return paths.mkdir(node);
	}

	Command.Result mkdirs(NodeImpl node) throws CygpathException, Command.Result.Failure {
		return paths.mkdirs(node);
	}

	Filesystem.Node[] list(NodeImpl node) throws CygpathException, Command.Result.Failure {
		String[] names = paths.list(node);
		ArrayList<Filesystem.Node> unfiltered = new ArrayList<Filesystem.Node>();
		for (int i=0; i<names.length; i++) {
			String filename = (String)names[i];
			if (filename.endsWith("/")) {
				//	directory
				String leafName = filename.substring(0, filename.length() - 1);
				NodeImpl n = NodeImpl.createDirectory(this, node, leafName);
				unfiltered.add(n);
			} else if (filename.endsWith("@")) {
				//	softlink; could be directory, may not be
				String leafName = filename.substring(0, filename.length() - 1);
				NodeImpl n = NodeImpl.createLink(this, node, leafName);
				unfiltered.add(n);
			} else if (filename.endsWith("|") || filename.endsWith(">") || filename.endsWith("=")) {
				//	Ignore (FIFO, "door", and AF_UNIX socket, respectively)
			} else {
				//	ordinary file
				NodeImpl n = NodeImpl.createFile(this, node, filename);
				unfiltered.add(n);
			}
		}

		return (Filesystem.Node[])unfiltered.toArray(new Filesystem.Node[0]);
	}

	//
	//	Methods implementing Filesystem
	//

	protected String getPathnameSeparatorImpl() {
		return "/";
	}

	protected String getSearchpathSeparatorImpl() {
		return ":";
	}

	protected String getLineSeparatorImpl() {
		return "\n";
	}

	protected Node createNode(String path) {
		return NodeImpl.create(this, path);
	}

	protected Node createNode(File file) {
		return NodeImpl.create(this, file);
	}
}
