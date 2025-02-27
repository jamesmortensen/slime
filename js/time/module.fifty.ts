//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.time {
	export namespace zone {
		export interface Time {
			year: number
			month: number
			day: number
			hour: number
			minute: number

			/**
			 * May be a decimal number including fractional seconds.
			 */
			second: number
		}
	}

	export interface Zone {
		/**
		 * Given a UNIX time, in milliseconds, returns the corresponding time in this time zone.
		 */
		local: (unixMilliseconds: number) => zone.Time

		/**
		 * Returns the UNIX time, in milliseconds, for the given time in this time zone.
		 */
		unix: (time: zone.Time) => number
	}

	export namespace context {
		/**
		 * Configuration of the Java context for this module. Allows the Calendar and TimeZone Java classes to be replaced, in
		 * scenarios where they are inaccessible but do not work. Unlikely to be needed; older versions of Google App Engine for
		 * Java restricted reflective access to these classes.
		 */
		export interface Java {
			Calendar?: slime.jrunscript.Packages["java"]["util"]["Calendar"]
			TimeZone?: slime.jrunscript.Packages["java"]["util"]["TimeZone"]
		}
	}

	export interface Context {
		/**
		 * A function that returns the number of milliseconds since the UNIX epoch. If not supplied, the standard JavaScript
		 * implementation will be used.
		 */
		now?: slime.$api.fp.impure.Input<number>

		zones?: {
			[id: string]: Zone
		}

		java?: context.Java
	}

	export interface Exports {
		java?: context.Java
	}

	export namespace test {
		export const { subject, load } = (function(fifty: slime.fifty.test.Kit) {
			var script: Script = fifty.$loader.script("module.js");
			var jcontext: slime.loader.Script<context.Java,Context> = fifty.$loader.script("context.java.js");
			return {
				subject: (fifty.global.jsh) ? script(jcontext()) : script(),
				load: function(context: Context) {
					return script(context);
				}
			};
		//@ts-ignore
		})(fifty);
	}

	export interface Date {
		year: number
		month: number
		day: number
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			fifty.tests.Date = fifty.test.Parent();
		}
	//@ts-ignore
	)(fifty);

	export namespace exports {
		export interface Dates {
			input: {
				today: slime.$api.fp.impure.Input<slime.time.Date>
			}
		}
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;
			const { $api } = fifty.global;

			fifty.tests.Date.today = function() {
				var subject = test.load({
					now: $api.fp.returning(1643907600000)
				});
				var today = subject.Date.input.today();
				verify(today, "today", function(it) {
					it.year.is(2022);
					it.month.is(2);
					it.day.is(3);
				})
			}
		}
	//@ts-ignore
	)(fifty);

	export namespace exports {
		export interface Dates {
			format: (mask: string) => (day: slime.time.Date) => string
		}

		(
			function(
				fifty: slime.fifty.test.Kit
			) {
				const verify = fifty.verify;

				fifty.tests.Date.format = function() {
					var mar1: slime.time.Date = {
						year: 2009,
						month: 3,
						day: 1
					};

					var format = function(mask) {
						return test.subject.Date.format(mask)(mar1);
					}

					verify(format("yyyy mm dd")).is("2009 03 01");
					verify(format("yyyy/?m/?d")).is("2009/3/1");
					verify(format("Mmmm ?d, yyyy")).is("March 1, 2009");
					verify(format("Www Mmmm ?d, yyyy")).is("Sun March 1, 2009");
					verify(format("WWWWWW Mmmm ?d, yyyy")).is("SUNDAY March 1, 2009");
					verify(format("Wwwww Mmmm ?d, yyyy")).is("Sun March 1, 2009");
					verify(format("Wwwww Mmmm dd, yyyy")).is("Sun March 01, 2009");
				}
			}
		//@ts-ignore
		)(fifty);
	}

	export interface Exports {
		Date: exports.Dates
	}

	export interface Exports {
		Timezone: {
			local: Zone
			UTC: Zone
			[x: string]: Zone
		}
	}

	(
		function(
			fifty: slime.fifty.test.Kit
		) {
			const { verify } = fifty;

			fifty.tests.suite = function() {
				fifty.run(fifty.tests.Date);

				fifty.run(function zones() {
					verify(test.subject).Timezone.local.is.type("object");
					verify(test.subject).Timezone.UTC.is.type("object");
				})

				fifty.load("old.fifty.ts");
			}

			if (fifty.global.jsh) fifty.tests.platforms = fifty.jsh.platforms(fifty);
		}
	//@ts-ignore
	)(fifty);

	export type Script = slime.loader.Script<Context,Exports>
}
