(
	function(
		fifty: slime.fifty.test.kit
	) {

	}
//@ts-ignore
)(fifty);

namespace slime.definition.unit {
	export interface Context {
		log: (message: string, p: any) => void,
		api: {
			Promise: () => PromiseConstructorLike & { all: Function, resolve: Function }
		}
	}

	export interface Exports {
		Verify: (scope: any, vars?: any) => slime.definition.verify.Verify
		Suite: new (o: any) => { listeners: { add: (type: string, handler: Function) => void }, run: () => boolean, promise: () => void }
		View: {
			(o: View.Handler): View
			(f: View.Listener): View
		}
		getStructure: Function
		Scenario: new () => {}

		//	TODO	probably should not use "internal" type if it is exported. Reorganize.
		TestExecutionProcessor: slime.definition.unit.internal.EventsScope

		JSON: {
			Encoder: (o: {
				send: (json: string) => void
			}) => View

			Decoder: () => {
				/**
				 * A property that allows listeners to be added to / removed from the underlying event emitter.
				 */
				listeners: $api.Events["listeners"]

				/**
				 * Fires the decoded event to this decoder's listeners.
				 */
				decode: (json: string) => void
			}
		}
	}

	export type Factory = slime.Loader.Product<Context,Exports>
}

namespace slime.definition.unit.internal {
	export const { subject, types } = (function(fifty: slime.fifty.test.kit) {
		const code = fifty.$loader.factory("unit.js") as slime.definition.unit.Factory;

		const verify = fifty.verify;

		const subject = code();

		return {
			subject: subject,
			types: {
				definition: function types_definition() {
					//	TODO	add test for error being thrown

					var a = {};
					var suite = new subject.Suite({
						parts: {
							a: {
								initialize: function(scope) {
									scope.a = a;
								},
								execute: function(scope,verify) {
									verify(scope.a).is(a);
								}
							}
						}
					});
					var rv = suite.run() as boolean;
					verify(rv,"success").is(true);

					//	TODO	add tests for suite
				}
			}
		}
	//@ts-ignore
	})(fifty);

	export type EventsScope = (o: { events: $api.Events }) => slime.definition.unit.Scope
}

namespace slime.definition.unit {
	(
		function(
			fifty: slime.fifty.test.kit
		) {
			fifty.tests.suite = function() {
				run(internal.types.definition);
			}
		}
	//@ts-ignore
	)(fifty);
}

namespace slime.definition.unit {
	type Verify = slime.definition.verify.Verify & {
		test: Function
		suite: Function
		scope: Function
		scenario: Function
		fire: Function
	}

	export type Test = {
		(): Test.Result
	}

	export namespace Test {
		export interface Result {
			success: boolean
			error?: any
			message: string
		}
	}

	export interface Scope {
		test(assertion: Test)
		error: any
		verify: any
		success: boolean
		fire: any
		checkForFailure: any
	}

	export namespace Event {
		export namespace Scenario {
			export type Start = {
				start: any
			}

			type End = {
				end: any
				success: boolean
			}

			export type Detail = Start | End
		}

		export namespace Test {
			export type Detail = {
				success: boolean
				message: string
				error: any
			}
		}

		export type Handler = $api.Events.Handler<{
			scenario: Event.Scenario.Detail
			test: Event.Test.Detail
		}>
	}

	export interface View {
		listen: (scenario: $api.Events) => void
		on: Event.Handler
	}

	export namespace View {
		export type Error = {
			type: string
			message: string
			stack: string
		}

		export type Handler = {
			start: (scenario: {
				name: string
			}) => void

			test: (result: Test.Result) => void

			end: (
				scenario: {
					name: string
				},
				success: boolean
			) => void
		}

		export type Listener = $api.Event.Handler<any>

		export type Argument = Handler | Listener
	}

}