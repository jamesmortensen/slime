namespace Packages {
	export namespace inonit {
		export interface system {
			OperatingSystem: any
			Command: {
				Configuration: any
				Context: any
			}
			Subprocess: {
				Listener: any
			}
		}
	}

	export namespace inonit.system {
		export namespace test {
			export interface Fixtures {
				OperatingSystem: {
					Environment: {
						create: (p: { values: object, caseSensitive: boolean }) => Packages.inonit.system.OperatingSystem.Environment
					}
				}
			}
		}

		export namespace OperatingSystem {
			export interface Environment {
				isNameCaseSensitive(): {
					booleanValue(): boolean
				}
				getMap(): Packages.java.util.Map
				getValue(name: string): string
			}
		}
	}
}

(
	function(
		Packages: any,
		JavaAdapter: any,
		fifty: slime.fifty.test.kit
	) {
		const fixtures: Packages.inonit.system.test.Fixtures = fifty.$loader.file("system.fixtures.ts");

		fifty.tests.suite = function() {
			var CaseSensitive = function(values) {
				var map = jsh.java.Map({ object: values });
				return {
					getMap: function() {
						return map;
					},
					getValue: function(name) {
						return (values[name]) ? values.name : null;
					}
				}
			};

			var CaseInsensitive = function(values) {
				var map = jsh.java.Map({ object: values });
				return {
					getMap: function() {
						return map;
					},
					getValue: function(name) {
						for (var x in values) {
							if (x.toUpperCase() == name.toUpperCase()) return values[x];
						}
						return null;
					}
				}
			};

			var detectedAsCaseSensitive = function(environment): { booleanValue(): boolean } {
				return jsh.java.invoke({
					method: {
						class: Packages.inonit.system.OperatingSystem.Environment,
						name: "detectedAsCaseSensitive",
						parameterTypes: [ Packages.inonit.system.OperatingSystem.Environment ]
					},
					arguments: [
						new JavaAdapter(
							Packages.inonit.system.OperatingSystem.Environment,
							environment
						)
					]
				});
			};

			fifty.verify(detectedAsCaseSensitive(CaseSensitive({ foo: "bar" }))).booleanValue().is(true);
			fifty.verify(detectedAsCaseSensitive(CaseSensitive({ foo: "bar", FOO: "BAR" }))).is(null);
			fifty.verify(detectedAsCaseSensitive(CaseInsensitive({ foo: "bar" }))).booleanValue().is(false);
			fifty.verify(detectedAsCaseSensitive(CaseSensitive({ FOO: "BAR" }))).is(null);

			var toJsString = function(v) {
				return (v === null) ? null : String(v);
			}

			var caseSensitive = fixtures.OperatingSystem.Environment.create({
				values: { foo: "bar" },
				caseSensitive: true
			});

			fifty.verify( toJsString(caseSensitive.getValue("foo")) ).is("bar");
			fifty.verify( toJsString(caseSensitive.getValue("FOO")) ).is(null);

			var caseInsensitive = fixtures.OperatingSystem.Environment.create({
				values: { foo: "bar" },
				caseSensitive: false
			});

			fifty.verify( toJsString(caseInsensitive.getValue("foo")) ).is("bar");
			fifty.verify( toJsString(caseInsensitive.getValue("FOO")) ).is("bar");
		}
	}
//@ts-ignore
)(Packages,JavaAdapter,fifty);