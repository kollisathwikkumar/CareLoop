#!/bin/sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TARGET=${1:?usage: ROLLBACK.sh <copy-to-restore>}
cp "$SCRIPT_DIR/original-fixture.txt" "$TARGET"
printf 'ROLLBACK_RESTORED: %s\n' "$TARGET"
