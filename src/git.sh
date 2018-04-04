#!/usr/bin/env bash


# This script use for git pull or git fetch
# Usage:
# ./git.sh pull <path> <remote> <branch>
# ./git.sh fetch <path> <remote>

function throw() { echo "[FATAL] (./git.sh) $1"; exit 1; }

[[ "$1" != "pull" ]] && [[ "$1" != "fetch" ]] && throw "invalid operation: $1";

[[ -z "$2" ]] && throw "empty local git repository path";
[[ ! -d "$2" ]] && throw "$1 is not a directory";

[[ -z "$3" ]] && throw "empty remote name";

cd "$2";

if [[ "$1" == "pull" ]]; then
	[[ -z "$4" ]] && throw "empty branch name";
	git pull "$3" "$4" || throw "git pull failed!";
else # fetch
	git fetch "$3" || throw "git fetch failed!";
fi

echo "[SUCCESS]: HEAD_COMMIT=$(git rev-parse HEAD)";
