//	LICENSE
//	The contents of this file are subject to the Mozilla Public License Version 1.1 (the "License"); you may not use
//	this file except in compliance with the License. You may obtain a copy of the License at http://www.mozilla.org/MPL/
//	
//	Software distributed under the License is distributed on an "AS IS" basis, WITHOUT WARRANTY OF ANY KIND, either
//	express or implied. See the License for the specific language governing rights and limitations under the License.
//	
//	The Original Code is the SLIME loader for rhino.
//	
//	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
//	Portions created by the Initial Developer are Copyright (C) 2010 the Initial Developer. All Rights Reserved.
//	
//	Contributor(s):
//	END LICENSE

package inonit.script.rhino;

import org.mozilla.javascript.*;

public class MetaObject implements Scriptable {
	//	TODO	there are a lot of untested cases; for example, there are many methods that will bomb if target is null
	//	TODO	But see ES2.0 proposal, with get/set/has/delete/invoke
	public static Scriptable create(Scriptable delegate, Function getter, Function setter) {
		return new MetaObject(delegate, getter, setter);
	}

	//	TODO	Can this variable be null?  We check for it below in some places but not others
	private Scriptable delegate;
	private Function getter;
	private Function setter;

	private Scriptable scope;
	private Scriptable prototype;

	private MetaObject(Scriptable delegate, Function getter, Function setter) {
		this.delegate = delegate;
		this.getter = getter;
		this.setter = setter;
	}

	public void setParentScope(Scriptable arg0) {
		if (delegate == null) {
			scope = arg0;
		} else {
			delegate.setParentScope(arg0);
		}
	}

	public Scriptable getParentScope() {
		if (delegate == null) {
			return scope;
		} else {
			return delegate.getParentScope();
		}
	}

	public void setPrototype(Scriptable arg0) {
		if (delegate == null) {
			prototype = arg0;
		} else {
			delegate.setPrototype(arg0);
		}
	}

	public Scriptable getPrototype() {
		if (delegate == null) {
			return prototype;
		} else {
			return delegate.getPrototype();
		}
	}

	private Scriptable getScope() {
		if (delegate == null) return scope;
		return delegate.getParentScope();
	}

	public Object getDefaultValue(Class arg0) {
		return delegate.getDefaultValue(arg0);
	}

	public void delete(String arg0) {
		delegate.delete(arg0);
	}

	public String getClassName() {
		return delegate.getClassName();
	}

	private Object delegateGet(String name, Scriptable start) {
		if (delegate == null) return ScriptableObject.NOT_FOUND;
		return delegate.get(name, start);
	}

	public Object get(String arg0, Scriptable arg1) {
		Object rv = delegateGet(arg0, arg1);
		if (rv == ScriptableObject.NOT_FOUND) {
			if (getter != null) {
				rv = getter.call(Context.getCurrentContext(), getScope(), delegate, new java.lang.Object[] {
					arg0
				});
				if (rv instanceof org.mozilla.javascript.Undefined) {
					rv = ScriptableObject.NOT_FOUND;
				}
			}
		}
		return rv;
	}

	public Object[] getIds() {
		return delegate.getIds();
	}

	public boolean has(String arg0, Scriptable arg1) {
		return delegate.has(arg0, arg1);
	}

	public boolean hasInstance(Scriptable arg0) {
		return delegate.hasInstance(arg0);
	}

	public void put(String arg0, Scriptable arg1, Object arg2) {
		if (setter != null) {
			setter.call(Context.getCurrentContext(), getScope(), delegate, new java.lang.Object[] {
				arg0, arg2
			});
		} else {
			delegate.put(arg0, arg1, arg2);
		}
	}

	//
	//	Integer versions of functions that simply call String versions
	//

	public boolean has(int arg0, Scriptable arg1) {
		return this.has(String.valueOf(arg0), arg1);
	}

	public void delete(int arg0) {
		this.delete(String.valueOf(arg0));
	}

	public void put(int arg0, Scriptable arg1, Object arg2) {
		this.put(String.valueOf(arg0), arg1, arg2);
	}

	public Object get(int arg0, Scriptable arg1) {
		return this.get(String.valueOf(arg0), arg1);
	}
}