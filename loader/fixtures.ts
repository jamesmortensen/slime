//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

(
	function($exports) {
		$exports.subject = function(fifty: slime.fifty.test.kit) {
			var code = fifty.$loader.get("expression.js");
			var js = code.read(String);

			var subject: slime.runtime.Exports = (function() {
				var scope = {
					$slime: {
						getRuntimeScript: function(path) {
							var resource = fifty.$loader.get(path);
							return { name: resource.name, js: resource.read(String) }
						}
					},
					$engine: void(0)
				}
				return eval(js);
			})();

			return subject;
		}
	}
//@ts-ignore
)($exports);