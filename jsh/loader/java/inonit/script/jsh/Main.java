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

package inonit.script.jsh;

import java.io.*;
import java.util.*;
import java.util.logging.*;

import inonit.system.*;
import inonit.script.engine.*;

public class Main {
	static class PluginComparator implements Comparator<File> {
		private int evaluate(File file) {
			if (!file.isDirectory() && file.getName().endsWith(".jar")) {
				return -1;
			}
			return 0;
		}

		public int compare(File o1, File o2) {
			return evaluate(o1) - evaluate(o2);
		}
	}

	private static void addPluginsTo(List<Code> rv, final File file, boolean warn) {
		if (file.exists()) {
			if (file.isDirectory()) {
				if (new File(file, "plugin.jsh.js").exists()) {
					//	interpret as unpacked module
					Logging.get().log(Main.class, Level.CONFIG, "Loading unpacked plugin from " + file + " ...");
					rv.add(Code.unpacked(file));
				} else {
					//	interpret as directory that may contain plugins
					File[] list = file.listFiles();
					Arrays.sort(list, new PluginComparator());
					for (File f : list) {
						addPluginsTo(rv, f, false);
					}
				}
			} else if (!file.isDirectory() && file.getName().endsWith(".slime")) {
				try {
					Code p = Code.slime(file);
					if (p.getScripts().getFile("plugin.jsh.js") != null) {
						Logging.get().log(Main.class, Level.WARNING, "Loading plugin from %s ...", file);
						rv.add(p);
					} else {
						Logging.get().log(Main.class, Level.WARNING, "Found .slime file, but no plugin.jsh.js: %s", file);
					}
				} catch (IOException e) {
					//	TODO	probably error message or warning
				}
			} else if (!file.isDirectory() && file.getName().endsWith(".jar")) {
				Logging.get().log(Main.class, Level.CONFIG, "Loading Java plugin from " + file + " ...");
				rv.add(Code.jar(file));
			} else {
				//	Ignore, exists but not .slime or .jar or directory
				//	TODO	probably log message of some kind
				if (warn) Logging.get().log(Main.class, Level.WARNING, "Cannot load plugin from %s as it does not appear to contain a valid plugin", file);
			}
		} else {
			Logging.get().log(Main.class, Level.CONFIG, "Cannot load plugin from %s; file not found", file);
		}
	}

	static void addPluginsTo(List<Code> rv, File file) {
		addPluginsTo(rv, file, true);
	}

	//	Called by applications to load plugins
	static Code[] getPlugins(File file) {
		Logging.get().log(Main.class, Level.INFO, "Application: load plugins from " + file);
		List<Code> rv = new ArrayList<Code>();
		addPluginsTo(rv, file);
		return rv.toArray(new Code[rv.size()]);
	}

	private static Code[] plugins(final File[] roots) {
		ArrayList<Code> rv = new ArrayList<Code>();
		for (int i=0; i<roots.length; i++) {
			Logging.get().log(Main.class, Level.CONFIG, "Loading plugins from installation root %s ...", roots[i]);
			Main.addPluginsTo(rv, roots[i]);
		}
		return rv.toArray(new Code[rv.size()]);
	}

	private static Code.Source[] libraries(final File[] roots) {
		ArrayList<Code.Source> rv = new ArrayList<Code.Source>();
		for (int i=0; i<roots.length; i++) {
			rv.add(Code.Source.create(roots[i]));
		}
		return rv.toArray(new Code.Source[rv.size()]);
	}

	private static File[] getPluginRoots(String... searchpaths) {
		ArrayList<File> files = new ArrayList<File>();
		for (String searchpath : searchpaths) {
			if (searchpath != null) {
				int next = searchpath.indexOf(File.pathSeparator);
				while(next != -1) {
					files.add(new File(searchpath.substring(0,next)));
					searchpath = searchpath.substring(next+File.pathSeparator.length());
					next = searchpath.indexOf(File.pathSeparator);
				}
				if (searchpath.length() > 0) {
					files.add(new File(searchpath));
				}
			}
		}
		return files.toArray(new File[files.size()]);
	}

	private static Code[] plugins(String... searchpaths) {
		File[] roots = getPluginRoots(searchpaths);
		return plugins(roots);
	}

	private static Code.Source[] libraries(String... searchpaths) {
		return libraries(getPluginRoots(searchpaths));
	}

	private static java.net.URI getMainClassSource() {
		try {
			return Main.class.getProtectionDomain().getCodeSource().getLocation().toURI();
		} catch (java.net.URISyntaxException e) {
			throw new RuntimeException(e);
		}
	}

	private static File getMainFile() {
		java.net.URI codeLocation = getMainClassSource();
		if (codeLocation.getScheme().equals("file")) {
			return new File(codeLocation);
		} else {
			throw new RuntimeException("Unreachable: code source = " + codeLocation);
		}
	}

	private static abstract class Configuration {
		abstract Shell.Installation installation() throws IOException;

		abstract Shell.Environment.Packaged getPackaged();
		final Shell.Environment environment() {
			InputStream stdin = new Logging.InputStream(System.in);
			//	We assume that as long as we have separate launcher and loader processes, we should immediately flush stdout
			//	whenever it is written to (by default it only flushes on newlines). This way the launcher process can handle
			//	ultimately buffering the stdout to the console or other ultimate destination.
			OutputStream stdout = new Logging.OutputStream(inonit.script.runtime.io.Streams.Bytes.Flusher.ALWAYS.decorate(System.out), "stdout");
			//	We do not make the same assumption for stderr because we assume it will always be written to a console-like
			//	device and bytes will never need to be immediately available
			OutputStream stderr = new PrintStream(new Logging.OutputStream(System.err, "stderr"));
			final Shell.Environment.Stdio stdio = Shell.Environment.Stdio.create(stdin, stdout, stderr);
			final Shell.Environment.Packaged packaged = getPackaged();
			return Shell.Environment.create(Shell.Environment.class.getClassLoader(), System.getProperties(), OperatingSystem.Environment.SYSTEM, stdio, packaged);
		}

		abstract Shell.Invocation invocation(String[] args) throws Shell.Invocation.CheckedException;

		private Shell.Installation installation(Configuration implementation) {
			try {
				return implementation.installation();
			} catch (IOException e) {
				throw new RuntimeException(e);
			}
		}

		final Shell.Configuration configuration(String[] arguments) throws Shell.Invocation.CheckedException {
			Logging.get().log(Main.class, Level.INFO, "Creating shell: arguments = %s", Arrays.asList(arguments));
			return Shell.Configuration.create(installation(this), this.environment(), this.invocation(arguments));
		}
	}

	private static class Packaged extends Configuration {
		private static File getPackagedPluginsDirectory() throws IOException {
			File tmpdir = File.createTempFile("jshplugins", null);
			tmpdir.delete();
			tmpdir.mkdir();

			int index = 0;

			PackagedPlugin plugin = null;
			inonit.script.runtime.io.Streams streams = new inonit.script.runtime.io.Streams();
			while( (plugin = PackagedPlugin.get(index)) != null ) {
				File copyTo = new File(tmpdir, plugin.name());
				FileOutputStream writeTo = new FileOutputStream(copyTo);
				streams.copy(plugin.stream(),writeTo);
				plugin.stream().close();
				writeTo.close();
				index++;
				Logging.get().log(Main.class, Level.FINE, "Copied plugin " + index + " from " + plugin.name());
			}
			return tmpdir;
		}

		private static abstract class PackagedPlugin {
			abstract String name();
			abstract InputStream stream();

			static PackagedPlugin create(final String name, final InputStream stream) {
				return new PackagedPlugin() {
					String name() { return name; }
					InputStream stream() { return stream; }
				};
			}

			static PackagedPlugin get(int index) {
				if (ClassLoader.getSystemResourceAsStream("$plugins/" + String.valueOf(index) + ".jar") != null) {
					return create("" + index + ".jar", ClassLoader.getSystemResourceAsStream("$plugins/" + String.valueOf(index) + ".jar"));
				} else if (ClassLoader.getSystemResourceAsStream("$plugins/" + String.valueOf(index) + ".slime") != null) {
					return create(
						String.valueOf(index) + ".slime",
						ClassLoader.getSystemResourceAsStream("$plugins/" + String.valueOf(index) + ".slime")
					);
				} else {
					return null;
				}
			}
		}

		Shell.Installation installation() {
			String packagedPlugins = null;
			try {
				packagedPlugins = getPackagedPluginsDirectory().getCanonicalPath();
			} catch (IOException e) {
				throw new RuntimeException(e);
			}
			final Code[] plugins = plugins(packagedPlugins);
			final Code.Source[] libraries = libraries(packagedPlugins);
			//	TODO	better hierarchy would probably be $jsh/slime and $jsh/loader
			final Code.Source platform = Code.Source.system("$jsh/loader/");
			final Code.Source jsh = Code.Source.system("$jsh/");
			return Shell.Installation.create(platform, jsh, plugins, libraries);
		}

		Shell.Invocation invocation(final String[] arguments) {
			Code.Source.File main = Code.Source.File.create(ClassLoader.getSystemResource("main.jsh.js"));
			return Shell.Invocation.create(
				Shell.Script.create(main),
				arguments
			);
		}

		Shell.Environment.Packaged getPackaged() {
			return Shell.Environment.Packaged.create(Code.Source.system("$packaged/"), getMainFile());
		}
	}

	private static abstract class Unpackaged extends Configuration {
		abstract String getModules();
		abstract File getLoader();
		abstract File getJsh();
		abstract File getShellPlugins();

		final Shell.Installation installation() throws IOException {
			Unpackaged unpackaged = this;
			final Code[] plugins = plugins(unpackaged.getModules(), unpackaged.getShellPlugins().getCanonicalPath(), new File(new File(System.getProperty("user.home")), ".jsh/plugins").getCanonicalPath());
			final Code.Source[] libraries = libraries(unpackaged.getModules(), unpackaged.getShellPlugins().getCanonicalPath());
			return Shell.Installation.create(
				Code.Source.create(unpackaged.getLoader()),
				Code.Source.create(unpackaged.getJsh()),
				plugins,
				libraries
			);
		}

		Shell.Invocation invocation(String[] arguments) throws Shell.Invocation.CheckedException {
			if (arguments.length == 0) {
				throw new IllegalArgumentException("No arguments supplied; is this actually a packaged application? system properties = " + System.getProperties());
			}
			if (arguments.length == 0) {
				throw new IllegalArgumentException("At least one argument, representing the script, is required.");
			}
			final List<String> args = new ArrayList<String>();
			args.addAll(Arrays.asList(arguments));
			final String scriptPath = args.remove(0);
			if (scriptPath.startsWith("http://") || scriptPath.startsWith("https://")) {
				final java.net.URL url;
				final java.io.InputStream stream;
				try {
					url = new java.net.URL(scriptPath);
					stream = url.openStream();
				} catch (java.net.MalformedURLException e) {
					throw new Shell.Invocation.CheckedException("Malformed URL: " + scriptPath, e);
				} catch (IOException e) {
					throw new Shell.Invocation.CheckedException("Could not open: " + scriptPath, e);
				}
				return new Shell.Invocation() {
					public Shell.Script getScript() {
						return new Shell.Script() {
							@Override public java.net.URI getUri() {
								try {
									return url.toURI();
								} catch (java.net.URISyntaxException e) {
									//	TODO	when can this happen? Probably should refactor to do this parsing earlier and use
									//			CheckedException
									throw new RuntimeException(e);
								}
							}

							@Override public Code.Source.File getSource() {
								return Code.Source.File.create(Code.Source.URI.create(url), scriptPath, null, null, stream);
							}
						};
					}

					public String[] getArguments() {
						return args.toArray(new String[args.size()]);
					}
				};
			} else {
				final File mainScript = new File(scriptPath);
				if (!mainScript.exists()) {
					//	TODO	this really should not happen if the launcher is launching this
					throw new Shell.Invocation.CheckedException("File not found: " + scriptPath);
				}
				if (mainScript.isDirectory()) {
					throw new Shell.Invocation.CheckedException("Filename: " + scriptPath + " is a directory");
				}
				return new Shell.Invocation() {
					public Shell.Script getScript() {
						return Shell.Script.create(mainScript);
					}

					public String[] getArguments() {
						return (String[]) args.toArray(new String[0]);
					}
				};
			}
		}

		Shell.Environment.Packaged getPackaged() {
			return null;
		}
	}

	private static class Unbuilt extends Unpackaged {
		private File src;

		Unbuilt(File src) {
			this.src = src;
		}

		String getModules() {
			return this.src.getAbsolutePath();
		}

		File getLoader() {
			return new File(this.src, "loader");
		}

		File getJsh() {
			return new File(new File(this.src, "jsh"), "loader");
		}

		File getShellPlugins() {
			if (System.getProperty("jsh.shell.plugins") != null) {
				return new File(System.getProperty("jsh.shell.plugins"));
			}
			//	TODO	this is basically a dummy file that contains no plugins, to make the calling code simpler
			return new File(this.src, "xxx");
		}
	}

	private static class Built extends Unpackaged {
		private File home;

		Built(File home) {
			this.home = home;
		}

		String getModules() {
			return new File(this.home, "modules").getAbsolutePath();
		}

		private File getScripts() {
			return new File(this.home, "script");
		}

		File getLoader() {
			return new File(getScripts(), "loader");
		}

		File getJsh() {
			return new File(getScripts(), "jsh");
		}

		File getShellPlugins() {
			return new File(this.home, "plugins");
		}
	}

	private static Configuration implementation() {
		if (ClassLoader.getSystemResource("main.jsh.js") != null) {
			return new Packaged();
		} else {
			Logging.get().log(Main.class, Level.CONFIG, "jsh.shell.src=" + System.getProperty("jsh.shell.src"));
			File main = getMainFile();
			Logging.get().log(Main.class, Level.CONFIG, "getMainFile=" + main);
			if (main.getName().equals("jsh.jar") && main.getParentFile().getName().equals("lib")) {
				File home = main.getParentFile().getParentFile();
				System.setProperty("jsh.shell.home", home.getAbsolutePath());
				//	TODO	eliminate the below system property by using a shell API to specify this
				return new Built(home);
			}
			if (System.getProperty("jsh.shell.src") != null) return new Unbuilt(new File(System.getProperty("jsh.shell.src")));
			return null;
		}
	}

	private static Shell.Configuration configuration(final String[] arguments) throws Shell.Invocation.CheckedException {
		Logging.get().log(Main.class, Level.INFO, "Creating shell: arguments = %s", Arrays.asList(arguments));
		return implementation().configuration(arguments);
	}

	public static abstract class Engine {
		public abstract void main(Shell.Container context, Shell shell) throws Shell.Invocation.CheckedException;

		private void shell(Shell.Container context, Shell.Configuration shell) throws Shell.Invocation.CheckedException {
			Thread.currentThread().setUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
				public void uncaughtException(Thread t, Throwable e) {
					Throwable error = e;
					java.io.PrintWriter writer = new java.io.PrintWriter(System.err,true);
					while(error != null) {
						writer.println(error.getClass().getName() + ": " + error.getMessage());
						StackTraceElement[] trace = error.getStackTrace();
						for (StackTraceElement line : trace) {
							writer.println("\t" + line);
						}
						error = error.getCause();
						if (error != null) {
							writer.print("Caused by: ");
						}
					}
				}
			});
			main(context, Shell.create(shell));
		}

		private class Runner extends Shell.Container.Holder.Run {
			public void threw(Throwable t) {
				t.printStackTrace();
			}

			public void run(Shell.Container context, Shell.Configuration shell) throws Shell.Invocation.CheckedException {
				Engine.this.shell(context,shell);
			}
		}

		private Integer embed(Shell.Configuration configuration) throws Shell.Invocation.CheckedException {
			Shell.Container.Holder context = new Shell.Container.Holder();
			return context.getExitCode(new Runner(), configuration);
		}

		private void cli(String[] args) throws Shell.Invocation.CheckedException {
			shell(Shell.Container.VM, Main.configuration(args));
		}
	}

	public static void cli(Engine engine, String[] args) throws Shell.Invocation.CheckedException {
		if (!inonit.system.Logging.get().isSpecified()) {
			inonit.system.Logging.get().initialize(new java.util.Properties());
		}
		Logging.get().log(Main.class, Level.INFO, "Invoked cli(String[] args) with " + args.length + " arguments.");
		for (int i=0; i<args.length; i++) {
			Logging.get().log(Main.class, Level.INFO, "Argument " + i + " is: " + args[i]);
		}
		engine.cli(args);
	}
}