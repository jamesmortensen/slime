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
import java.util.*;
import java.net.*;
import java.util.logging.*;

public abstract class Loader {
	private static final Logger LOG = Logger.getLogger(Loader.class.getName());

	public abstract String getCoffeeScript() throws IOException;
	public abstract String getLoaderCode(String path) throws IOException;

	public static abstract class Classes {
		public static abstract class Configuration {
			public abstract boolean canCreateClassLoaders();
			public abstract ClassLoader getApplicationClassLoader();
			public abstract File getLocalClassCache();
		}
		
		private static HashMap<ClassLoader,Code.Source> cache = new HashMap<ClassLoader,Code.Source>();
		
		private static Code.Source adapt(ClassLoader parent) {
			if (parent instanceof URLClassLoader) {
				List<URL> urls = Arrays.asList(((URLClassLoader)parent).getURLs());
				List<Code.Source> sources = new ArrayList<Code.Source>();
				for (URL url : urls) {
					if (url.getProtocol().equals("file")) {
						try {
							File file = new File(url.toURI());
							if (file.getName().endsWith(".jar")) {
								sources.add(Code.Source.zip(file));
							} else {
								sources.add(Code.Source.create(file));
							}
						} catch (java.net.URISyntaxException e) {
							throw new RuntimeException(e);
						}
					} else {
						sources.add(Code.Source.create(url));
					}
				}
				return Code.Source.create(sources);
			} else {
				return null;
			}
		}

		public static abstract class Interface {
			public abstract void append(Code.Source code);

			abstract Code.Source dependencies();
			abstract ClassLoader classLoader();
			
			/**
				Returns class with the given name, or <code>null</code> if there is no such class.
			*/
			public final Class getClass(String name) {
				try {
					return classLoader().loadClass(name);
				} catch (ClassNotFoundException e) {
					return null;
				}
			}


			public final void append(Code code) {
				append(code.getClasses());
			}
			
			private Code.Source parent;
			
			final Code.Source parent() {
				if (parent == null) {
					parent = adapt(classLoader().getParent());
				}
				return parent;
			}
			
			public final Code unpacked(File base) {
				return Code.loadUnpacked(base, this);
			}
			
			public final Code unpacked(URL base) {
				return Code.loadUnpacked(base, this);
			}
			
			public static final Interface NULL = new Interface() {
				@Override
				public void append(Code.Source code) {
					throw new UnsupportedOperationException("Not supported yet."); //To change body of generated methods, choose Tools | Templates.
				}

				@Override
				Code.Source dependencies() {
					return Code.Source.NULL;
				}
				
				ClassLoader classLoader() {
					return null;
				}
			};
		}

		public abstract ClassLoader getApplicationClassLoader();
		public abstract Interface getInterface();

		public static Classes create(final Configuration configuration) {
			if (configuration.canCreateClassLoaders()) {
				final ClassLoaderImpl loaderClasses = ClassLoaderImpl.create(configuration.getApplicationClassLoader());
				return new Classes() {
					@Override public ClassLoader getApplicationClassLoader() {
						return loaderClasses;
					}

					@Override public Interface getInterface() {
						return loaderClasses.toInterface();
					}
				};
			} else {
				final ClassLoader loader = configuration.getApplicationClassLoader();
				return new Classes() {
					@Override public ClassLoader getApplicationClassLoader() {
						return loader;
					}

					@Override public Interface getInterface() {
						return null;
					}
				};
			}
		}

		private static class ClassLoaderImpl extends ClassLoader {
			static ClassLoaderImpl create(ClassLoader delegate) {
				LOG.log(Level.FINE, "Creating Loader.Classes: parent=%s", delegate);
				return new ClassLoaderImpl(delegate);
			}

			private inonit.script.runtime.io.Streams streams = new inonit.script.runtime.io.Streams();
			private ArrayList<Code.Source> locations = new ArrayList<Code.Source>();

			private ClassLoaderImpl(ClassLoader delegate) {
				super(delegate);
			}

			public String toString() {
				String rv = getClass().getName() + ": delegate=" + this.getParent() + " locations=[";
				synchronized(locations) {
					for (int i=0; i<locations.size(); i++) {
						rv += locations.get(i);
						if (i+1 != locations.size()) {
							rv += ",";
						}
					}
				}
				rv += "]";
				return rv;
			}

			protected Class findClass(String name) throws ClassNotFoundException {
				String path = name.replace('.', '/') + ".class";
				String[] tokens = name.split("\\.");
				String packageName = tokens[0];
				for (int i=1; i<tokens.length-1; i++) {
					packageName += "." + tokens[i];
				}
				synchronized(locations) {
					for (Code.Source source : locations) {
						try {
							Code.Source.File in = source.getFile(path);
							if (in != null) {
								if (getPackage(packageName) == null) {
									definePackage(packageName,null,null,null,null,null,null,null);
								}
								byte[] b = streams.readBytes(in.getInputStream());
								return defineClass(name, b, 0, b.length);
							}
						} catch (IOException e) {
							//	do nothing
						}
					}
				}
				throw new ClassNotFoundException(name);
			}

			protected URL findResource(String name) {
				synchronized(locations) {
					for (Code.Source source : locations) {
						Code.Classes classes = source.getClasses();
						if (classes != null) {
							URL url = classes.getResource(name);
							if (url != null) {
								return url;
							}
						}
					}
				}
				return null;
			}

			protected Enumeration<URL> findResources(String name) {
				java.util.Vector<URL> rv = new java.util.Vector<URL>();
				synchronized(locations) {
					for (Code.Source source : locations) {
						Code.Classes classes = source.getClasses();
						if (classes != null) {
							URL url = classes.getResource(name);
							if (url != null) {
								rv.add(url);
							}
						}
					}
				}
				return rv.elements();
			}
			
			private Classes.Interface api = new Classes.Interface() {
				private Code.Source dependencies = Code.Source.create(locations);
				
				@Override public String toString() {
					return "Loader.Classes.Interface for: " + ClassLoaderImpl.this.toString();
				}

				@Override public void append(Code.Source code) {
					synchronized(locations) {
						locations.add(code);
					}
				}

				Code.Source dependencies() {
					return dependencies;
				}
				
				ClassLoader classLoader() {
					return ClassLoaderImpl.this;
				}
			};

			Classes.Interface toInterface() {
				return api;
			}
		}
	}
}