//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//
//	The Original Code is the SLIME loader infrastructure.
//
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2016 the Initial Developer. All Rights Reserved.
//
//	Contributor(s):
//	END LICENSE

$set(function() {
    var $loader = new inonit.loader.Loader(inonit.loader.base + "../");
    var api = $loader.file("loader/api/unit.js");
    var unit = $loader.module("loader/browser/test/module.js", {
        api: {
            unit: api
        }
    });
    var ui = {
        document: (function() {
            var resource = $loader.get("loader/api/ui/ui.html");
            var doc = document.implementation.createHTMLDocument("");
            doc.documentElement.innerHTML = resource.string;
            return doc;
        })()
    };

    var suite = document.createElement("div");
    suite.setAttribute("id", "ui");
    var from = ui.document.body;
    var nodes = from.childNodes;
    //	Remove the #sourceURL thing
    //	TODO	remove the need for this
    from.removeChild(nodes[nodes.length-1]);
    for (var i=0; i<nodes.length; i++) {
        suite.appendChild(nodes[i].cloneNode(true));
    }
    document.body.insertBefore(suite, document.body.childNodes[0]);

    var styles = document.createElement("link");
    styles.setAttribute("rel", "stylesheet");
    styles.setAttribute("type", "text/css");
    styles.setAttribute("href", inonit.loader.base + "../" + "loader/api/ui/ui.css");
    document.head.insertBefore(styles, null);

    $loader.run("loader/api/ui/webview.js", {}, {
        section: new function() {
            var onclick;

            this.initialize = function(initializer,handler) {
                document.getElementById("run").addEventListener("click", function(e) {
                    if (!onclick) {
                        initializer({ onclick: function(f) {
                            onclick = f;
                        }});
                    }
                    onclick(e);
                });
            };
        },
        suite: new function() {
            var view;

            this.getStructure = function() {
                return unit.structure();
            };

            this.listen = function() {
                view = arguments[0];
            };


            this.run = function() {
                unit.run(new function() {
                    this.log = function(b,message) {
                        console.log(b,message);
                    };

                    this.event = function(e) {
                        console.log(e);
                        view.dispatch(e.path,e);
                        if (!e.path.length && e.detail.end) {
                            var xhr = new XMLHttpRequest();
                            xhr.open("POST","result",false);
                            xhr.send(e.detail.success);
                        }
                    };

                    this.end = function(b) {
                    }
                })
            };
        }
    });

    return {
        api: api,
        unit: unit,
        suite: function(v) {
            unit.suite(v);

            if (window.location.search && window.location.search.indexOf("unit.run") != -1) {
                var event = new Event("click");
                document.getElementById("run").dispatchEvent(event);
            }
        }
    };
});

//     var scenario = new unit.Scenario();
//     scenario.test(new function() {
//         this.check = function(verify) {
//             if (window.location.search && window.location.search.indexOf("success") != -1) {
//                 verify(1).is(1);
//             } else {
//                 verify(1).is(2);
//             }
//         }
//     });

//     var suite = new api.Suite({
//         name: "Suite",
//         parts: {
//             scenario: scenario
//         }
//     });

//    unit.suite(p.suite);
//});