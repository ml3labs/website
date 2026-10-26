#!/bin/bash
# Post-edit hook: formats the file Claude just wrote with Prettier, then lets
# ESLint fix what it can. Exit 0 = clean, exit 2 = the remaining ESLint
# errors go back to Claude to fix.

# Guard: jq is required to parse hook input
if ! command -v jq &>/dev/null; then
    exit 0
fi

FILE_PATH=$(jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
    exit 0
fi

# Run from the checkout that holds the file, so an edit inside a worktree
# uses that worktree's config. Files outside any checkout are left alone.
DIR=$(dirname "$FILE_PATH")
ROOT=$(git -C "$DIR" rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$ROOT" || exit 0

# Lint by the path relative to the checkout. The absolute one can differ
# from git's in letter case, which macOS accepts and ESLint doesn't: it
# skips the file as outside its base path.
FILE="$(git -C "$DIR" rev-parse --show-prefix)$(basename "$FILE_PATH")"

# Guard: a fresh worktree has no node_modules until npm install
if [ ! -d node_modules ]; then
    exit 0
fi

case "$FILE" in
    node_modules/* | .next/* | out/*) exit 0 ;;
esac

# Prettier skips anything in .prettierignore on its own
case "$FILE" in
    *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs)
        npx --no-install prettier --write "$FILE" >/dev/null 2>&1

        if ! ERRORS=$(npx --no-install eslint --fix "$FILE" 2>&1); then
            echo "$ERRORS" >&2
            exit 2
        fi
        ;;
    *.css | *.json | *.md | *.yaml | *.yml)
        npx --no-install prettier --write "$FILE" >/dev/null 2>&1
        ;;
esac

exit 0
