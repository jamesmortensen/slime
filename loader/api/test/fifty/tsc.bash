#!/bin/bash
DIR="$(dirname $0)"
SLIME="${DIR}/../../../.."
: "${PROJECT:=${SLIME}}"
export PROJECT
env PATH="${PATH}:${SLIME}/local/jsh/lib/node/bin" NODE_PATH="${SLIME}/local/jsh/lib/node/lib/node_modules" node ${NODE_DEBUG} ${DIR}/tsc.node.js "$@"