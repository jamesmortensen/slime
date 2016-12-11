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
			
			static URI create(java.net.URI delegate) {
				return new URI(delegate);
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
			
			private static File adapt(final JavaFileObject compiled) {
				if (compiled == null) return null;
				return new Code.Source.File() {
					@Override public Code.Source.URI getURI() {
						return Code.Source.URI.create(compiled.toUri());
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

	private static class SourceDirectoryClassesSource extends Source {
		private Source delegate;

		SourceDirectoryClassesSource(Source delegate) {
			this.delegate = delegate;
		}

		private javax.tools.JavaFileManager jfm = Java.Classes.create(Java.Classes.Store.memory());
//		private javax.tools.JavaFileManager jfm;

		private HashMap<String,Source.File> cache = new HashMap<String,Source.File>();

		private boolean hasClass(String name) {
			try {
				Class c = Code.class.getClassLoader().loadClass(name);
				return c != null;
			} catch (ClassNotFoundException e) {
				return false;
			}
		}

//		private JavaFileManager resolveJavaFileManager() {
//			if (jfm == null) {
//				jfm = compiled.getJavaFileManager();
//			}
//			return jfm;
//		}
		
//		private Source.File toSourceFile(Java.Classes.Compiled compiled) {
//			if (compiled == null) return null;
//			return Source.File.create(compiled);
//		}

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
					//	TODO	should we not strip off the inner class name, and compile the outer class? I am assuming that
					//			given that this code appears to have been working, we never load an inner class before loading
					//			the outer class under normal Java operation
				} else {
					Source.File sourceFile = delegate.getFile("java/" + sourceName);
					if (sourceFile == null && hasClass("org.mozilla.javascript.Context")) {
						sourceFile = delegate.getFile("rhino/java/" + sourceName);
					}
					if (sourceFile != null) {
						javax.tools.JavaFileObject jfo = new SourceFileObject(sourceFile);
						//System.err.println("Compiling: " + jfo);
						javax.tools.JavaCompiler.CompilationTask task = Java.compiler().getTask(
							null,
							jfm,
							null,
							Arrays.asList(new String[] { "-Xlint:unchecked"/*, "-verbose" */ }),
							null,
							Arrays.asList(new JavaFileObject[] { jfo })
						);
						boolean success = task.call();
						if (!success) {
							throw new RuntimeException("Failure: sourceFile=" + sourceFile + " jfo=" + jfo);
						}
					}
				}
				//	TODO	passing null as the location to the Java file manager here is sort of ludicrous, but we are restricting
				//			the use of that object and have written it for private use, so for the moment, it appears to work
				cache.put(path, Source.File.adapt(jfm.getJavaFileForInput(null, className.replace("/","."), null)));
			}
			return cache.get(path);
		}

		public Enumerator getEnumerator() {
			//	TODO	this probably can be implemented
			return null;
		}

//		private Classes classes = new Classes() {
//			@Override public URL getResource(String path) {
//				return null;
//			}
//		};

		@Override public Classes getClasses() {
			return null;
		}
	}

	private static class Unpacked extends Code {
		private URL url;
		private Source source;
		private Source classes;

		Unpacked(URL url) {
			this.url = url;
			this.source = Source.create(url);
			this.classes = new SourceDirectoryClassesSource(source);
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
			private Source classes = new SourceDirectoryClassesSource(source);

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