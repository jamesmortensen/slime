//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

namespace slime.fifty.test.internal {
	export type run = slime.fifty.test.internal.test.Export
}

namespace slime.fifty.test.internal.test {
	export interface Context {
		promises: slime.definition.test.promises.Export
		library: {
			Verify: slime.definition.verify.Export
		}
		console: slime.fifty.test.internal.Console
	}

	export type Export = (loader: slime.fifty.test.$loader, path: string, part?: string) => boolean

	export type Factory = slime.loader.Product<Context,Export>
}