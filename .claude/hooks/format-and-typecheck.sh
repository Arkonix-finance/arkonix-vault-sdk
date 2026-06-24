#!/usr/bin/env bash
# PostToolUse hook: runs on Edit|Write. Lints the edited file and typechecks the
# project, feeding any errors back to Claude (exit 2) so it self-corrects.
set -euo pipefail
cd "$CLAUDE_PROJECT_DIR"

FILE="$(jq -r '.tool_input.file_path // empty')"
[ -z "$FILE" ] && exit 0

case "$FILE" in
  *.ts|*.tsx)
    # Lint the edited file only if an ESLint flat config exists (skip otherwise
    # so the hook stays quiet on repos without lint configured).
    if ls eslint.config.* >/dev/null 2>&1; then
      if ! npx --no-install eslint "$FILE" 1>&2; then
        echo "ESLint errors above — fix them in $FILE." >&2
        exit 2
      fi
    fi
    if [ -f tsconfig.json ]; then
      if ! npx --no-install tsc --noEmit 1>&2; then
        echo "TypeScript errors above — resolve before continuing." >&2
        exit 2
      fi
    fi
    ;;
esac

exit 0
