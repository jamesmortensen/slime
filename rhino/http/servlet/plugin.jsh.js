//	Requires the following plugins in the following order
//	Order is not important if they are in JSH_SCRIPT_CLASSPATH
//
//	$TOMCAT_HOME/bin/tomcat-juli.jar
//	$TOMCAT_HOME/lib/servlet-api.jar
//	$TOMCAT_HOME/lib/tomcat-util.jar
//	$TOMCAT_HOME/lib/tomcat-api.jar
//	$TOMCAT_HOME/lib/tomcat-coyote.jar
//	$TOMCAT_HOME/lib/catalina.jar

plugin({
	isReady: function() {
		return typeof(Packages.org.apache.catalina.startup.Tomcat) == "function";
	},
	load: function() {
		if (!jsh.httpd) {
			jsh.httpd = {};
		}
		jsh.httpd.Tomcat = function(p) {
			var tomcat = new Packages.org.apache.catalina.startup.Tomcat();
			
			var base = (p.base) ? p.base : jsh.shell.TMPDIR.createTemporary({ directory: true, prefix: "tomcat" });

			var port = (p.port) ? p.port : (function() {
				var address = new Packages.java.net.ServerSocket(0);
				var rv = address.getLocalPort();
				address.close();
				return rv;
			})();
			
			this.port = port;

			tomcat.setBaseDir(base);
			tomcat.setPort(port);
			
			
			var server = $loader.file("server.js");
			
			
			this.map = function(m) {
				if (m.path && m.servlets) {
					var context = tomcat.addContext(m.path, base.pathname.java.adapt().getCanonicalPath());
					var id = 0;
					for (var pattern in m.servlets) {
						var servletFile = m.servlets[pattern];
						var servletName = "slime" + String(id++);
						Packages.org.apache.catalina.startup.Tomcat.addServlet(context,servletName,new JavaAdapter(
							Packages.javax.servlet.http.HttpServlet,
							new function() {
								//	TODO	could use jsh.io here
								var servlet;

								this.init = function() {
									var apiScope = {
										$host: new function() {									
											this.loaders = {
												script: new jsh.script.Loader(servletFile.parent)
											};

											this.code = servletFile.pathname;

											this.$exports = {};
										},
										$context: server
									};
									//	TODO	use $host and $loader.run, but that is not currently implemented; when it is, switch this
									//			if (false) and delete the $context/$host rigamarole at the top of api.js
									$loader.run("api.js", apiScope);
									servlet = apiScope.$host.$exports.servlet;
								};

								this.service = function(_request,_response) {
									servlet.service(_request,_response);
								}

								this.destroy = function() {
									servlet.destroy();
								}
							}
						));
						context.addServletMapping(pattern,servletName);					
					}
				}
			}
			
			this.start = function() {
				tomcat.start();
			}
		}
	}
});
