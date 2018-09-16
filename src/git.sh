#!/usr/bin/env bash


# This script use for git pull or git fetch
# Usage:
# ./git.sh pull  <path> <remote> <branch> [afterCommand]
# ./git.sh fetch <path> <remote>          [afterCommand]

function throw() { echo "[FATAL] (./git.sh) $1"; exit 1; }

[[ "$1" != "pull" ]] && [[ "$1" != "fetch" ]] && throw "invalid operation: $1";

[[ -z "$2" ]] && throw "local git repository path is empty!";
[[ ! -d "$2" ]] && throw "$1 is not a directory!";

[[ -z "$3" ]] && throw "remote name is empty!";

cd "$2" || throw "cd $2 failed!";

if [[ "$1" == "pull" ]]; then
	[[ -z "$4" ]] && throw "branch name is empty!";
	git pull "$3" "$4" || throw "git pull failed!";
	afterCommand="$5";
else # fetch
	git fetch "$3" || throw "git fetch failed!";
	afterCommand="$4";
fi

echo "[SUCCESS]: HEAD_COMMIT=$(git rev-parse HEAD)";

if [[ -n "$afterCommand" ]]; then
	eval "$afterCommand" || throw "execute \"$afterCommand\" failed!"
	echo "[SUCCESS]: executed \"$afterCommand\"!";
fi
