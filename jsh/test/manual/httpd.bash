#	LICENSE
#	This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not
#	distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
#
#	The Original Code is the jsh JavaScript/Java shell.
#
#	The Initial Developer of the Original Code is David P. Caldwell <david@davidpcaldwell.com>.
#	Portions created by the Initial Developer are Copyright (C) 2010 the Initial Developer. All Rights Reserved.
#
#	Contributor(s):
#	END LICENSE

if [ -z "$RHINO_JAR" ]; then
	echo "Required: \$RHINO_JAR"
	exit 1
fi
if [ -z "$TOMCAT_HOME" ]; then
	echo "Required: \$TOMCAT_HOME"
	exit 1
fi
export JSH_SLIME_SRC=$(dirname $0)/../../..
cd $JSH_SLIME_SRC
JSH_SLIME_SRC="."
TOMCAT_CLASSPATH="${TOMCAT_HOME}/bin/tomcat-juli.jar"
TOMCAT_CLASSPATH="${TOMCAT_CLASSPATH}:${TOMCAT_HOME}/lib/servlet-api.jar"
TOMCAT_CLASSPATH="${TOMCAT_CLASSPATH}:${TOMCAT_HOME}/lib/tomcat-api.jar"
TOMCAT_CLASSPATH="${TOMCAT_CLASSPATH}:${TOMCAT_HOME}/lib/tomcat-util.jar"
TOMCAT_CLASSPATH="${TOMCAT_CLASSPATH}:${TOMCAT_HOME}/lib/tomcat-coyote.jar"
TOMCAT_CLASSPATH="${TOMCAT_CLASSPATH}:${TOMCAT_HOME}/lib/catalina.jar"
export JSH_PLUGINS="${TOMCAT_CLASSPATH}"
java -jar $RHINO_JAR -f jsh/launcher/rhino/api.rhino.js jsh/launcher/rhino/test/unbuilt.rhino.js jsh/test/manual/httpd.jsh.js
