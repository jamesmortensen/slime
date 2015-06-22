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

package inonit.script.jsh.launcher;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.logging.*;

import javax.script.*;

import inonit.system.*;

public abstract class Engine {
	private static final Map<String,Engine> INSTANCES = new HashMap<String,Engine>();

	static {
		INSTANCES.put("rhino", new Rhino());
		INSTANCES.put("nashorn", new Nashorn());
	}

	static Engine get(String name) {
		return INSTANCES.get(name);
	}

	static Set<Map.Entry<String,Engine>> entries() {
		return INSTANCES.entrySet();
	}

	private Main.Invocation invocation;

	final void initialize(Main.Invocation invocation) throws IOException {
		this.invocation = invocation;
	}

	final boolean debug() {
		return invocation.debug();
	}

	final void debug(String message) {
		invocation.debug(message);
	}

	ClassLoader getRhinoClassLoader() throws IOException {
		return invocation.getRhinoClassLoader();
	}

	abstract boolean isInstalled(Main.Shell shell);
	abstract void initializeSystemProperties(Main.Invocation invocation, Main.Shell shell) throws IOException;
	abstract Integer run(URL script, String[] args) throws IOException, ScriptException;

	private static class Nashorn extends Engine {
		private ScriptEngineManager factory;
		private ScriptEngine engine;

		private ScriptEngine getEngine() {
			if (engine == null) {
				engine = factory.getEngineByName("nashorn");
			}
			return engine;
		}

		Nashorn() {
			this.factory = new ScriptEngineManager();
		}

		boolean isInstalled(Main.Shell shell) {
			return getEngine() != null;
		}

		void initializeSystemProperties(Main.Invocation invocation, Main.Shell shell) {
			System.setProperty("jsh.launcher.nashorn", "true");
		}

		Integer run(URL script, String[] args) throws IOException, ScriptException {
			Logging.get().log(Nashorn.class, Level.FINE, "arguments.length = %d", args.length);
			//	TODO	the next two lines are probably not both necessary
			this.factory.getBindings().put("$arguments", args);
			Logging.get().log(Nashorn.class, Level.FINE, "script: " + script);
			ScriptContext c = getEngine().getContext();
			c.setAttribute(ScriptEngine.FILENAME, script, ScriptContext.ENGINE_SCOPE);
			java.net.URLConnection connection = script.openConnection();
			getEngine().eval(new InputStreamReader(connection.getInputStream()), c);
			Logging.get().log(Nashorn.class, Level.FINE, "completed script: " + script);
			return null;
		}
	}

	public static class Rhino extends Engine {
		public static final int NULL_EXIT_STATUS = -42;

		boolean isInstalled(Main.Shell shell) {
			try {
				shell.getRhinoClassLoader().loadClass("org.mozilla.javascript.Context");
				return true;
			} catch (IOException e) {
				throw new RuntimeException(e);
			} catch (ClassNotFoundException e) {
				return false;
			}
		}

		private java.lang.reflect.Method getMainMethod() throws IOException, ClassNotFoundException, NoSuchMethodException {
			ClassLoader loader = getRhinoClassLoader();
			String mainClassName = (debug()) ? "org.mozilla.javascript.tools.debugger.Main" : "org.mozilla.javascript.tools.shell.Main";
			Class shell = loader.loadClass(mainClassName);
			String mainMethodName = (debug()) ? "main" : "exec";
			java.lang.reflect.Method main = shell.getMethod(mainMethodName, new Class[] { String[].class });
			return main;
		}

		void initializeSystemProperties(Main.Invocation invocation, Main.Shell shell) throws IOException {
			invocation.debug("Setting Rhino system properties...");
			System.setProperty("jsh.launcher.rhino", "true");
			if (shell.getRhinoClasspath() != null) {
				System.setProperty("jsh.launcher.rhino.classpath", shell.getRhinoClasspath());
			} else {
//				throw new RuntimeException("No Rhino classpath in " + this
//					+ ": JSH_RHINO_CLASSPATH is " + System.getenv("JSH_RHINO_CLASSPATH"))
//				;
			}
		}

		private String[] getArguments(URL script, String[] args) {
			ArrayList<String> strings = new ArrayList<String>();
			strings.add("-opt");
			strings.add("-1");
			strings.add(script.toExternalForm());
			strings.addAll(Arrays.asList(args));
			return strings.toArray(new String[0]);
		}

		private Integer getExitStatus() throws IOException, ClassNotFoundException, NoSuchFieldException, IllegalAccessException {
			Class c = getRhinoClassLoader().loadClass("org.mozilla.javascript.tools.shell.Main");
			java.lang.reflect.Field field = c.getDeclaredField("exitCode");
			field.setAccessible(true);
			int rv = field.getInt(null);
			if (rv == NULL_EXIT_STATUS) return null;
			return new Integer(rv);
		}

		@Override Integer run(URL script, String[] args) throws IOException {
			Integer status = null;
			Logging.get().log(Main.class, Level.FINE, "jsh.launcher.rhino.classpath = %s", System.getProperty("jsh.launcher.rhino.classpath"));
			try {
				java.lang.reflect.Method main = this.getMainMethod();
				Logging.get().log(Main.class, Level.FINER, "Rhino shell main = %s", main);
				String[] arguments = this.getArguments(script, args);
				Logging.get().log(Main.class, Level.FINER, "Rhino shell arguments:");
				for (int i=0; i<arguments.length; i++) {
					Logging.get().log(Main.class, Level.FINER, "Rhino shell argument %d: %s", i, arguments[i]);
				}
				Logging.get().log(Main.class, Level.INFO, "Entering Rhino shell");
				main.invoke(null, new Object[] { arguments });
				status = this.getExitStatus();
				Logging.get().log(Main.class, Level.INFO, "Exited Rhino shell with status: %s", status);
			} catch (ClassNotFoundException e) {
				e.printStackTrace();
				status = new Integer(127);
			} catch (NoSuchMethodException e) {
				e.printStackTrace();
				status = new Integer(127);
			} catch (NoSuchFieldException e) {
				e.printStackTrace();
				status = new Integer(127);
			} catch (IllegalAccessException e) {
				e.printStackTrace();
				status = new Integer(127);
			} catch (java.lang.reflect.InvocationTargetException e) {
				e.printStackTrace();
				status = new Integer(127);
			}
			return status;
		}
	}
}
