//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	The Original Code is the jsh JavaScript/Java shell.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2010 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

package inonit.script.jsh;

import java.io.*;
import java.net.*;
import java.util.*;

import org.mozilla.javascript.*;

import inonit.script.rhino.*;
import inonit.script.runtime.io.*;

public class Shell {
	//	TODO	try to remove dependencies on inonit.script.rhino.*;

	public static int execute(Installation installation, Configuration configuration, Invocation invocation) {
		return Host.create(installation, configuration, invocation).execute();
	}

	public static Scriptable load(Installation installation, Configuration configuration, Invocation invocation) {
		return Host.create(installation, configuration, invocation).load();
	}

	public static abstract class Installation {
		public abstract Engine.Source getPlatformLoader();
		public abstract Engine.Source getRhinoLoader();
		public abstract Engine.Source getJshLoader();

		/**
		 *	Specifies where code for "shell modules" -- modules included with jsh itself -- can be found.
		 *
		 *	@param path A logical path to the module; e.g., js/object for the jsh.js module.
		 *
		 *	@return An object that can load the specified module.
		 */
		public abstract Code getShellModuleCode(String path);

		public static abstract class Plugin {
			private static Plugin create(final Code code) {
				return new Plugin() {
					@Override public Code getCode() {
						return code;
					}
				};
			}

			static Plugin unpacked(final File directory) {
				return create(Code.unpacked(directory));
			}

			static Plugin slime(final File slime) throws IOException {
				//	TODO	what if this .slime contains classes? Should we load them? Right now, we do not
				Plugin rv = create(Code.slime(slime));
				if (rv.getCode().getScripts().getResourceAsStream("plugin.jsh.js") != null) {
					return rv;
				} else {
					return null;
				}
			}

			static Plugin jar(final File jar) {
				return create(Code.jar(jar));
			}

			public abstract Code getCode();
		}

		public abstract Plugin[] getPlugins();

		//	TODO	move to Configuration? It may make more sense there
		/**
		 *
		 *	@return An object capable of loading modules bundled with a script if this is a packaged application, or
		 *	<code>null</code> if it is not.
		 */
		public abstract Code.Source getPackagedCode();
	}

	public static abstract class Configuration {
		public abstract int getOptimizationLevel();
		public abstract Engine.Debugger getDebugger();
		public abstract Engine.Log getLog();
		public abstract ClassLoader getClassLoader();

		public abstract Properties getSystemProperties();
		public abstract Map getEnvironment();
		public abstract Stdio getStdio();

		private Engine engine;
		private Loader.Classes classpath;

		final void initialize() {
			final Configuration configuration = this;
			this.classpath = Loader.Classes.create(configuration.getClassLoader());
			Engine.Configuration contexts = new Engine.Configuration() {
				@Override public ClassLoader getApplicationClassLoader() {
					return classpath;
				}

				@Override public int getOptimizationLevel() {
					return configuration.getOptimizationLevel();
				}
			};
			this.engine = Engine.create(configuration.getDebugger(), contexts);
		}

		Engine getEngine() {
			return engine;
		}

		Loader.Classes getClasspath() {
			return classpath;
		}

		public static abstract class Stdio {
			public abstract InputStream getStandardInput();
			public abstract OutputStream getStandardOutput();
			public abstract OutputStream getStandardError();
		}
	}

	public static abstract class Invocation {
		public static abstract class Script {
			private static Script create(final Engine.Source delegate, final File file) {
				return new Script() {
					@Override
					public File getFile() {
						return file;
					}
					
					public Engine.Source getSource() {
						return delegate;
					}

//					@Override
//					public String getName() {
//						return delegate.getName();
//					}

					@Override
					public Reader getReader() {
						return delegate.getReader();
					}
				};
			}

			static Script create(File file) {
				return create(Engine.Source.create(file), file);
			}

			static Script create(final Engine.Source delegate) {
				return create(delegate, null);
			}

//			public abstract String getName();
			/**
				Returns the <code>java.io.File</code> object corresponding to the main script.

				@return The <code>java.io.File</code> object corresponding to the main script, or <code>null</code> if there is no
					such file; e.g., the script has been packaged into a JAR file.
			*/
			public abstract File getFile();
			public abstract Reader getReader();
			public abstract Engine.Source getSource();
		}

		public abstract Script getScript();

		public abstract String[] getArguments();
	}

	static class Host {
		private Installation installation;
		private Configuration configuration;
		private Invocation invocation;

//		private Engine engine;

		private ArrayList<Runnable> finalizers = new ArrayList<Runnable>();

		static Host create(Installation installation, Configuration configuration, Invocation invocation) {
			Host rv = new Host();
			rv.installation = installation;
			rv.configuration = configuration;
			rv.invocation = invocation;
			configuration.initialize();
//			rv.engine = configuration.getEngine();
			return rv;
		}

		private static class ExitException extends Exception {
			private int status;

			ExitException(int status) {
				this.status = status;
			}

			int getStatus() {
				return status;
			}
		}

		private Engine.Program createProgram() {
			Engine.Program program = new Engine.Program();

			Engine.Program.Variable jsh = Engine.Program.Variable.create(
				"$host",
				Engine.Program.Variable.Value.create(new Interface())
			);
			jsh.setReadonly(true);
			jsh.setPermanent(true);
			jsh.setDontenum(true);
			program.set(jsh);

			Engine.Source jshJs = installation.getJshLoader();
			if (jshJs == null) {
				throw new RuntimeException("Could not locate jsh.js bootstrap file using " + installation);
			}
			program.add(jshJs);
			//	TODO	jsh could execute this below
			program.add(invocation.getScript().getSource());
			return program;
		}

		int execute() {
			try {
				Object ignore = configuration.getEngine().execute(createProgram());
				return 0;
			} catch (Engine.Errors e) {
				Engine.Errors.ScriptError[] errors = e.getErrors();
				for (int i=0; i<errors.length; i++) {
					Throwable t = errors[i].getThrowable();
					if (t instanceof WrappedException) {
						WrappedException wrapper = (WrappedException)t;
						if (wrapper.getWrappedException() instanceof ExitException) {
							return ((ExitException)wrapper.getWrappedException()).getStatus();
						}
					}
				}
				e.dump(configuration.getLog(), "[jsh] ");
				return -1;
			} finally {
				for (int i=0; i<finalizers.size(); i++) {
					try {
						finalizers.get(i).run();
					} catch (Throwable t) {
						//	TODO	log something about the exception
						configuration.getLog().println("Error running finalizer: " + finalizers.get(i));
					}
				}
			}
		}

		Scriptable load() {
			return configuration.getEngine().load(createProgram());
		}

		public class Interface {
			public String toString() {
				return getClass().getName()
					+ " engine=" + configuration.getEngine()
					+ " installation=" + installation
					+ " classpath=" + configuration.getClasspath()
				;
			}

			public Scriptable getRhinoLoader() throws IOException {
				return inonit.script.rhino.Loader.load(new inonit.script.rhino.Loader() {
					@Override public String getPlatformCode() throws IOException {
						return new Streams().readString(installation.getPlatformLoader().getReader());
					}

					@Override public String getRhinoCode() throws IOException {
						return new Streams().readString(installation.getRhinoLoader().getReader());
					}

					@Override public inonit.script.rhino.Loader.Classpath getClasspath() {
						return configuration.getClasspath().toLoaderClasspath();
					}

					@Override protected Engine getEngine() {
						return Host.this.configuration.getEngine();
					}
				});
			}

			public class Loader {
				public Code getBootstrapModule(String path) {
					return installation.getShellModuleCode(path);
				}

				public Installation.Plugin[] getPlugins() {
					return installation.getPlugins();
				}

				public Code.Source getPackagedCode() {
					return installation.getPackagedCode();
				}

				public void addFinalizer(Runnable runnable) {
					finalizers.add(runnable);
				}

				//	TODO	only known use of this is in addClasses.jsh.js test script; replace that with access to rhino/host
				//			module and remove this?
				public Class getJavaClass(String name) {
					try {
						return configuration.getClasspath().loadClass(name);
					} catch (ClassNotFoundException e) {
						return null;
					}
				}

				//	TODO	Currently used in httpd unit testing in embedded server, possibly; may be able to get rid of it
				//			given the new architecture running httpd unit tests in jsh subshell
				public ClassLoader getClassLoader() {
					return configuration.getClasspath();
				}
			}

			public Loader getLoader() {
				return new Loader();
			}

			public Properties getSystemProperties() {
				return configuration.getSystemProperties();
			}

			public Map getEnvironment() {
				return configuration.getEnvironment();
			}

			public class Stdio {
				public InputStream getStandardInput() {
					return configuration.getStdio().getStandardInput();
				}

				public PrintStream getStandardOutput() {
					return new PrintStream(configuration.getStdio().getStandardOutput());
				}

				public PrintStream getStandardError() {
					return new PrintStream(configuration.getStdio().getStandardError());
				}
			}

			public Stdio getStdio() {
				return new Stdio();
			}

			public class Debugger {
				private Engine.Debugger implementation = Host.this.configuration.getEngine().getDebugger();

				public boolean isBreakOnExceptions() {
					return implementation.isBreakOnExceptions();
				}

				public void setBreakOnExceptions(boolean b) {
					implementation.setBreakOnExceptions(b);
				}
			}

			public Debugger getDebugger() {
				return new Debugger();
			}

			//	Contains information used by jsh.script, like arguments and the base file invoked
			public Invocation getInvocation() {
				return invocation;
			}

			public void exit(int status) throws ExitException {
				Host.this.configuration.getEngine().getDebugger().setBreakOnExceptions(false);
				throw new ExitException(status);
			}

//			//
//			//	Not used by shell, but useful to specialized scripts that do various kinds of embedding
//			//
//
//			public Engine getEngine() {
//				return Interface.this.engine;
//			}
//
//			public class Engine {
//				public Module load(Code code) {
//					return Host.this.engine.load(code);
//				}
//			}
		}
	}
}