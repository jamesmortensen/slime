//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	The Original Code is the SLIME loader for rhino.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2012-2013 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

package inonit.script.engine;

import java.io.*;
import java.net.*;
import java.util.*;
import javax.lang.model.element.*;
import javax.tools.*;

public abstract class Code {
	public static abstract class Classes {
		public abstract URL getResource(String path);
	}

	public static abstract class Source {
		public static class URI {
			private static java.net.URI string(String s) {
				try {
					return new java.net.URI("slime://" + s);
				} catch (URISyntaxException e) {
					throw new RuntimeException(e);
				}
			}

			public static URI create(URL url) {
				try {
					return new URI(url.toURI());
				} catch (URISyntaxException e) {
					throw new RuntimeException(e);
				}
			}

			public static URI script(String scriptName, String path) {
				return new URI(string("script/" + scriptName.replace("/", "-") + "/" + path));
			}

			public static URI jvm(Class c, String path) {
				return new URI(string("java/" + c.getName() + "/" + path));
			}

			private java.net.URI delegate;

			private URI(java.net.URI delegate) {
				this.delegate = delegate;
			}

			java.net.URI adapt() {
				return delegate;
			}

			static URI create(java.io.File file) {
				return new URI(file.toURI());
			}
		}

		public static abstract class File {
			public abstract URI getURI();
			public abstract String getSourceName();
			public abstract InputStream getInputStream();
			public abstract Long getLength();
			public abstract java.util.Date getLastModified();

			public final Reader getReader() {
				InputStream in = getInputStream();
				if (in == null) return null;
				return new InputStreamReader(in);
			}

			public static File create(final java.io.File file) {
				return new File() {
					@Override public URI getURI() {
						return URI.create(file);
					}

					@Override public String getSourceName() {
						try {
							return file.getCanonicalPath();
						} catch (IOException e) {
							throw new RuntimeException(e);
						}
					}

					@Override public Long getLength() {
						return new Long(file.length());
					}

					@Override public java.util.Date getLastModified() {
						return new java.util.Date(file.lastModified());
					}

					@Override public InputStream getInputStream() {
						try {
							return new FileInputStream(file);
						} catch (IOException e) {
							throw new RuntimeException(e);
						}
					}
				};
			}

			//	TODO	this implementation will not respond correctly to getInputStream() being called multiple times
			public static File create(final URL url) {
				return new File() {
					@Override public URI getURI() {
						return URI.create(url);
					}

					@Override public String getSourceName() {
						return url.toExternalForm();
					}

					private URLConnection connection;

					private URLConnection connect() throws IOException {
						if (connection == null) {
							connection = url.openConnection();
						}
						return connection;
					}

					@Override public InputStream getInputStream() {
						try {
							return connect().getInputStream();
						} catch (IOException e) {
							throw new RuntimeException(e);
						}
					}

					@Override public Long getLength() {
						try {
							int i = connect().getContentLength();
							if (i == -1) return null;
							return Long.valueOf(i);
						} catch (IOException e) {
							throw new RuntimeException(e);
						}
					}

					@Override public Date getLastModified() {
						try {
							long l = connect().getLastModified();
							if (l == -1) return null;
							return new Date(l);
						} catch (IOException e) {
							throw new RuntimeException(e);
						}
					}
				};
			}

			//	Used in rhino/io to create Code.Source.File objects in resources implementation
			//	TODO	this is actually wrong, given that it uses a single input stream, making it so that the input stream cannot
			//			be created more than once
			public static File create(final URI uri, final String name, final Long length, final java.util.Date modified, final InputStream in) {
				return new File() {
					private byte[] bytes;

					@Override public String toString() {
						return "Code.Source.File uri=" + uri.adapt() + " name=" + name + " length=" + length + " modified=" + modified;
					}

					@Override public URI getURI() {
						return uri;
					}

					@Override public String getSourceName() {
						return name;
					}

					@Override public Long getLength() {
						return length;
					}

					@Override public java.util.Date getLastModified() {
						return modified;
					}

					@Override public InputStream getInputStream() {
						if (bytes == null) {
							try {
								bytes = new inonit.script.runtime.io.Streams().readBytes(in);
							} catch (IOException e) {
								throw new RuntimeException(e);
							}
						}
						return new ByteArrayInputStream(bytes);
					}
				};
			}
		}

		public static Source NULL = new Source() {
			@Override public String toString() { return "Code.Source.NULL"; }

			public File getFile(String path) {
				return null;
			}

			public Classes getClasses() {
				return null;
			}

			public Enumerator getEnumerator() {
				return null;
			}
		};

		public static Source system() {
			return new Source() {
				@Override public String toString() {
					return "Source: system class loader";
				}

				public File getFile(String path) {
					URL url = ClassLoader.getSystemClassLoader().getResource(path);
					if (url == null) return null;
					return File.create(url);
				}

				public Classes getClasses() {
					return null;
				}

				public Enumerator getEnumerator() {
					//	TODO	can this actually be implemented?
					return null;
				}
			};
		}

		public static Source system(final String prefix) {
			return system().child(prefix);
		}

		private static Source create(final java.net.URL url, Enumerator enumerator) {
			return new UrlBased(url, enumerator);
		}

		public static Source create(final java.net.URL url) {
			return new UrlBased(url, null);
		}

		public static Source create(java.io.File file) {
			try {
				return create(file.toURI().toURL(), Enumerator.create(file));
			} catch (java.net.MalformedURLException e) {
				throw new RuntimeException(e);
			}
		}

		public static Source create(final List<Source> delegates) {
			final Classes classes = new Classes() {
				@Override public URL getResource(String path) {
					for (Source delegate : delegates) {
						Classes c = delegate.getClasses();
						if (c != null && c.getResource(path) != null) {
							return c.getResource(path);
						}
					}
					return null;
				}
			};

			return new Source() {
				@Override public File getFile(String path) throws IOException {
					for (Source delegate : delegates) {
						if (delegate.getFile(path) != null) {
							return delegate.getFile(path);
						}
					}
					return null;
				}

				@Override public Classes getClasses() {
					return classes;
				}

				@Override public Enumerator getEnumerator() {
					//	TODO	implement
					return null;
				}
			};
		}

		public static abstract class Enumerator {
			static Enumerator create(final java.io.File file) {
				return new Enumerator() {
					private java.io.File getDirectory(String prefix) {
						if (prefix == null) return file;
						java.io.File rv = new java.io.File(file, prefix);
						if (rv.isDirectory()) {
							return rv;
						}
						throw new RuntimeException("Not found or not directory: " + rv);
					}

					@Override public String[] list(String prefix) {
						java.io.File dir = getDirectory(prefix);
						java.io.File[] files = dir.listFiles();
						ArrayList<String> rv = new ArrayList<String>();
						for (java.io.File file : files) {
							rv.add( (file.isDirectory()) ? file.getName() + "/" : file.getName() );
						}
						return rv.toArray(new String[rv.size()]);
					}
				};
			}

			public abstract String[] list(String prefix);
		}

		public abstract File getFile(String path) throws IOException;
		public abstract Enumerator getEnumerator();
		public abstract Classes getClasses();

		private String getChildPrefix(String prefix) {
			if (prefix == null || prefix.length() == 0) return "";
			if (prefix.endsWith("/")) return prefix;
			return prefix + "/";
		}

		public final Source child(final String prefix) {
			final String prepend = getChildPrefix(prefix);
			return new Code.Source() {
				@Override public String toString() {
					return Code.Source.class.getName() + " source=" + Source.this + " prefix=" + prefix;
				}

				public Source.File getFile(String path) throws IOException {
					return Source.this.getFile(prepend + path);
				}

				public Code.Classes getClasses() {
					final Classes delegate = Source.this.getClasses();
					if (delegate == null) {
						return null;
					}
					return new Classes() {
						@Override public URL getResource(String path) {
							return delegate.getResource(prepend+path);
						}
					};
				}

				public Enumerator getEnumerator() {
					final Enumerator parent = Source.this.getEnumerator();
					if (parent != null) {
						return new Enumerator() {
							@Override public String[] list(String subprefix) {
								String sub = (subprefix == null) ? "" : subprefix;
								return parent.list(prepend + sub);
							}
						};
					} else {
						return null;
					}
				}
			};
		}

		private static class UrlBased extends Source {
			private java.net.URL url;
			private Enumerator enumerator;
			private Classes classes;

			UrlBased(final java.net.URL url, Enumerator enumerator) {
				this.url = url;
				this.enumerator = enumerator;
				this.classes = new Classes() {
					private java.net.URLClassLoader delegate = new java.net.URLClassLoader(new java.net.URL[] {url});

					@Override public URL getResource(String path) {
						return delegate.getResource(path);
					}
				};
			}

			@Override public String toString() {
				return Code.Source.class.getName() + " url=" + url;
			}

			private String getSourceName(URL url) {
				if (url.getProtocol().equals("file")) {
					try {
						java.io.File file = new java.io.File(url.toURI());
						return file.getCanonicalPath();
					} catch (URISyntaxException e) {
					} catch (IOException e) {
					}
				}
				return url.toExternalForm();
			}

			private java.net.URI toURI(URL url) {
				//	.toURI does not work correctly for files with certain characters, like spaces.
				//	See http://stackoverflow.com/questions/4494063/how-to-avoid-java-net-urisyntaxexception-in-url-touri
				if (url.getProtocol().equals("file")) {
					return new java.io.File(url.getFile()).toURI();
				}
				try {
					return url.toURI();
				} catch (URISyntaxException e) {
					throw new RuntimeException(e);
				}
			}

			public File getFile(String path) throws IOException {
				URL url = classes.getResource(path);
//				if (url != null && path.indexOf("Throwables") != -1) {
//					System.err.println("this.url=" + this.url + " url=" + url + " path=" + path + " sourceName=" + getSourceName(url,path));
//				}
				if (url == null) return null;
				try {
					URLConnection connection = url.openConnection();
					//	TODO	Do something fancier to retain backward compatibility with 1.6
//					Long length = (connection.getContentLengthLong() == -1) ? null : new Long(connection.getContentLengthLong());
					Long length = (connection.getContentLength() == -1) ? null : new Long(connection.getContentLength());
					java.util.Date modified = (connection.getLastModified() == 0) ? null : new java.util.Date(connection.getLastModified());
					return File.create(
						new URI(toURI(new URL(this.url,path))),
						getSourceName(url),
						length,
						modified,
						connection.getInputStream()
					);
				} catch (IOException e) {
					//	TODO	is this the only way to test whether the URL is available?
					return null;
				}
			}

			public Enumerator getEnumerator() {
				return enumerator;
			}

			public Classes getClasses() {
				return classes;
			}
		}
	}

	private static Code create(final Code.Source source) {
		return new Code() {
			@Override public String toString() {
				return getClass().getName() + " source=" + source;
			}

			public Source getScripts() {
				return source;
			}

			public Source getClasses() {
				return source.child("$jvm/classes");
			}
		};
	}

	public static Code system(final String prefix) {
		final Source source = Source.system(prefix);
		return create(source);
	}

	public static Code create(final Code.Source source, final String prefix) {
		Code.Source s = source.child(prefix);
		return create(s);
	}

	public static Code create(final Source js, final Source classes) {
		return new Code() {
			@Override public String toString() {
				return getClass().getName() + " js=" + js + " classes=" + classes;
			}

			public Source getScripts() {
				return js;
			}

			public Source getClasses() {
				return classes;
			}
		};
	}

	public static Code slime(final File file) {
		return new Code() {
			public String toString() {
				try {
					String rv = getClass().getName() + ": slime=" + file.getCanonicalPath();
					return rv;
				} catch (IOException e) {
					return getClass().getName() + ": " + file.getAbsolutePath() + " [error getting canonical]";
				}
			}
			private Source source = Source.create(file);

			public Source getScripts() {
				return source;
			}

			public Source getClasses() {
				return source.child("$jvm/classes");
			}
		};
	}

	private static javax.tools.JavaCompiler javac;

	private static javax.tools.JavaCompiler resolveJavac() {
		if (javac == null) {
			javac = javax.tools.ToolProvider.getSystemJavaCompiler();
		}
		return javac;
	}

	private static class MemoryJavaClasses {
		private Map<String,OutputClass> classes = new HashMap<String,OutputClass>();

		private class OutputClass implements JavaFileObject {
			private String name;
			private ByteArrayOutputStream out;

			OutputClass(String name) {
				this.name = name;
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
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public OutputStream openOutputStream() throws IOException {
				out = new ByteArrayOutputStream();
				return out;
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
				classes.put(name, null);
				return true;
			}

		}

		JavaFileObject forOutput(String className) {
			//System.err.println("forOutput: " + className);
			if (false && classes.get(className) != null) {
				throw new UnsupportedOperationException("Duplicate!");
			}
			classes.put(className, new OutputClass(className));
			return classes.get(className);
		}

		Source.File getCompiledClass(String className) {
			//System.err.println("getCompiledClass: " + className);
			if (classes.get(className) != null) {
				final OutputClass oc = classes.get(className);
				return new Source.File() {
					@Override public Source.URI getURI() {
						return new Source.URI(oc.toUri());
					}

					@Override public String getSourceName() {
						return null;
					}

					@Override public InputStream getInputStream() {
						return new ByteArrayInputStream(oc.out.toByteArray());
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
			} else {
				return null;
			}
		}
	}

	private static class SourceFileObject implements JavaFileObject {
		private inonit.script.runtime.io.Streams streams = new inonit.script.runtime.io.Streams();

		private Source.File delegate;

		SourceFileObject(Source.File delegate) {
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

	private static abstract class ClassRepository {
		abstract List<JavaFileObject> list(String packageName);

		private static class JavaClassObject implements JavaFileObject {
			private String name;
			private File file;
			private byte[] data;

			JavaClassObject(String name, byte[] data) {
				this.name = name;
				this.data = data;
			}

			JavaClassObject(String name, File file) {
				this.name = name;
				this.file = file;
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
				return name;
			}

			public InputStream openInputStream() throws IOException {
				if (file != null) {
					return new FileInputStream(file);
				}
				if (data != null) {
					return new ByteArrayInputStream(data);
				}
				throw new UnsupportedOperationException("cannot open input stream for " + name); //To change body of generated methods, choose Tools | Templates.
			}

			public OutputStream openOutputStream() throws IOException {
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
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
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

		}

		private static class Jar extends ClassRepository {
			private HashMap<String,ArrayList<JavaClassObject>> files = new HashMap<String,ArrayList<JavaClassObject>>();

			private ArrayList<JavaClassObject> getList(String key) {
				if (files.get(key) == null) {
					files.put(key,new ArrayList<JavaClassObject>());
				}
				return files.get(key);
			}

			Jar(URL url) throws IOException {
				java.util.jar.JarInputStream in = new java.util.jar.JarInputStream(url.openStream());
				java.util.jar.JarEntry entry;
				while( (entry = in.getNextJarEntry()) != null ) {
					String path = entry.getName();
					String packagePath = (path.lastIndexOf("/") != -1) ? path.substring(0,path.lastIndexOf("/")+1) : "";
					ArrayList<JavaClassObject> list = getList(packagePath);
					String name = path.substring(packagePath.length());
					//System.err.println("packagePath=" + packagePath + " name=" + name);
					if (name.length() > 0) {
						ByteArrayOutputStream baos = new ByteArrayOutputStream();
						new inonit.script.runtime.io.Streams().copy(in, baos, false);
						byte[] data = baos.toByteArray();
						list.add(new JavaClassObject(name,data));
					}
				}
			}

			List<JavaFileObject> list(String packageName) {
				//System.err.println("list classes in JAR: " + packageName);
				String location = packageName.replace(".","/");
				if (location.length() > 0) {
					location += "/";
				}
				List<JavaClassObject> names = getList(location);
//				ArrayList<JavaFileObject> rv = new ArrayList<JavaFileObject>();
//				for (JavaClassO name : names) {
//					rv.add(new JavaClassObject(location + name));
//				}
//				return rv;
				ArrayList<JavaFileObject> rv = new ArrayList<JavaFileObject>();
				for (JavaClassObject c : names) {
					rv.add(c);
				}
				return rv;
			}
		}

		private static class Directory extends ClassRepository {
			private File directory;

			Directory(URL url) throws URISyntaxException {
				this.directory = new File(url.toURI());
			}

			@Override List<JavaFileObject> list(String packageName) {
				//System.err.println("list classes in directory: " + packageName);
				String path = packageName.replace(".","/");
				File root = new File(directory,path);
				ArrayList<JavaFileObject> rv = new ArrayList<JavaFileObject>();
				File[] list = (root.exists()) ? root.listFiles() : new File[0];
				for (File file : list) {
					if (!file.isDirectory()) {
						rv.add(new JavaClassObject(path + "/" + file.getName(),file));
					}
				}
				return rv;
			}
		}

		static ClassRepository create(URL url) throws IOException, URISyntaxException {
			if (url.getFile().endsWith(".jar")) {
				return new Jar(url);
			} else if (url.getProtocol().equals("file")) {
				return new Directory(url);
			} else {
				throw new RuntimeException("Unrecognized protocol: " + url.getProtocol());
			}
		}

		private static class Composite extends ClassRepository {
			private ArrayList<ClassRepository> delegates = new ArrayList<ClassRepository>();

			Composite(List<URL> urls) throws IOException, URISyntaxException {
				for (URL url : urls) {
					delegates.add(create(url));
				}
			}

			@Override List<JavaFileObject> list(String packageName) {
				ArrayList<JavaFileObject> rv = new ArrayList<JavaFileObject>();
				for (ClassRepository delegate : delegates) {
					rv.addAll(delegate.list(packageName));
				}
				//System.err.println("list(" + packageName + "): " + rv.size());
				return rv;
			}
		}

		static ClassRepository create(List<URL> urls) throws IOException, URISyntaxException {
			return new Composite(urls);
		}
	}

	private static List<URL> getClassLoaderUrls() {
		if (Code.class.getClassLoader() instanceof URLClassLoader) {
			return Arrays.asList( ((URLClassLoader)Code.class.getClassLoader()).getURLs() );
		} else {
			return new ArrayList<URL>();
		}
	}

	private static JavaFileManager createJavaFileManager(final MemoryJavaClasses compiled) {
		final boolean USE_STANDARD_FILE_MANAGER_TO_LIST_CLASSPATH = true;

		final List<URL> urls = getClassLoaderUrls();

		final ClassLoader classpath = new ClassLoader() {
			protected Class findClass(String name) throws ClassNotFoundException{
				throw new ClassNotFoundException(name);
			}
		};

		return new javax.tools.JavaFileManager() {
			private javax.tools.JavaFileManager delegate = javac.getStandardFileManager(null, null, null);

			public ClassLoader getClassLoader(JavaFileManager.Location location) {
				if (location == StandardLocation.CLASS_PATH) return classpath;
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public Iterable<JavaFileObject> list(JavaFileManager.Location location, String packageName, Set<JavaFileObject.Kind> kinds, boolean recurse) throws IOException {
				if (location == StandardLocation.PLATFORM_CLASS_PATH) return delegate.list(location, packageName, kinds, recurse);
				if (location == StandardLocation.CLASS_PATH) return delegate.list(location, packageName, kinds, recurse);
				if (location == StandardLocation.SOURCE_PATH) return Arrays.asList(new JavaFileObject[0]);
				if (true) throw new RuntimeException("No list() implementation for " + location);
				return Arrays.asList(new JavaFileObject[0]);
			}

			public String inferBinaryName(JavaFileManager.Location location, JavaFileObject file) {
				if (location == StandardLocation.PLATFORM_CLASS_PATH) return delegate.inferBinaryName(location, file);
				if (location == StandardLocation.CLASS_PATH) {
					int lastPeriod = file.getName().lastIndexOf(".");
					if (lastPeriod == -1) throw new RuntimeException("No period: " + file.getName());
					String rv = file.getName().substring(0,lastPeriod).replace(java.io.File.separator, ".");
					return rv;
				}
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public boolean isSameFile(FileObject a, FileObject b) {
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public boolean handleOption(String current, Iterator<String> remaining) {
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public boolean hasLocation(JavaFileManager.Location location) {
				if (location == StandardLocation.ANNOTATION_PROCESSOR_PATH) return false;
				if (location == StandardLocation.SOURCE_PATH) return true;
				//	StandardLocation.NATIVE_HEADER_OUTPUT not defined before Java 8
				if (location.getName().equals("NATIVE_HEADER_OUTPUT")) return false;
				throw new UnsupportedOperationException("Not supported yet: " + location.getName());
			}

			public JavaFileObject getJavaFileForInput(JavaFileManager.Location location, String className, JavaFileObject.Kind kind) throws IOException {
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public JavaFileObject getJavaFileForOutput(JavaFileManager.Location location, String className, JavaFileObject.Kind kind, FileObject sibling) throws IOException {
				if (location == StandardLocation.CLASS_OUTPUT) {
					return compiled.forOutput(className);
				}
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public FileObject getFileForInput(JavaFileManager.Location location, String packageName, String relativeName) throws IOException {
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public FileObject getFileForOutput(JavaFileManager.Location location, String packageName, String relativeName, FileObject sibling) throws IOException {
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public void flush() throws IOException {
			}

			public void close() throws IOException {
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}

			public int isSupportedOption(String option) {
				throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
			}
		};
	}

	private static Source getCompiledClasses(final Source source) {
		return new Source() {
			private MemoryJavaClasses compiled = new MemoryJavaClasses();
			private javax.tools.JavaFileManager jfm;

			private HashMap<String,Source.File> cache = new HashMap<String,Source.File>();

			private boolean hasClass(String name) {
				try {
					Class c = Code.class.getClassLoader().loadClass(name);
					return c != null;
				} catch (ClassNotFoundException e) {
					return false;
				}
			}

			private JavaFileManager resolveJavaFileManager() {
				if (jfm == null) {
					jfm = Code.createJavaFileManager(compiled);
				}
				return jfm;
			}

			@Override public Source.File getFile(String path) throws IOException {
				if (path.startsWith("org/apache/")) return null;
				if (path.startsWith("javax/")) return null;
//				String[] tokens = path.split("\\/");
//				String basename = tokens[tokens.length-1];
//				if (basename.indexOf("$") != -1) {
//					return null;
//				}
				if (cache.get(path) == null) {
					//	System.err.println("Looking up class " + path + " for " + source);
					String className = path.substring(0,path.length()-".class".length());
					String sourceName = className + ".java";
					if (sourceName.indexOf("$") != -1) {
						//	do nothing
					} else {
						Source.File sourceFile = source.getFile("java/" + sourceName);
						if (sourceFile == null && hasClass("org.mozilla.javascript.Context")) {
							sourceFile = source.getFile("rhino/java/" + sourceName);
						}
						if (sourceFile != null) {
							javax.tools.JavaFileObject jfo = new SourceFileObject(sourceFile);
							//System.err.println("Compiling: " + jfo);
							javax.tools.JavaCompiler.CompilationTask task = resolveJavac().getTask(
								null,
								resolveJavaFileManager(),
								null,
								Arrays.asList(new String[] { "-Xlint:unchecked"/*, "-verbose" */ }),
								null,
								Arrays.asList(new JavaFileObject[] { jfo })
							);
							boolean success = task.call();
							if (!success) {
								throw new RuntimeException("Failure");
							}
						}
					}
					cache.put(path, compiled.getCompiledClass(className.replace("/",".")));
				}
				return cache.get(path);
			}

			public Enumerator getEnumerator() {
				//	TODO	this probably can be implemented
				return null;
			}

			private Classes classes = new Classes() {
				@Override public URL getResource(String path) {
					return null;
				}
			};

			@Override public Classes getClasses() {
				return null;
			}
		};
	}

	private static class Unpacked extends Code {
		private URL url;
		private Source source;
		private Source classes;

		Unpacked(URL url) {
			this.url = url;
			this.source = Source.create(url);
			this.classes = getCompiledClasses(source);
		}

		public String toString() {
			return getClass().getName() + " url=" + url.toExternalForm();
		}

		public Source getScripts() {
			return source;
		}

		public Source getClasses() {
			boolean COMPILE_IN_MEMORY = true;
			return (COMPILE_IN_MEMORY) ? classes : Source.NULL;
		}
	}

	public static Code unpacked(final File base) {
		if (!base.isDirectory()) {
			throw new IllegalArgumentException(base + " is not a directory.");
		}
		return new Code() {
			private Source source = Source.create(base);
			private Source classes = getCompiledClasses(source);

			public String toString() {
				try {
					String rv = getClass().getName() + ": base=" + base.getCanonicalPath();
					return rv;
				} catch (IOException e) {
					return getClass().getName() + ": " + base.getAbsolutePath() + " [error getting canonical]";
				}
			}

			public Source getScripts() {
				return source;
			}

			public Source getClasses() {
				boolean COMPILE_IN_MEMORY = true;
				return (COMPILE_IN_MEMORY) ? classes : Source.NULL;
			}
		};
	}

	public static Code unpacked(final URL base) {
		return new Unpacked(base);
	}

	public static Code jar(final File jar) {
		return new Code() {
			public Source getScripts() {
				return null;
			}

			public Source getClasses() {
				return Source.create(jar);
			}
		};
	}

	public abstract Source getScripts();
	public abstract Source getClasses();
}