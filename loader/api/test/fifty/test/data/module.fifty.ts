namespace slime.fifty.test.data.shopping {
	/**
	 * Something on the shopping list.
	 */
	interface Item {
		/**
		 * The name of the thing on the shopping list.
		 */
		name: string
	}

	/**
	 * A compendium of wanted items.
	 */
	export interface Database {
		items: Item[],
		add: (p: { item: Item }) => void
	}

	export interface Exports {
		Database: new () => Database
	}

	(
		function(
			verify: slime.fifty.test.verify,
			tests: slime.fifty.test.tests,
			$loader: slime.fifty.test.$loader
		) {
			tests.types.Database = function(database: Database) {
				var before = database.items.length;
				database.add({ item: { name: "foo" }});
				verify(database).items.length.is(before + 1);
				verify(database).items[0].name.is("foo");
			}

			tests.types.Exports = function(exports: Exports) {
				var db = new exports.Database();
				tests.types.Database(db);
			}

			tests.suite = function() {
				var module: Exports = $loader.module("module.js");
				tests.types.Exports(module);
			}
		}
	//@ts-ignore
	)(verify, tests, $loader)
}