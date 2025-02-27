//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

package inonit.script.engine;

import java.io.*;
import java.net.*;
import java.util.*;
import java.util.logging.Level;

import javax.lang.model.element.*;
import javax.tools.*;

public class Java {
	private static final inonit.system.Logging LOG = inonit.system.Logging.get();

	private static javax.tools.JavaCompiler javac;

	private static javax.tools.JavaCompiler compiler() {
		if (javac == null) {
			javac = javax.tools.ToolProvider.getSystemJavaCompiler();
		}
		return javac;
	}

	private static class SourceFileObject implements JavaFileObject {
		private inonit.script.runtime.io.Streams streams = new inonit.script.runtime.io.Streams();

		private Code.Loader.Resource delegate;

		SourceFileObject(Code.Loader.Resource delegate) {
			this.delegate = delegate;
		}

		@Override public String toString() {
			return "SourceFileObject:" + " uri=" + toUri() + " name=" + getName();
		}

		public Kind getKind() {
			return Kind.SOURCE;
		}

		public boolean isNameCompatible(String simpleName, Kind kind) {
			//	TODO	line below is suspicious, should try removing it
			if (simpleName.equals("package-info")) return false;
			if (kind == JavaFileObject.Kind.SOURCE) {
				String slashed = delegate.getSourceName().replace("\\", "/");
				String basename = slashed.substring(slashed.lastIndexOf("/")+1);
				String className = basename.substring(0,basename.length()-".java".length());
				return className.equals(simpleName);
			}
			throw new UnsupportedOperationException("simpleName = " + simpleName + " kind=" + kind);
		}

		public NestingKind getNestingKind() {
			throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
		}

		public Modifier getAccessLevel() {
			throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
		}

		public URI toUri() {
			return delegate.getURI().adapt();
		}

		public String getName() {
			//	Specification does not specify but a relative path would be a good idea
			return delegate.getSourceName();
		}

		public InputStream openInputStream() throws IOException {
			throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
		}

		public OutputStream openOutputStream() throws IOException {
			throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
		}

		public Reader openReader(boolean ignoreEncodingErrors) throws IOException {
			throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
		}

		public CharSequence getCharContent(boolean ignoreEncodingErrors) throws IOException {
			return streams.readString(delegate.getInputStream());
		}

		public Writer openWriter() throws IOException {
			throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
		}

		public long getLastModified() {
			throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
		}

		public boolean delete() {
			throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
		}
	}

	private static class Classes {
		private static Classes create(Store store, ClassLoader dependencies) {
			return new Classes(store, dependencies);
		}

		private MyJavaFileManager jfm;

		private Classes(Store store, ClassLoader dependencies) {
			this.jfm = new MyJavaFileManager(store, dependencies);
		}

		private Code.Loader.Resource getFile(String name) {
			try {
				MyJavaFileManager.OutputClass jfo = (MyJavaFileManager.OutputClass)this.jfm.getJavaFileForInput(null, name, null);
				if (jfo == null) return null;
				return jfo.toCodeSourceFile();
			} catch (IOException e) {
				return null;
			}
		}

		private boolean compile(JavaFileObject jfo) {
			javax.tools.JavaCompiler.CompilationTask task = compiler().getTask(
				null,
				jfm,
				null,
				Arrays.asList(new String[] { "-Xlint:unchecked"/*, "-verbose" */ }),
				null,
				Arrays.asList(new JavaFileObject[] { jfo })
			);
			boolean success = task.call();
			return success;
		}

		private boolean compile(Code.Loader.Resource javaSource) {
			return compile(new SourceFileObject(javaSource));
		}

		final Store store() {
			return this.jfm.store();
		}

		private static class MyJavaFileManager implements JavaFileManager {
			private javax.tools.JavaFileManager delegate = compiler().getStandardFileManager(null, null, null);

			private Java.Store store;
			private final ClassLoader classLoader;

			private Map<String,OutputClass> map = new HashMap<String,OutputClass>();

			MyJavaFileManager(Java.Store store, ClassLoader classLoader) {
				this.store = store;
				this.classLoader = classLoader;
			}

			private void log(String message) {
				LOG.log(MyJavaFileManager.class, Level.FINE, message, null);
			}

			private void log(Level level, String message) {
				LOG.log(MyJavaFileManager.class, level, message, null);
			}

			private Code.Loader parent;

			private Code.Loader parent() {
				if (parent == null) {
					ClassLoader parentClassLoader = classLoader.getParent();
					if (parentClassLoader instanceof URLClassLoader) {
						parent = Code.Loader.create( (URLClassLoader)parentClassLoader );
					}
				}
				return parent;
			}

			final Store store() {
				return store;
			}

			public ClassLoader getClassLoader(JavaFileManager.Location location) {
				log("getClassLoader");
				if (location == StandardLocation.CLASS_PATH) return classLoader;
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public Iterable<JavaFileObject> list(JavaFileManager.Location location, String packageName, Set<JavaFileObject.Kind> kinds, boolean recurse) throws IOException {
				if (location == StandardLocation.PLATFORM_CLASS_PATH) {
					LOG.log(MyJavaFileManager.class, Level.FINER, "list location=" + location + " packageName=" + packageName + " kinds=" + kinds + " recurse=" + recurse, null);
					Iterable<JavaFileObject> rv = delegate.list(location, packageName, kinds, recurse);
					for (JavaFileObject o : rv) {
						log(Level.FINER, "list jfo " + o);
					}
					return rv;
				}
				if (location == StandardLocation.CLASS_PATH) {
					List<JavaFileObject> rv = new ArrayList<JavaFileObject>();
					LOG.log(MyJavaFileManager.class, Level.FINE, "list location=" + location + " packageName=" + packageName + " kinds=" + kinds + " recurse=" + recurse, null);
					Code.Loader parent = parent();
					if (parent != null) {
						LOG.log(MyJavaFileManager.class, Level.FINE, "parent=" + parent, null);
						String path = packageName.replaceAll("\\.","/");
						LOG.log(MyJavaFileManager.class, Level.FINE, "path=" + path, null);
						LOG.log(MyJavaFileManager.class, Level.FINE, "parent=" + parent, null);
						if (parent.getEnumerator() == null) {
							throw new Error("Parent enumerator is null for " + parent);
						}
						List<String> names = Arrays.asList(parent.getEnumerator().list(path));
						for (String name : names) {
							if (name.endsWith("/")) {
								continue;
							}
							//	TODO	may not work for empty package
							Code.Loader.Resource file = parent.getFile(path + "/" + name);
							if (name.length() < ".class".length()) {
								throw new RuntimeException("name is " + name);
							}
							String binaryName = (path + "/" + name.substring(0, name.length() - ".class".length()));
							binaryName = binaryName.replaceAll("\\/", ".");
							rv.add(new InputClass(file, binaryName));
						}
						LOG.log(MyJavaFileManager.class, Level.FINE, "path=" + path + " list=" + names, null);
					} else {
						LOG.log(MyJavaFileManager.class, Level.FINE, "classpath is null", null);
					}
					Iterable<JavaFileObject> standard = delegate.list(location, packageName, kinds, recurse);
					for (JavaFileObject s : standard) {
						rv.add(s);
					}
					return rv;
				}
				if (location == StandardLocation.SOURCE_PATH) {
					return Arrays.asList(new JavaFileObject[0]);
				} else if (location.getName().startsWith("SYSTEM_MODULES")) {
					return delegate.list(location, packageName, kinds, recurse);
				} else {
					throw new RuntimeException("No list() implementation for " + location);
				}
			}

			public String inferBinaryName(JavaFileManager.Location location, JavaFileObject file) {
				if (location == StandardLocation.PLATFORM_CLASS_PATH) {
					String rv = delegate.inferBinaryName(location, file);
					log(Level.FINER, "inferBinaryName location=" + location + " file=" + file + " rv=" + rv);
					return rv;
				}
				if (file instanceof InputClass) {
					String rv = ((InputClass)file).binaryName();
					log("inferBinaryName location=" + location + " file object " + file + " rv=" + rv);
					return rv;
				}
				if (location == StandardLocation.CLASS_PATH) {
					String rv = delegate.inferBinaryName(location, file);
					log("inferBinaryName location=" + location + " jfo " + file + " rv=" + rv);
					return rv;
				}
				if (location.getName().startsWith("SYSTEM_MODULES")) {
					String rv = delegate.inferBinaryName(location, file);
					log("inferBinaryName location=" + location + " jfo " + file + " rv=" + rv);
					return rv;
				}
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public boolean isSameFile(FileObject a, FileObject b) {
				log("isSameFile");
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public boolean handleOption(String current, Iterator<String> remaining) {
				log("handleOption");
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public boolean hasLocation(JavaFileManager.Location location) {
				log("hasLocation");
				if (location == StandardLocation.ANNOTATION_PROCESSOR_PATH) return false;
				if (location == StandardLocation.SOURCE_PATH) return true;
				//	StandardLocation.NATIVE_HEADER_OUTPUT not defined before Java 8
				if (location.getName().equals("NATIVE_HEADER_OUTPUT")) return false;
				//	Next three come from Java 11; fourth is used in Java 11 but not Java 8
				if (location.getName().equals("MODULE_SOURCE_PATH")) return false;
				if (location.getName().equals("ANNOTATION_PROCESSOR_MODULE_PATH")) return false;
				if (location.getName().equals("PATCH_MODULE_PATH")) return false;
				if (location.getName().equals("CLASS_OUTPUT")) return false;
				if (location.getName().startsWith("SYSTEM_MODULES")) return true;
				throw new UnsupportedOperationException("Not supported yet: hasLocation(location=" + location.getName() + ")");
			}

			public JavaFileObject getJavaFileForInput(JavaFileManager.Location location, String className, JavaFileObject.Kind kind) throws IOException {
				LOG.log(MyJavaFileManager.class, Level.FINE, "getJavaFileForInput: location=" + location + " className=" + className + " kind=" + kind, null);
				if (location == null) {
					return map.get(className);
				}
				if (location.getName().equals("SOURCE_PATH") && className != null && className.equals("module-info")) {
					return null;
				}
				if (location.getName().startsWith("SYSTEM_MODULES")) {
					//throw new UnsupportedOperationException("Refactoring required.");
					return delegate.getJavaFileForInput(location, className, kind);
				}
				throw new UnsupportedOperationException("Not supported yet: getJavaFileForInput(location=" + location.getName() + ")");
			}

			public JavaFileObject getJavaFileForOutput(JavaFileManager.Location location, String className, JavaFileObject.Kind kind, FileObject sibling) throws IOException {
				LOG.log(MyJavaFileManager.class, Level.FINE, "getJavaFileForOutput: location=" + location + " className=" + className + " kind=" + kind, null);
				map.put(className, new OutputClass(store,className));
				return map.get(className);
	//			if (location == StandardLocation.CLASS_OUTPUT) {
	//				return classes.forOutput(className);
	//			}
	//			throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public FileObject getFileForInput(JavaFileManager.Location location, String packageName, String relativeName) throws IOException {
				LOG.log(MyJavaFileManager.class, Level.FINE, "getJavaFileForInput: location=" + location + " packageName=" + packageName + " relativeName=" + relativeName, null);
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public FileObject getFileForOutput(JavaFileManager.Location location, String packageName, String relativeName, FileObject sibling) throws IOException {
				log("getFileForOutput");
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public void flush() throws IOException {
				log("flush");
			}

			public void close() throws IOException {
				log("close");
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public int isSupportedOption(String option) {
				if (option.equals("--multi-release")) return -1;
				log("isSupportedOption");
				throw new UnsupportedOperationException("Not supported yet: isSupportedOption(" + option + ")"); //To change body of generated methods, choose Tools | Templates.
			}

			//	Below added for JDK 11 ... implementation may be nonsensical, just overrides method that throws UnxupportedOperationException
			private final Iterable<Set<JavaFileManager.Location>> EMPTY_LOCATIONS_FOR_MODULES = new ArrayList<Set<JavaFileManager.Location>>();

			private Iterable<Set<JavaFileManager.Location>> getDefaultListLocationsForModules(JavaFileManager.Location location) {
				try {
					java.lang.reflect.Method method = delegate.getClass().getMethod("listLocationsForModules", new Class[] { JavaFileManager.Location.class });
					//	No real way to avoid unchecked warning here, since return type is generic, Class.cast() is not enough
					@SuppressWarnings("unchecked")
					Iterable<Set<JavaFileManager.Location>> rv = (Iterable<Set<JavaFileManager.Location>>)method.invoke(delegate, new Object[] { location });
					return rv;
				} catch (NoSuchMethodException e) {
					return null;
				} catch (IllegalAccessException e) {
					return null;
				} catch (java.lang.reflect.InvocationTargetException e) {
					return null;
				} finally {}
			}

			private String defaultInferModuleName(JavaFileManager.Location location) {
				try {
					java.lang.reflect.Method method = delegate.getClass().getMethod("inferModuleName", new Class[] { JavaFileManager.Location.class });
					return (String)method.invoke(delegate, new Object[] { location });
				} catch (NoSuchMethodException e) {
					return null;
				} catch (IllegalAccessException e) {
					return null;
				} catch (java.lang.reflect.InvocationTargetException e) {
					return null;
				} finally {}
			}

			public String inferModuleName(JavaFileManager.Location location) {
				return defaultInferModuleName(location);
			}

			public Iterable<Set<JavaFileManager.Location>> listLocationsForModules(JavaFileManager.Location location) {
				LOG.log(MyJavaFileManager.class, Level.FINE, "listLocationsForModules(" + location + "); default=" + getDefaultListLocationsForModules(location), null);
				return getDefaultListLocationsForModules(location);
//				return EMPTY_LOCATIONS_FOR_MODULES;
			}

			private static class InputClass implements JavaFileObject {
				private Code.Loader.Resource file;
				private String name;

				InputClass(Code.Loader.Resource file, String name) {
					this.file = file;
					this.name = name;
				}

				String binaryName() {
					return name;
				}

				public String toString() {
					return "InputClass: " + file;
				}

				public Kind getKind() {
					LOG.log(InputClass.class, Level.FINE, "getKind", null);
					return Kind.CLASS;
				}

				public boolean isNameCompatible(String simpleName, Kind kind) {
					LOG.log(MyJavaFileManager.class, Level.FINE, "isNameCompatible(" + simpleName + "," + kind + ")", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public NestingKind getNestingKind() {
					LOG.log(MyJavaFileManager.class, Level.FINE, "getNestingKind", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public Modifier getAccessLevel() {
					LOG.log(MyJavaFileManager.class, Level.FINE, "getAccessLevel", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public URI toUri() {
					LOG.log(MyJavaFileManager.class, Level.FINE, "toUri", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public String getName() {
					LOG.log(MyJavaFileManager.class, Level.FINE, "getName", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public InputStream openInputStream() throws IOException {
					LOG.log(MyJavaFileManager.class, Level.FINE, "openInputStream", null);
					return file.getInputStream();
//					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public OutputStream openOutputStream() throws IOException {
					LOG.log(MyJavaFileManager.class, Level.FINE, "openOutputStream", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public Reader openReader(boolean ignoreEncodingErrors) throws IOException {
					LOG.log(MyJavaFileManager.class, Level.FINE, "openReader", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public CharSequence getCharContent(boolean ignoreEncodingErrors) throws IOException {
					LOG.log(MyJavaFileManager.class, Level.FINE, "getCharContent", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public Writer openWriter() throws IOException {
					LOG.log(MyJavaFileManager.class, Level.FINE, "openWriter", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public long getLastModified() {
					LOG.log(MyJavaFileManager.class, Level.FINE, "getLastModified", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public boolean delete() {
					LOG.log(MyJavaFileManager.class, Level.FINE, "delete", null);
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}
			}

			private static class OutputClass implements JavaFileObject {
				private Store store;
				private String name;

				OutputClass(Store store, String name) {
					this.store = store;
					this.name = name;
				}

				Code.Loader.Resource toCodeSourceFile() {
					final OutputClass compiled = this;
					return new Code.Loader.Resource() {
						@Override public Code.Loader.URI getURI() {
							return Code.Loader.URI.create(compiled.toUri());
						}

						@Override public String getSourceName() {
							return null;
						}

						@Override public InputStream getInputStream() {
							try {
								return compiled.openInputStream();
							} catch (IOException e) {
								throw new RuntimeException(e);
							}
						}

						@Override public Long getLength() {
							//	TODO	length of array
							return null;
						}

						@Override public Date getLastModified() {
							//	TODO	might as well store
							return null;
						}
					};
				}

				public Kind getKind() {
					return Kind.CLASS;
				}

				public boolean isNameCompatible(String simpleName, Kind kind) {
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public NestingKind getNestingKind() {
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public Modifier getAccessLevel() {
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public URI toUri() {
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public String getName() {
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public InputStream openInputStream() throws IOException {
					return store.read(name).getInputStream();
				}

				public OutputStream openOutputStream() throws IOException {
					return store.createOutputStream(name);
				}

				public Reader openReader(boolean ignoreEncodingErrors) throws IOException {
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public CharSequence getCharContent(boolean ignoreEncodingErrors) throws IOException {
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public Writer openWriter() throws IOException {
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public long getLastModified() {
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				public boolean delete() {
					store.remove(name);
					return true;
				}
			}
		}
	}

	private static class SourceDirectoryClassesSource extends Code.Loader {
		private Code.Loader delegate;
		private Java.Classes classes;

		SourceDirectoryClassesSource(Code.Loader delegate, Store store, ClassLoader classLoader) {
			this.delegate = delegate;
			this.classes = Classes.create(store, classLoader);
		}

		public String toString() {
			return "SourceDirectoryClassesSource: src=" + delegate;
		}

		private HashMap<String,Code.Loader.Resource> cache = new HashMap<String,Code.Loader.Resource>();

		private boolean hasClass(String name) {
			try {
				Class<?> c = Java.class.getClassLoader().loadClass(name);
				return c != null;
			} catch (ClassNotFoundException e) {
				return false;
			}
		}

		@Override public Code.Loader.Resource getFile(String path) throws IOException {
			if (path.startsWith("org/apache/")) return null;
			if (path.startsWith("javax/")) return null;
			if (cache.get(path) == null) {
//				LOG.log(Java.class, Level.FINE, "Reading from " + path + " in store " + store, null);
				Code.Loader.Resource stored = this.classes.store().readAt(path);
				if (stored != null) {
					cache.put(path, stored);
				} else {
					//	System.err.println("Looking up class " + path + " for " + source);
					String className = path.substring(0,path.length()-".class".length());
					String sourceName = className + ".java";
					if (sourceName.indexOf("$") != -1) {
						//	do nothing
						//	TODO	should we not strip off the inner class name, and compile the outer class? I am assuming that
						//			given that this code appears to have been working, we never load an inner class before loading
						//			the outer class under normal Java operation
					} else {
						Code.Loader.Resource sourceFile = delegate.getFile("java/" + sourceName);
						if (sourceFile == null && hasClass("org.mozilla.javascript.Context")) {
							sourceFile = delegate.getFile("rhino/java/" + sourceName);
						}
						if (sourceFile != null) {
							//System.err.println("Compiling: " + jfo);
							boolean success = classes.compile(sourceFile);
							if (!success) {
								throw new RuntimeException("Failure: sourceFile=" + sourceFile);
							}
						}
					}
					cache.put(path, classes.getFile(className.replace("/",".")));
				}
			}
			return cache.get(path);
		}

		public Enumerator getEnumerator() {
			//	TODO	this probably can be implemented
			return null;
		}

		@Override public Code.Locator getLocator() {
			return null;
		}
	}

	static Code.Loader compiling(final Code.Loader base, final Store store, final ClassLoader dependencies) {
		return new SourceDirectoryClassesSource(base, store, dependencies);
	}

	static abstract class Store {
		private static class InMemoryWritableFile extends Code.Loader.Resource {
			private MyOutputStream out;
			private Date modified;

			private class MyOutputStream extends OutputStream {
				private ByteArrayOutputStream delegate = new ByteArrayOutputStream();

				@Override public void close() throws IOException {
					delegate.close();
					modified = new Date();
				}

				@Override public void flush() throws IOException {
					delegate.flush();
				}

				@Override public void write(byte[] b, int off, int len) throws IOException {
					delegate.write(b, off, len); //To change body of generated methods, choose Tools | Templates.
				}

				@Override public void write(int b) throws IOException {
					delegate.write(b);
				}

				@Override public void write(byte[] b) throws IOException {
					delegate.write(b); //To change body of generated methods, choose Tools | Templates.
				}

				ByteArrayOutputStream delegate() {
					return delegate;
				}
			}

			OutputStream createOutputStream() {
				modified = null;
				this.out = new MyOutputStream();
				return this.out;
			}

			@Override public Code.Loader.URI getURI() {
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			@Override public String getSourceName() {
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			@Override public InputStream getInputStream() {
				if (modified == null) throw new IllegalStateException("Stream is currently being written.");
				return new ByteArrayInputStream(this.out.delegate().toByteArray());
			}

			@Override public Long getLength() {
				if (modified == null) throw new IllegalStateException("Stream is currently being written.");
				return Long.valueOf(this.out.delegate().toByteArray().length);
			}

			@Override public Date getLastModified() {
				if (modified == null) throw new IllegalStateException("Stream is currently being written.");
				return modified;
			}
		}

		final String getClassLocationString(String name) {
			return name.replaceAll("\\.", "/") + ".class";
		}

		abstract OutputStream createOutputStreamAt(String name);

		final OutputStream createOutputStream(String className) {
			return createOutputStreamAt(getClassLocationString(className));
		}

		abstract Code.Loader.Resource readAt(String name);

		Code.Loader.Resource read(String className) {
			return readAt(getClassLocationString(className));
		}

		abstract void removeAt(String location);

		final void remove(String name) {
			removeAt(getClassLocationString(name));
		}

		static Store memory() {
			return new Store() {
				private HashMap<String,InMemoryWritableFile> map = new HashMap<String,InMemoryWritableFile>();

				private InMemoryWritableFile create(String name) {
					if (map.get(name) == null) {
						map.put(name, new InMemoryWritableFile());
					}
					return map.get(name);
				}

				@Override OutputStream createOutputStreamAt(String location) {
					return create(location).createOutputStream();
				}

				@Override Code.Loader.Resource readAt(String location) {
					return map.get(location);
				}

				@Override void removeAt(String name) {
					map.remove(name);
				}
			};
		}

		static Store file(final File file) {
			return new Store() {
				@Override public String toString() {
					return "Java.Store: directory = " + file;
				}

				@Override OutputStream createOutputStreamAt(String location) {
					File destination = new File(file, location);
					destination.getParentFile().mkdirs();
					try {
						LOG.log(Java.class, Level.FINE, "Writing class to " + destination, null);
						return new FileOutputStream(destination);
					} catch (FileNotFoundException e) {
						throw new RuntimeException(e);
					}
				}

				@Override Code.Loader.Resource readAt(String location) {
					final File source = new File(file, location);
					LOG.log(Java.class, Level.FINE, "Attempting to read class from " + source, null);
					if (!source.exists()) return null;
					if (!source.exists()) return null;
					return new Code.Loader.Resource() {
						@Override public Code.Loader.URI getURI() {
							throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
						}

						@Override public String getSourceName() {
							throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
						}

						@Override public InputStream getInputStream() {
							try {
								return new FileInputStream(source);
							} catch (FileNotFoundException e) {
								throw new RuntimeException(e);
							}
						}

						@Override public Long getLength() {
							throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
						}

						@Override public Date getLastModified() {
							throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
						}
					};
				}

				@Override void removeAt(String location) {
					File at = new File(file, location);
					if (at.exists()) at.delete();
					if (at.exists()) at.delete();
				}
			};
		}
	}
}
