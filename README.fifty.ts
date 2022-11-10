//	LICENSE
//	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
//	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
//
//	END LICENSE

/**
 * ## Provided Platforms
 *
 * ### Java
 *
 * SLIME's Java support allows applications to be written in JavaScript that call out to Java platform libraries. As such, it is an
 * ideal platform for migrating Java software toward JavaScript.
 *
 * SLIME provides two Java platforms: the `jsh` scripting platform that runs on the JVM, and the Java servlet platform that runs on
 * a standard Java servlet implementation. `jsh` also provides the ability to run a servlet container from within its shell.
 *
 * #### `jsh`
 *
 * {@link slime.jsh | `jsh`} is a JavaScript application environment that runs on, and can access, the Java platform.
 *
 * #### SLIME Servlets
 *
 * {@link slime.servlet | SLIME Servlets} is a JavaScript environment for authoring Java servlets.
 *
 * #### Compatibility
 *
 * The SLIME Java runtime is compatible with the following Java environments.
 *
 * ##### JDK
 *
 * Current goal is to be compatible with version used by most Java developers per most recent [JetBrains
 * survey](https://www.jetbrains.com/lp/devecosystem-2021/java/), which is currently **Java 8**.
 *
 * ##### JVM JavaScript engine
 *
 * The test suite executes tests primarily with **Rhino 1.7.14**, with some tests for the **Nashorn** engine on JDK 8. **GraalVM**
 * is not yet supported, although [development is underway](https://github.com/davidpcaldwell/slime/projects/10).
 *
 * ##### Servlet containers
 *
 * SLIME Servlets is compatible with the Servlet 3.0.1 implementation.
 *
 * `jsh` currently supports **Tomcat 7.0.x** and is tested via the test suite. Updating to Tomcat 9 is on the roadmap via [issue
 * 209](https://github.com/davidpcaldwell/slime/issues/209).
 *
 * ### Browser
 *
 * {@link slime.browser | SLIME Browser} is a SLIME environment for the browser. Browser support is less mature than Java support,
 * but is currently tested in Google Chrome and Firefox.
 *
 * ### Node.js
 *
 * {@link slime.node | SLIME Node.js} is a SLIME environment for Node.js. Node.js support is new; currently, the Node environment
 * simply loads the low-level SLIME runtime (providing SLIME's object-oriented and functional programming APIs) and provides access
 * to it, as well as a simple filesystem-based {@link slime.Loader} implementation.
 *
 * ### JXA
 *
 * {@link slime.jxa | SLIME JXA} is a SLIME environment for use in macOS automation.
 *
 * JXA support is alpha quality. That said, JXA is a very difficult environment to use, so SLIME is already extremely helpful, as it
 * provides basic abilities not provided by the platform (like the ability to load code from other source files).
 *
 * ### Creating a custom embedding
 *
 * SLIME provides several embeddings (`jsh`, a Java servlet-based embedding, a browser embedding, a JXA embedding for macOS
 * automation), and a simple Node.js embedding.
 *
 * Custom SLIME embeddings may be developed by creating a suitable implementation of {@link slime.runtime.Scope} and putting that
 * object in scope when evaluating `loader/expression.js`, which yields an object of type {@link slime.runtime.Exports}.
 *
 * The SLIME {@link slime.runtime.Exports | runtime} provides APIs that are ordinarily not available to application code directly, but are
 * provided to support embedders (who can provide them, in turn, to application code).
 *
 * ## Using SLIME
 *
 * ### SLIME definitions (documentation and testing)
 *
 * SLIME has the concept of a _definition_, which is a construct that provides both documentation and a test suite for a particular
 * software module.
 *
 * Documentation for SLIME itself is mostly contained in SLIME definitions that define its APIs.
 *
 * The best way to create SLIME definitions is via the {@link slime.fifty | Fifty} definition framework, which uses TypeScript to
 * provide type definitions and `tsdoc`-compatible documentation (and uses [TypeDoc](https://typedoc.org/) to publish that
 * documentation, and the `fifty view` tool to serve it), and allows inline tests to be authored within those TypeScript
 * definitions. A simple example that contains tests for the project's `wf` commands can be found at `./wf.fifty.ts`.
 *
 * Some existing SLIME APIs are currently defined via the deprecated JSAPI definition format, which used literate definitions that
 * allowed documentation and tests to be defined via annotated HTML (typically using the file extension `.api.html`), using HTML
 * constructs for documentation and embedded scripts for testing.
 *
 * #### Running SLIME definition tests
 *
 * ##### Running Fifty definitions
 *
 * See the {@link slime.fifty.test | Fifty documentation}.
 *
 * ##### Running JSAPI definitions
 *
 * (**deprecated**) Running individual definitions in JSAPI:
 *
 * * `jsh`: `./jsh.bash jsh/test/suite.jsh.js -definition *definition* [-part *part*]`
 * * Browser definition page: `./jsh.bash [loader/browser/test/suite.jsh.js](src/loader/browser/test/suite.jsh.api.html) -definition *pathname* [...]`
 *
 * (**deprecated**) Running a JSAPI browser suite: `./jsh.bash [loader/browser/test/suite.jsh.js](src/loader/browser/test/suite.jsh.api.html) -suite *pathname* [-base *directory*] [-interactive]`
 */
namespace slime {
	export interface Codec<T,E> {
		encode: (t: T) => E
		decode: (e: E) => T
	}

	export namespace js {
		export type Cast<T> = (p: any) => T
		//	https://stackoverflow.com/questions/41253310/typescript-retrieve-element-type-information-from-array-type
		export type ArrayElement<ArrayType extends readonly unknown[]> =
			ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
	}
}

/**
 * Types that are defined by code external to the SLIME project.
 */
namespace slime.external {
}
