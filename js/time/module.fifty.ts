//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.time {
	export namespace old {
		export interface Day {
			year: {
				value: number
			}
			at: Function
			format(mask: string): string
			month: Month
			day: number
			add(n: number): Day
			addMonths(n: number): Day
			addYears(n: number): Day
			isAfter(day: Day): boolean

			/** @experimental Has other undocumented properties */
			weekday: {
				/**
				 * The full name of the weekday; e.g., `"MONDAY"`, `"WEDNESDAY"`.
				 */
				name: string
			}
		}

		export interface Month {
			id: {
				index: number
			}
			day: (n: number) => Day
		}

		export namespace day {
			export interface Time {
			}
		}

		export interface Time {
			day: any
			format(mask: string): string
		}

		export interface When {
			unix: number
			local(): Time
			local(zone: any): Time
		}
	}

	export interface Context {
		zones: object
		old: {
			Day_month: boolean
		}
		java: object
	}

	export interface Exports {
		Year: Function
		Month: Function
		Day: {
			new (year: number, month: number, day: number): old.Day
			new (p: any): old.Day
			Time: new (hours: number, minutes: number) => old.day.Time
			subtract: Function
			order: Function
			today: () => old.Day
			codec: {
				iso8601: {
					extended: slime.Codec<old.Day,string>
				}
				json: any
				js: any
			}
			rehydrate: (p: any) => old.Day
		}
		Time: {
			new (): old.Time
			Zone: object
		}
		When: {
			new (p: { date: Date }): old.When
			new (p: { unix: number }): old.When
			new (date: Date): old.When
			new (): old.When
			codec: {
				rfc3339: slime.Codec<old.When,string>
				Date: slime.Codec<old.When,Date>
				js: any
			}
			order: Function
			now: () => old.When
		}
		java: object
		install: Function
	}

	(
		function(
			fifty: slime.fifty.test.kit,
			$loader: slime.fifty.test.$loader,
			verify: slime.fifty.test.verify,
			tests: slime.fifty.test.tests
		) {
			tests.suite = function() {
				var global = (function() { return this; })();
				var subject: slime.time.Exports = (global.jsh) ? $loader.module("module.js", $loader.file("context.java.js")) : $loader.module("module.js");
				//var subject: slime.time.Exports = $loader.module("module.js");

				var when = new subject.When({ unix: 1599143670821 });

				(function(when) {
					var rfc3339 = subject.When.codec.rfc3339.encode(when);
					var decoded = subject.When.codec.rfc3339.decode(rfc3339);
					verify(when).unix.is(decoded.unix);
				})(when);

				//	Got 1599187454916 from 2020-09-04T02:44:14.917Z
				var sample = "2020-09-04T02:44:14.917Z";
				var desired = 1599187454917;
				var decoded = subject.When.codec.rfc3339.decode(sample);
				verify(decoded).unix.is(desired);

				//	Got 1599188612109 from 2020-09-04T03:03:32.110Z
				var sample = "2020-09-04T03:03:32.110Z";
				var desired = 1599188612110;
				var decoded = subject.When.codec.rfc3339.decode(sample);
				verify(decoded).unix.is(desired);

				var sample = "2020-09-04T03:17:44.858Z";
				var desired = 1599189464858;
				var decoded = subject.When.codec.rfc3339.decode(sample);
				verify(decoded).unix.is(desired);

				var base = new subject.Day(2021,1,1).at(new subject.Day.Time(11,59)).local();
				var rounding = new subject.When({ unix: base.unix + 59750 });
				var formatted = rounding.local().format("yyyy-mm-dd HR:mi:sc");
				verify(formatted).is("2021-01-01 11:59:59");
			}
		}
	//@ts-ignore
	)(fifty,$loader,verify,tests)
}
