namespace slime.servlet {
	interface Parameters {
		[x: string]: any
	}

	interface httpd {
		loader: slime.Loader
		js: any
		java: any
		io: any
		web: slime.web.Exports
		$java: any
		$reload?: () => void
	}

	type handler = (request: Request) => Response

	interface Script {
		handle: handler
		destroy?: () => void
	}

	interface Scope {
		httpd: httpd
		$loader: slime.Loader
		$parameters: Parameters
		$exports: Script
	}

	namespace internal {
		namespace $host {
			interface Java {
				getClasspath?: slime.jrunscript.native.inonit.script.engine.Loader.Classes.Interface
				register: (_script: slime.jrunscript.native.inonit.script.servlet.Servlet.Script) => void
				getLoader?: slime.jrunscript.native.inonit.script.Engine.Loader
				getServlet?: slime.jrunscript.native.inonit.script.servlet.Servlet
			}

			interface Rhino extends Java {
				getEngine?: slime.jrunscript.native.inonit.script.rhino.Engine
			}

			interface jsh {
				api?: any
				loaders?: any
				Loader: any
				parameters?: { [x: string]: any }
				getCode?: any
				$java?: any
				script?: any
				server?: any
			}
		}

		type $host = $host.Java | $host.jsh

		namespace server {
			interface Exports {
				Servlet: new (script: slime.servlet.Scope["$exports"]) => {
					reload: (script: slime.servlet.Scope["$exports"]) => void
					service: (_request: any, _response: any) => void
					destroy: () => void
				}
			}
		}
	}
}