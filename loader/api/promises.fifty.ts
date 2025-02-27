//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.definition.test.promises {
	export namespace internal {
		export type Events = slime.$api.Events<{
			created: Promise<any>
			settled: Promise<any>
		}>
	}

	export interface Registry {
		wait: () => Promise<any>

		test: {
			list: () => Promise<any>[]
			clear: () => void
			setName: (name: string) => void
		}
	}

	export type Script = slime.loader.Script<void,Export>

	/**
	 * An object that provides a `Promise` that can be controlled by calls to its `resolve` and `reject` methods, so that tests can
	 * reliably and synchronously set it to a given state. On creation, its `Promise` is pending, until and unless the `resolve`
	 * or `reject` methods are called.
	 */
	export interface Puppet<T> {
		promise: Promise<T>
		resolve: (value: T) => void
		reject: (value: Error) => void
	}

	export interface Export {
		Registry: (p?: { name: string }) => Registry
		Promise: PromiseConstructor
		console: slime.external.lib.dom.Console
		controlled: <T>(p?: { id: string }) => Puppet<T>
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			var subject: Export = fifty.promises;

			fifty.tests.controlled = function() {
				var controlled = subject.controlled();
				var listen = controlled.promise.then(
					function(value: number) {
						fifty.verify(value).is(222);
					}
				)
				controlled.resolve(222);
			}

			fifty.tests.rejection = function() {
				fifty.verify("before").is("before");
				Promise.reject(new Error("REJECTED!"));
				fifty.verify("after").is("after");
			}

			fifty.tests.sequence = function() {
				var value = 0;
				var controlled: Puppet<number> = subject.controlled();
				controlled.promise.then(function(v) {
					value = v;
				});
				fifty.run(function() {
					fifty.verify(value).is(0);
				});
				fifty.run(function() {
					controlled.resolve(1);
				});
				fifty.run(function() {
					fifty.verify(value).is(1);
				})
			}

			fifty.tests.suite = function() {
				var registry = subject.Registry();
				fifty.verify(registry).test.list().length.is(0);

				var a = Promise.resolve(3);
				var b = Promise.resolve(4);
				var c = Promise.reject(new Error("5"));

				fifty.verify(registry).test.list().length.is(3);

				registry.test.clear();
				fifty.verify(registry).test.list().length.is(0);
			}
		}
	//@ts-ignore
	)(fifty);

}
