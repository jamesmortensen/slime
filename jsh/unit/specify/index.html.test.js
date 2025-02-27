//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

(
	function() {
		var api = $loader.module("loader/api/unit.js");
		var unit = $loader.module("loader/browser/test/module.js", {
			api: {
				unit: api,
				Promise: window.Promise
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
		styles.setAttribute("href", "../../../loader/api/ui/ui.css");
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
						};

						this.end = function(b) {
						}
					})
				};
			}
		});

		//	TODO	should be able to refactor this into a specification file, or at least a test file paired with
		//			the API, perhaps
		var whitespace = new unit.Scenario();
		whitespace.target(inonit.loader.loader.value("whitespace.js"));
		whitespace.test(new function() {
			this.check = function(verify) {
				verify(this).evaluate.property("before").is.type("function");
				verify(this).before("\t\ta").is("\t\t");
				verify(this).before("\t\t").is("\t\t");
				verify(this).before("a").is("");
				verify(this).before("").is("");

				verify(this).after("\t\tb").is("");
				verify(this).after("\t\tb\t").is("\t");
				verify(this).after("b\t").is("\t");
				verify(this).after("b").is("");
				verify(this).after("").is("");
				verify(this).after("a\t\tb\t").is("\t");

				var is = function(s) {
					return function() {
						return this.is(s);
					}
				};

				verify(this).evaluate(is("")).is(true);
				verify(this).evaluate(is(" ")).is(true);
				verify(this).evaluate(is("\t")).is(true);
				verify(this).evaluate(is("a")).is(false);
				verify(this).evaluate(is(" a")).is(false);
				verify(this).evaluate(is("a ")).is(false);
				verify(this).evaluate(is(" a ")).is(false);

				verify(this).common(["\t\ta", "\ta"]).is("\t");
				verify(this).common(["\t\ta", "\t    a"]).is("\t");
				verify(this).common(["\t\ta", "a"]).is("");
				verify(this).common(["", "\t\ta", "\ta", "\tb", "\t"]).is("\t");
			}
		});

		var page = new function() {
			this.getHeadRows = function() {
				return document.getElementById("head").getElementsByTagName("table")[0].getElementsByTagName("tbody")[0].rows;
			}
		}

		var initial = new unit.Scenario();
		initial.test({
			check: function(verify) {
				verify(document).getElementById("target").contentDocument.title.is("__TITLE__");
				verify(document).getElementById("title").innerHTML.is("__TITLE__");
				//	Make sure license comment is stripped from API template
				verify(document).getElementById("target").contentDocument.childNodes[0].nodeType.is.not(8);
			}
		});

		var title = new unit.Scenario();
		title.target({
			row: function() {
				var tbody = document.getElementById("head").getElementsByTagName("table")[0].getElementsByTagName("tbody")[0];
				var titleRow = tbody.rows[0];
				return titleRow;
			},
			span: function() {
				return this.row().getElementsByTagName("span")[0];
			},
			input: function() {
				return this.row().getElementsByTagName("input")[0];
			}
		});
		title.test({
			check: function(verify) {
				verify(this).row().tagName.is("TR");
				verify(this).span().tagName.is("SPAN");
				verify(this).span().innerHTML.is("__TITLE__");
			}
		});
		title.test({
			run: function() {
				unit.fire.click(this.span());
			},
			check: function(verify) {
				verify(this).span().style.display.is("none");
				verify(this).input().style.display.is.not("none");
			}
		});
		title.test({
			run: function() {
				unit.fire.click(this.span());
				this.input().value = "foo";
				unit.fire.keypress(this.input(), {
					key: "Enter",
					ctrlKey: true
				});
			},
			check: function(verify) {
				verify(this).span().evaluate.property("inonit").is.equalTo(null);
				verify(this).span().innerHTML.is("foo");
				verify(document).getElementById("title").evaluate.property("inonit").is.equalTo(null);
				verify(document).getElementById("title").innerHTML.is("foo");
				verify(document).getElementById("target").contentDocument.title.is("foo");
				verify(document).getElementById("target").contentDocument.getElementsByTagName("title")[0].innerHTML.is("foo");
			}
		});
		title.test({
			run: function() {
				unit.fire.click(this.span());
				this.input().value = "bar";
				unit.fire.keypress(this.input(), {
					key: "Enter",
					ctrlKey: true
				});
			},
			check: function(verify) {
				verify(this).span().evaluate.property("inonit").is.equalTo(null);
				verify(this).span().innerHTML.is("bar");
				verify(document).getElementById("title").evaluate.property("inonit").is.equalTo(null);
				verify(document).getElementById("title").innerHTML.is("bar");
				verify(document).getElementById("target").contentDocument.title.is("bar");
				verify(document).getElementById("target").contentDocument.getElementsByTagName("title")[0].innerHTML.is("bar");
			}
		});

		var comment = new unit.Scenario();
		comment.target(new function() {
			this.getTargetComments = function() {
				var content = document.getElementById("target").contentDocument;
				var rv = [];
				for (var i=0; i<content.head.childNodes.length; i++) {
					if (content.head.childNodes[i].nodeType == 8) {
						rv.push(content.head.childNodes[i]);
					}
				}
				return rv;
			}

			var comment = function(row) {
				row.getTextArea = function() {
					return this.cells[1].getElementsByTagName("textarea")[0];
				};
				row.getSpan = function() {
					return this.cells[1].getElementsByTagName("span")[0];
				}
				return row;
			};

			this.getApiLocationComment = function() {
				return comment(page.getHeadRows()[1]);
			}

			this.getApiProtocolComment = function() {
				return comment(page.getHeadRows()[2]);
			}
		});
		comment.test({
			check: function(verify) {
				verify(this).getApiLocationComment().cells[0].innerHTML.is("(comment)");

				verify(this).getApiLocationComment().getTextArea().style.display.is("none");

				var propertyStartsWith = function(name,prefix) {
					var rv = function() {
						return this[name].substring(0,prefix.length) == prefix;
					};
					rv.toString = function() {
						return "propertyStartsWith('" + prefix + "')";
					}
					return rv;
				};
				verify(this).getApiLocationComment().getTextArea().evaluate(propertyStartsWith("value","TODO")).is(true);
				var lines = this.getApiProtocolComment().getTextArea().value.split("\n");
				verify(lines).length.is(2);
				verify(lines,"lines").evaluate(propertyStartsWith(0,"These")).is(true);
				verify(lines,"lines").evaluate(propertyStartsWith(1,"work")).is(true);
			}
		});
		comment.test({
			run: function() {
				unit.fire.click(this.getApiLocationComment().getSpan());
			},
			check: function(verify) {
				verify(this).getApiLocationComment().getTextArea().style.display.is.not("none");
				verify(document).activeElement.is(this.getApiLocationComment().getTextArea());
			}
		});
		comment.test({
			run: function() {
				this.getApiLocationComment().getTextArea().value = "foo";
				unit.fire.keypress(this.getApiLocationComment().getTextArea(), {
					key: "Enter",
					ctrlKey: true
				});
			},
			check: function(verify) {
				verify(this).getApiLocationComment().getSpan().innerHTML.is("\tfoo\t");
				var comments = this.getTargetComments();
				verify(comments)[0].data.is("\tfoo\t");
				verify(this).getApiLocationComment().getTextArea().style.display.is("none");
			}
		});
		comment.test({
			run: function() {
				unit.fire.click(this.getApiLocationComment().getSpan());
				this.getApiLocationComment().getTextArea().value = "bar";
				unit.fire.keydown(this.getApiLocationComment().getTextArea(), {
					key: "Escape"
				});
			},
			check: function(verify) {
				verify(this).getApiLocationComment().getTextArea().style.display.is("none");
				verify(this).getApiLocationComment().getSpan().innerHTML.is("\tfoo\t");
				//	TODO	the below is probably wrong for now; trailing whitespace not stripped. Should probably change that.
				verify(this).getApiLocationComment().getTextArea().value.is("foo\t");
			}
		});

		var link = new unit.Scenario();
		link.target(new function() {
			var LinkEditor = function(element) {
				element.getInput = function() {
					return this.getElementsByTagName("input")[0];
				};
				element.getSpan = function() {
					return this.getElementsByTagName("span")[0];
				}
				return element;
			};

			this.getApiCssRow = function() {
				return LinkEditor(page.getHeadRows()[3]);
			};

			this.getTargetLink = function() {
				//	TODO	relies on only one link, but fine for now
				return document.getElementById("target").contentDocument.getElementsByTagName("link")[0];
			}
		});
		link.test(new function() {
			var githack = "http://bb.githack.com/davidpcaldwell/slime/raw/tip/loader/api/api.css";

			this.check = function(verify) {
				verify(this).getApiCssRow().cells[0].innerHTML.is("link (stylesheet)");
				verify(this).getApiCssRow().getSpan().innerHTML.is(githack);
				verify(this).getApiCssRow().getInput().value.is(githack);
			}
		});
		link.test(new function() {
			var foo = document.origin + "/foo.css";

			this.run = function() {
				unit.fire.click(this.getApiCssRow().getInput());
				this.getApiCssRow().getInput().value = foo;
				unit.fire.keypress(this.getApiCssRow().getInput(), {
					key: "Enter",
					ctrlKey: true
				});
			};

			this.check = function(verify) {
				verify(this).getApiCssRow().getSpan().innerHTML.is(foo);
				verify(this).getTargetLink().href.is(foo);
			}
		});

		var scripts = new unit.Scenario();
		scripts.target(new function() {
			var Editor = function(element) {
				element.getSpan = function() {
					return this.cells[1].getElementsByTagName("span")[0];
				}
			}

			var ExternalEditor = function(element) {
				Editor(element);
				element.getInput = function() {
					return this.cells[1].getElementsByTagName("input")[0];
				}
				return element;
			};

			var InlineEditor = function(element) {
				Editor(element);
				element.getEditor = function() {
					return this.cells[1].getElementsByTagName("textarea")[0];
				};
				return element;
			}

			this.getScriptRows = function() {
				return [
					ExternalEditor(page.getHeadRows()[4]),
					InlineEditor(page.getHeadRows()[5])
				];
			};

			this.getTargetScripts = function() {
				return document.getElementById("target").contentDocument.getElementsByTagName("script");
			}
		});
		scripts.test(new function() {
			var githack = "http://bb.githack.com/davidpcaldwell/slime/raw/tip/loader/api/api.js";

			this.check = function(verify) {
				verify(this).getScriptRows()[0].cells[0].innerHTML.is("script (external)");
				verify(this).getScriptRows()[1].cells[0].innerHTML.is("script (inline)");
				verify(this).getScriptRows()[0].getSpan().innerHTML.is(githack);
			};
		});
		scripts.test(new function() {
			var foo = document.origin + "/foo.js";

			this.run = function() {
				unit.fire.click(this.getScriptRows()[0].getSpan());
				this.getScriptRows()[0].getInput().value = foo;
				unit.fire.keypress(this.getScriptRows()[0].getInput(), {
					key: "Enter",
					ctrlKey: true
				});
			};

			this.check = function(verify) {
				verify(this).getScriptRows()[0].getSpan().innerHTML.is(foo);
				verify(this).getTargetScripts()[0].src.is(foo);
			}
		});
		scripts.test(new function() {
			var foo = document.origin + "/foo.js";
			var bar = document.origin + "/bar.js";

			this.run = function() {
				unit.fire.click(this.getScriptRows()[0].getSpan());
				this.getScriptRows()[0].getInput().value = bar;
				unit.fire.keydown(this.getScriptRows()[0].getInput(), {
					key: "Escape"
				});
			}

			this.check = function(verify) {
				verify(this).getScriptRows()[0].getInput().value.is(foo);
				verify(this).getScriptRows()[0].getSpan().innerHTML.is(foo);
				verify(this).getTargetScripts()[0].src.is(foo);
				verify(this).getScriptRows()[0].getInput().style.display.is("none");
			};
		});
		scripts.test(new function() {
			this.check = function(verify) {
				verify(this).getScriptRows()[1].getSpan().innerHTML.is("[code]");
			}
		});
		scripts.test(new function() {
			this.run = function() {
				unit.fire.click(this.getScriptRows()[1].getSpan());
			};

			this.check = function(verify) {
				verify(this).getScriptRows()[1].getSpan().style.display.is("none");
				verify(this).getScriptRows()[1].getEditor().style.display.is.not("none");
				var code = this.getScriptRows()[1].getEditor().value.split("\n");
				verify(code,"code").length.is(2);
				verify(code,"code")[0].is("//\tTODO\tCORS");
			}
		});
		scripts.test(new function() {
			this.run = function() {
				unit.fire.keydown(this.getScriptRows()[1].getEditor(), {
					key: "Escape"
				});
			};

			this.check = function(verify) {
				verify(this).getScriptRows()[1].getSpan().style.display.is.not("none");
				verify(this).getScriptRows()[1].getEditor().style.display.is("none");
			}
		});
		scripts.test(new function() {
			this.run = function() {
				unit.fire.click(this.getScriptRows()[1].getSpan());
			};

			this.check = function(verify) {
				var code = this.getScriptRows()[1].getEditor().value.split("\n");
				verify(code,"code").length.is(2);
				verify(code,"code")[0].is("//\tTODO\tCORS");
			}
		});
		scripts.test(new function() {
			this.run = function() {
				unit.fire.keydown(this.getScriptRows()[1].getEditor(), {
					key: "Escape"
				});
			};
		});

		var selection = new unit.Scenario();
		selection.target(new function() {
			this.content = new function() {
				var content = document.getElementById("target").contentDocument;
				this.description = content.getElementsByTagName("div")[0];
				this.context = {
					div: content.getElementsByTagName("div")[1],
					header: content.getElementsByTagName("h1")[0],
					ul: content.getElementsByTagName("ul")[0]
				}
				this.contextHeader = this.context.header;
				this.exportsHeader = content.getElementsByTagName("h1")[1];
			};

			this.status = document.getElementById("status");

			var isSelected = function(element) {
				//	TODO	DRY violation
				var dummy = document.createElement("div");
				dummy.style.backgroundColor = "#c0c0ff";
				return element.style.backgroundColor == dummy.style.backgroundColor;
			};

			var target = this;

			this.isSelected = function() {
				return isSelected(this);
			};
		});
		selection.test({
			check: function(verify) {
				var page = this;
				verify(this).content.description.innerHTML.is("__DESCRIPTION__");
				verify(this).content.description.evaluate(this.isSelected).is(false);
				verify(this).status.children.length.is(0);
			}
		});
		selection.test({
			run: function() {
				unit.fire.click(this.content.description);
			},
			check: function(verify) {
				var page = this;
				verify(this).content.description.evaluate(this.isSelected).is(true);
				verify(this).status.children.length.is(2);
				verify(this).status.children[0].innerHTML.is("BODY");
				verify(this).status.children[1].innerHTML.is("DIV");
			}
		});
		selection.test({
			run: function() {
				unit.fire.click(this.content.contextHeader);
			},
			check: function(verify) {
				var page = this;
				verify(this).content.description.evaluate(this.isSelected).is(false);
				verify(this).content.contextHeader.evaluate(this.isSelected).is(true);
				verify(this).status.children.length.is(3);
			}
		});
		selection.test({
			run: function() {
				unit.fire.keydown(this.content.context.header, { key: "ArrowLeft" });
			},
			check: function(verify) {
				verify(this).status.children.length.is(2);
				verify(this).content.context.header.evaluate(this.isSelected).is(false);
				verify(this).content.context.div.evaluate(this.isSelected).is(true);
			}
		});


		var suite = new api.Suite({
			name: "Suite",
			parts: {
				whitespace: whitespace,
				initial: initial,
				title: title,
				comment: comment,
				link: link,
				scripts: scripts,
				selection: selection
			}
		});

		unit.suite(suite);
	}
)();
