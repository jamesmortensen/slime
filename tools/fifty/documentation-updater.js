//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

//@ts-check
(
	/**
	 *
	 * @param { slime.$api.Global } $api
	 * @param { slime.tools.documentation.updater.Context } $context
	 * @param { slime.loader.Export<slime.tools.documentation.updater.Exports> } $export
	 */
	function($api,$context,$export) {
		/** @type { slime.tools.documentation.updater.internal.Update } */
		var Update = function(p) {
			return function(events) {
				var tmp = $api.fp.world.now.ask($context.library.file.world.filesystems.os.temporary({
					directory: true
				}));

				var invocation = $context.typedoc.invocation({
					project: { base: p.project.pathname },
					stdio: {
						output: "string",
						error: "string"
					},
					out: tmp.pathname
				});

				/** @type { number } */
				var started;
				/** @type { () => void } */
				var kill;

				var rv = {
					out: function() {
						return tmp.pathname;
					},
					started: function() {
						return started;
					},
					kill: function() {
						if (!kill) throw new Error("Unreachable.");
						kill();
					}
				};

				$context.library.java.Thread.start(function() {
					$api.fp.world.now.action(
						$context.library.shell.world.action,
						invocation,
						{
							start: function(e) {
								started = new Date().getTime();
								kill = e.detail.kill;
								events.fire("started", rv);
							},
							exit: function(e) {
								if (e.detail.status == 0) {
									events.fire("finished", rv);
								} else {
									events.fire("errored", rv);
								}
							}
						}
					);
				});

				return rv;
			}
		}

		var existsDirectory = $api.fp.world.mapping(
			$context.library.file.world.Location.directory.exists()
		);

		/** @type { slime.tools.documentation.updater.Exports["Updater"] } */
		var Updater = function(settings) {
			var updates = {};

			var lock = $context.library.java.Thread.Lock();

			var project = $context.library.file.world.Location.from.os(settings.project);

			var documentation = $api.fp.now.invoke(
				project,
				$context.library.file.world.Location.relative("local/doc/typedoc")
			);

			var directoryExists = $api.fp.world.mapping(
				$context.library.file.world.Location.directory.exists()
			);

			var removeDirectory = $api.fp.world.output(
				$context.library.file.world.Location.directory.remove()
			);

			var moveTypedocIntoPlace = $api.fp.world.output(
				$context.library.file.world.Location.directory.move({
					to: documentation
				})
			)

			/** @type { slime.$api.events.Handler<slime.tools.documentation.updater.internal.Listener> } */
			var listener = {
				started: function(e) {
					lock.wait({
						then: function() {
							updates[e.detail.out()] = e.detail;
						}
					})();
				},
				finished: function(e) {
					lock.wait({
						then: function() {
							if (directoryExists(documentation)) {
								removeDirectory(documentation)
							}
							moveTypedocIntoPlace($context.library.file.world.Location.from.os(e.detail.out()));
							updates[e.detail.out()] = null;
						}
					})();
				},
				errored: function(e) {
					lock.wait({
						then: function() {
							updates[e.detail.out()] = null;
						}
					})();
				}
			}

			if (!existsDirectory(documentation)) {
				$api.fp.world.now.action(
					Update,
					{ project: project },
					listener
				);
			}

			return {};
		}
	}
//@ts-ignore
)($api,$context,$export);
