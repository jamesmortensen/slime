//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	The Original Code is the SLIME loader for rhino.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2010-2013 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

package inonit.script.rhino;

import java.io.*;
import java.util.*;

import org.mozilla.javascript.*;

import inonit.script.engine.*;

public class Engine {
	public static abstract class Log {
		public static final Log NULL = new Log() {
			public void println(String message) {
			}
		};

		public abstract void println(String message);

		public final void println() {
			println("");
		}
	}

	public static abstract class Configuration {
		public static final Configuration DEFAULT = new Configuration() {
			@Override public ClassLoader getApplicationClassLoader() {
				return null;
			}

			@Override public File getLocalClassCache() {
				return null;
			}

			@Override public boolean canCreateClassLoaders() {
				return true;
			}

			@Override public boolean canAccessEnvironment() {
				return true;
			}

			@Override public int getOptimizationLevel() {
				return -1;
			}
		};

		@Override public String toString() {
			return getClass().getName() + " factory=" + factory;
		}

		public abstract boolean canCreateClassLoaders();
		public abstract boolean canAccessEnvironment();

		/**
		 * Creates the single <code>ClassLoader</code> to be used for this {@link Engine}. Currently all {@link Context}s created
		 * by an <code>Engine</code> share the same <code>ClassLoader</code>.
		 *
		 * @return A <code>ClassLoader</code>, or <code>null</code> to use the ClassLoader that loaded Rhino.
		 */
		public abstract ClassLoader getApplicationClassLoader();

		public abstract File getLocalClassCache();
		public abstract int getOptimizationLevel();

		private ContextFactoryInner factory = new ContextFactoryInner();

		final ContextFactory factory() {
			return factory;
		}

		final synchronized Context getContext() {
			return Context.getCurrentContext();
		}

		final Loader.Classes.Interface getClasspath() {
			return factory.getClasspath();
		}

		void attach(org.mozilla.javascript.tools.debugger.Dim dim) {
			dim.attachTo(factory);
		}

		Object call(ContextAction action) {
			@SuppressWarnings("unchecked")
			Object rv = factory.call(action);
			return rv;
		}

		private class ContextFactoryInner extends ContextFactory {
			private Loader.Classes classes;

			ContextFactoryInner() {
			}

			private boolean initialized = false;

			private synchronized void initializeClassLoaders() {
				if (!initialized) {
					this.classes = Loader.Classes.create(new Loader.Classes.Configuration() {
						@Override public boolean canCreateClassLoaders() {
							return Configuration.this.canCreateClassLoaders();
						}

						@Override public ClassLoader getApplicationClassLoader() {
							return (Configuration.this.getApplicationClassLoader() == null) ? ContextFactory.class.getClassLoader() : Configuration.this.getApplicationClassLoader();
						}

						@Override public File getLocalClassCache() {
							return Configuration.this.getLocalClassCache();
						}
					});
					initialized = true;
				}
			}

			private synchronized ClassLoader getContextApplicationClassLoader() {
				initializeClassLoaders();
				return this.classes.getApplicationClassLoader();
			}

			final Loader.Classes.Interface getClasspath() {
				initializeClassLoaders();
				return this.classes.getInterface();
			}

			@Override protected synchronized Context makeContext() {
				Context rv = super.makeContext();
				rv.setApplicationClassLoader(getContextApplicationClassLoader());
				rv.setErrorReporter(new Engine.Errors().getErrorReporter());
				rv.setOptimizationLevel(getOptimizationLevel());
				return rv;
			}

			@Override protected boolean hasFeature(Context context, int feature) {
				if (feature == Context.FEATURE_STRICT_VARS) {
					return true;
				} else if (feature == Context.FEATURE_STRICT_EVAL) {
					return true;
				}
				return super.hasFeature(context, feature);
			}
		}

		public String getImplementationVersion() {
			Context context = getContext();
			if (context == null) {
				Context.enter();
				String rv = getContext().getImplementationVersion();
				Context.exit();
				return rv;
			} else {
				return context.getImplementationVersion();
			}
		}

		public org.mozilla.javascript.xml.XMLLib.Factory getRhinoE4xImplementationFactory() {
			Context context = getContext();
			if (context == null) {
				Context.enter();
				org.mozilla.javascript.xml.XMLLib.Factory rv = getContext().getE4xImplementationFactory();
				Context.exit();
				return rv;
			} else {
				return context.getE4xImplementationFactory();
			}
		}
	}

	public static Engine create(Debugger debugger, Configuration contexts) {
		Engine rv = new Engine();
		if (debugger == null) {
			debugger = new Debugger.NoDebugger();
		}
		rv.debugger = debugger;
		rv.configuration = contexts;
		debugger.initialize(contexts);
		return rv;
	}

	private Debugger debugger;
	private Configuration configuration;

	private Engine() {
	}

	private Scriptable getGlobalScope(Context context) {
		return context.initStandardObjects();
	}

	void script(String name, InputStream code, Scriptable scope, Scriptable target) throws IOException {
		Source source = Source.create(name,new InputStreamReader(code));
		source.evaluate(debugger, configuration, scope, target);
	}

	void script(String name, Reader code, Scriptable scope, Scriptable target) throws IOException {
		Source source = Source.create(name, code);
		source.evaluate(debugger, configuration, scope, target);
	}

	//	TODO	it would be nice if this returned the evaluation value of the script, but according to interactive testing,
	//			it does not; it always returns null, because source.evaluate always returns undefined, even for an expression.
	public Scriptable script(String name, String code, Scriptable scope, Scriptable target) throws IOException {
		Source source = Source.create(name,code);
		Object rv = source.evaluate(debugger, configuration, scope, target);
		if (rv instanceof Scriptable) return (Scriptable)rv;
		return null;
	}

	public boolean canAccessEnvironment() {
		return configuration.canAccessEnvironment();
	}

	public static class Errors extends RuntimeException {
		public static Errors get(Context context) {
			if (context == null) throw new RuntimeException("'context' must not be null.");
			if (context.getErrorReporter() instanceof Errors.ErrorReporterImpl) {
				return ((Errors.ErrorReporterImpl)context.getErrorReporter()).getErrors();
			} else {
				return null;
			}
		}

		private ArrayList<ScriptError> errors = new ArrayList<ScriptError>();
		private ErrorReporterImpl reporter = new ErrorReporterImpl();

		List<ScriptError> errors() {
			return errors;
		}

		class ErrorReporterImpl implements ErrorReporter {
			public void warning(String string, String string0, int i, String string1, int i0) {
				errors.add(new ScriptError(ScriptError.Type.WARNING, string, string0, i, string1, i0, null));
			}

			public EvaluatorException runtimeError(String string, String string0, int i, String string1, int i0) {
				if (errors == null) throw new RuntimeException("errors is null.");
				errors.add(new ScriptError(ScriptError.Type.RUNTIME, string, string0, i, string1, i0, null));
				return new EvaluatorException(string, string0, i, string1, i0);
			}

			public void error(String string, String string0, int i, String string1, int i0) {
				errors.add(new ScriptError(ScriptError.Type.ERROR, string, string0, i, string1, i0, null));
			}

			Errors getErrors() {
				return Errors.this;
			}
		}

		ErrorReporterImpl getErrorReporter() {
			return reporter;
		}

		private void emitErrorMessage(Log err, String prefix, ScriptError e) {
			err.println(prefix + e.getSourceName() + ":" + e.getLineNumber() + ": " + e.getMessage());
			String errCaret = "";
			//	TODO	This appears to be null even when it should not be.
			if (e.getLineSource() != null) {
				for (int i=0; i<e.getLineSource().length(); i++) {
					char c = e.getLineSource().charAt(i);
					if (i < e.getColumn()-1) {
						if (c == '\t') {
							errCaret += "\t";
						} else {
							errCaret += " ";
						}
					} else if (i == e.getColumn()-1) {
						errCaret += "^";
					}
				}
				err.println(prefix + e.getLineSource());
				err.println(prefix + errCaret);
			}
			if (e.getStackTrace() != null) {
				err.println(e.getStackTrace());
			}
			err.println();
		}

		public void dump(Log err, String prefix) {
			err.println();
			err.println(prefix + "Script halted because of " + errors.size() + " errors.");
			err.println();
			for (int i=0; i<errors.size(); i++) {
				emitErrorMessage(err, prefix, errors.get(i));
			}
		}

		public void reset() {
			this.errors = new ArrayList<ScriptError>();
		}

		public ScriptError[] getErrors() {
			return this.errors.toArray(new ScriptError[0]);
		}

		private void addRhino(RhinoException e) {
			errors.add(new ScriptError(ScriptError.Type.RUNTIME, e.getMessage(), e.sourceName(), e.lineNumber(), e.lineSource(), e.columnNumber(), e));
		}

		public void add(EcmaError e) {
			addRhino(e);
		}

		public void add(EvaluatorException e) {
			addRhino(e);
		}

		public void add(JavaScriptException e) {
			//	Thought about writing a separate method to construct ScriptError with no Throwable, under the theory that perhaps
			//	we would not want to dump a stack trace in this case (JavaScript throw keyword).  But decided in the end that
			//	stack traces are useful things, and if we want them for ordinary Java exceptions, JavaScript exceptions should
			//	qualify, too.
			addRhino(e);
		}

		public static class ScriptError {
			public static class Type {
				public static final Type RUNTIME = new Type();
				public static final Type ERROR = new Type();
				public static final Type WARNING = new Type();

				private Type() {
				}
			}

			private Type type;
			private String message;
			private String sourceName;
			private int line;
			private String lineSource;
			private int offset;
			private Throwable t;

			ScriptError(Type type, String message, String sourceName, int line, String lineSource, int offset, Throwable t) {
				this.type = type;
				this.message = message;
				this.sourceName = sourceName;
				this.line = line;
				this.lineSource = lineSource;
				this.offset = offset;
				this.t = t;
			}

			public String toString() {
				return getClass().getName() + " message=" + message + " sourceName=" + sourceName + " line=" + line;
			}

			public boolean is(Type type) {
				return this.type == type;
			}

			public String getSourceName() {
				return sourceName;
			}

			public int getLineNumber() {
				return line;
			}

			public String getLineSource() {
				return lineSource;
			}

			public int getColumn()  {
				return offset;
			}

			public String getMessage() {
				return message;
			}

			public String getStackTrace() {
				//	TODO	This implementation would be much easier with programmatic access to Rhino stack traces...
				if (t == null) return null;
				StringWriter s = new StringWriter();
				PrintWriter p = new PrintWriter(s, true);
				t.printStackTrace(p);
				String topStack = s.toString();
				if (topStack.indexOf("Caused by:") != -1) {
					topStack = topStack.substring(0, topStack.indexOf("Caused by:"));
				}
				s = new StringWriter();
				p = new PrintWriter(s, true);
				p.print(topStack);
				Throwable target = t.getCause();
				while(target != null) {
					p.println("Caused by: " + target.getClass().getName() + ": " + target.getMessage());
					for (int i=0; i<target.getStackTrace().length; i++) {
						StackTraceElement e = target.getStackTrace()[i];
						p.println("\tat " + e);
					}
					target = target.getCause();
					if (target != null) {
						p.print("Caused by: ");
					}
				}
				return s.toString();
			}

			public Throwable getThrowable() {
				return t;
			}
		}
	}

	public Object execute(Program program) {
		Program.Outcome outcome = (Program.Outcome)configuration.call(new ProgramAction(this, program, debugger));
		return outcome.getResult();
	}

	public static class Program {
		private ArrayList<Variable> variables = new ArrayList<Variable>();
		private ArrayList<Unit> units = new ArrayList<Unit>();

		public void set(Variable variable) {
			variables.add( variable );
		}

		private static class ObjectName {
			static final ObjectName NULL = new ObjectName();

			void set(Context context, Scriptable global, Variable variable) {
				ScriptableObject.defineProperty(
					global,
					variable.getName(),
					variable.getValue(context, global),
					variable.getRhinoAttributes()
				);
			}

			Scriptable get(Context context, Scriptable global, boolean create) {
				return global;
			}
		}

		public void add(Source source) {
			units.add( new SourceUnit(ObjectName.NULL, source) );
		}

		public void add(Function function, Object[] arguments) {
			units.add( new FunctionUnit(function, arguments) );
		}

		public void add(Unit unit) {
			units.add(unit);
		}

		static class Outcome {
			private Object result;

			Outcome(Object result) {
				this.result = result;
			}

			Object getResult() {
				return result;
			}
		}

		void setVariablesInGlobalScope(Context context, Scriptable global) {
			for (int i=0; i<variables.size(); i++) {
				Variable v = variables.get(i);
				Object value = v.value.get(context, global);

				//	Deal with dumb Rhino restriction that we use object arrays only
				if (value instanceof Object[]) {
					Object[] array = (Object[])value;
					Object[] objects = new Object[array.length];
					for (int j=0; j<objects.length; j++) {
						objects[j] = array[j];
					}
					value = context.newArray( global, objects );
				}

				v.set(context, global);
			}
		}

		private Outcome execute(Debugger dim, Context context, Scriptable global) throws IOException {
			if (context == null) {
				throw new RuntimeException("'context' is null");
			}
			Object result = null;
			for (int i=0; i<units.size(); i++) {
				Errors errors = Errors.get(context);
				if (errors != null) {
					errors.reset();
				}
				try {
					result = units.get(i).execute(dim, context, global);
				} catch (WrappedException e) {
					//	TODO	Note that when this is merged into jsh, we will need to change jsh error reporting to dump the
					//			stack trace from the contained Throwable inside the errors object.
//					throw e;
					if (errors != null) {
						errors.add(e);
						throw errors;
					} else {
						throw e;
					}
				} catch (EvaluatorException e) {
					//	TODO	Oh my goodness, is there no better way to do this?
					if (errors != null && (e.getMessage().indexOf("Compilation produced") == -1 || e.getMessage().indexOf("syntax errors.") == -1)) {
						errors.add(e);
					}
					if (errors != null) {
						throw errors;
					} else {
						throw e;
					}
				} catch (EcmaError e) {
					if (errors != null) {
						errors.add(e);
						throw errors;
					} else {
						throw e;
					}
				} catch (JavaScriptException e) {
					if (errors != null) {
						errors.add(e);
						throw errors;
					} else {
						throw e;
					}
				}
			}
			return new Outcome(result);
		}

		Outcome interpret(Debugger dim, Context context, Scriptable global) throws IOException {
			if (context == null) {
				throw new RuntimeException("'context' is null");
			}
			return execute(dim, context, global);
		}

		public static class Variable {
			public static Variable create(String name, Value value) {
				return new Variable(ObjectName.NULL, name, value, new Attributes());
			}

			private ObjectName scope;
			private String name;
			private Value value;
			private Attributes attributes;

			Variable(ObjectName scope, String name, Value value, Attributes attributes) {
				this.scope = scope;
				this.name = name;
				this.value = value;
				this.attributes = attributes;
			}

			String getName() {
				return name;
			}

			Object getValue(Context context, Scriptable scope) {
				return value.get(context, scope);
			}

			int getRhinoAttributes() {
				return attributes.toRhinoAttributes();
			}

			void set(Context context, Scriptable global) {
				scope.set(context, global, this);
			}

			public void setPermanent(boolean permanent) {
				attributes.permanent = permanent;
			}

			public void setReadonly(boolean readonly) {
				attributes.readonly = readonly;
			}

			public void setDontenum(boolean dontenum) {
				attributes.dontenum = dontenum;
			}

			public static abstract class Value {
				public static Value create(final Object o) {
					return new Value() {
						public Object get(Context context, Scriptable scope) {
							return Context.javaToJS(o, scope);
						}
					};
				}

				public abstract Object get(Context context, Scriptable scope);
			}

			public static class Attributes {
				public static Attributes create() {
					return new Attributes();
				}

				private boolean permanent;
				private boolean readonly;
				private boolean dontenum;

				private Attributes() {
				}

				int toRhinoAttributes() {
					int rv = ScriptableObject.EMPTY;
					if (permanent) rv |= ScriptableObject.PERMANENT;
					if (readonly) rv |= ScriptableObject.READONLY;
					if (dontenum) rv |= ScriptableObject.DONTENUM;
					return rv;
				}
			}
		}

		public static abstract class Unit {
			protected abstract Object execute(Debugger dim, Context context, Scriptable global) throws IOException;
		}

		private static class SourceUnit extends Unit {
			private ObjectName scope;
			private Source source;

			SourceUnit(ObjectName scope, Source source) {
				this.scope = scope;
				this.source = source;
			}

			protected Object execute(Debugger dim, Context context, Scriptable global) throws IOException {
				Scriptable executionScope = scope.get(context, global, true);
//				Script script = source.compile(dim, context);
//				Object rv = script.exec(context, executionScope);
//				return rv;
				return source.evaluate(dim, context, executionScope, executionScope, true);
			}
		}

		private static class FunctionUnit extends Unit {
			private Function function;
			private Object[] arguments;

			FunctionUnit(Function function, Object[] arguments) {
				this.function = function;
				this.arguments = arguments;
			}

			protected Object execute(Debugger dim, Context context, Scriptable global) {
				return function.call(context, global, global, arguments);
			}
		}
	}

	private static class ProgramAction implements ContextAction {
		private Engine engine;
		private Program program;
		private Debugger debugger;

		ProgramAction(Engine engine, Program program, Debugger debugger) {
			this.engine = engine;
			this.program = program;
			this.debugger = debugger;
		}

		public Object run(Context context) {
			try {
				Scriptable global = engine.getGlobalScope(context);
				program.setVariablesInGlobalScope(context, global);
				debugger.initialize(global, engine, program);
				Program.Outcome outcome = program.interpret(debugger, context, global);
				return outcome;
			} catch (java.io.IOException e) {
				throw new RuntimeException(e);
			}
		}
	}

	public Debugger getDebugger() {
		return this.debugger;
	}

	public Loader.Classes.Interface getClasspath() {
		return this.configuration.getClasspath();
	}
}