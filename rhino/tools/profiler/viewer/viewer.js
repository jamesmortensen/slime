//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	The Original Code is the SLIME JDK interface.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2010 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

//	TODO	requires relatively advanced JavaScript implementation for Array.prototype.forEach
var div = function(className,parent) {
	var rv = document.createElement("div");
	rv.className = className;
	parent.appendChild(rv);
	return rv;
}

var render = function(profiles,settings) {
	if (!settings) {
		settings = {
			threshold: 0
		}
	};
	document.getElementById("data").innerHTML = "";

	var top = document.createElement("div");
	document.getElementById("data").appendChild(top);

	profiles.forEach(function(profile) {
		var div_profile = document.createElement("div");
		div_profile.className = "profile";
		top.appendChild(div_profile);

		var div_thread = document.createElement("h1");
		div_thread.className = "thread";
		div_profile.appendChild(div_thread);
		div_thread.innerHTML = profile.thread.name;

		var div_tree = div("tree", div_profile);
		var heading = document.createElement("h2");
		heading.innerHTML = "Tree";
		div_tree.appendChild(heading);
		div_profile.appendChild(div_tree);
		
		var nodeName = function(node) {
			if (node.code.className && node.code.methodName) {
				return node.code.className + " " + node.code.methodName + " " + node.code.signature;
			} else if (node.code.sourceName && node.code.lineNumbers) {
				return node.code.sourceName + " [" + node.code.lineNumbers[0] + "-" + node.code.lineNumbers[node.code.lineNumbers.length-1] + "]";
			} else {
				return "(top)";
			}
		}

		var renderNode = function(node) {
			var top = document.createElement("div");
			top.className = "node";
			var total = div("total", top);
			var name = nodeName(node);
			total.innerHTML = (node.statistics.elapsed/1000).toFixed(3) + " " + node.statistics.count + " " + name.replace(/\</g, "&lt;");
			node.children.filter(function(child) {
				var children = 0;
				child.children.forEach(function(gc) {
					children += gc.statistics.elapsed;
				});
				if (children >= settings.threshold) return true;
				return child.statistics.elapsed >= settings.threshold;
			}).sort(function(a,b) {
				return b.statistics.elapsed - a.statistics.elapsed;
			}).forEach(function(child) {
				top.appendChild(renderNode(child));
			});
			return top;
		}

		div_tree.appendChild(renderNode(profile.timing.root));
		
		var div_hotspots = div("hotspots", div_profile);
		var heading = document.createElement("h2");
		heading.innerHTML = "Hot Spots";
		div_hotspots.appendChild(heading);
		
		var map = {};
		
		var addToHotspots = function(node) {
			var key = nodeName(node);
			if (!map[key]) {
				map[key] = {
					count: 0,
					elapsed: 0
				};
			}
			map[key].count += node.statistics.count;
			map[key].elapsed += node.statistics.elapsed;
			node.children.forEach(function(child) {
				addToHotspots(child);
			});
		};
		
		addToHotspots(profile.timing.root);
		
		var list = [];
		for (var x in map) {
			list.push({ key: x, count: map[x].count, elapsed: map[x].elapsed });
		}
		list.sort(function(a,b) {
			return b.elapsed - a.elapsed;
		});
		list.forEach(function(item) {
			if ( item.elapsed > settings.threshold ) {
				var hotspotdiv = div("hotspot", div_hotspots);
				hotspotdiv.innerHTML = (item.elapsed / 1000).toFixed(3) + " " + item.count + " " + item.key.replace(/\</g, "&lt;");
			}
		})
	});
}

window.addEventListener("load", function() {
	render(profiles);
	document.getElementById("refresh").addEventListener("click", function() {
		var settings = {
			threshold: Number(document.getElementById("threshold").value) * 1000
		};
		render(profiles,settings);
	});
});
