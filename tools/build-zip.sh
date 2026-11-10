#!/usr/bin/env bash
# Builds two ZIP backups next to the lifeos/ folder:
#   lifeos-2.0-public.zip   - same as GitHub (onboarding asks for your details)
#   lifeos-2.0-personal.zip - PRIVATE: profile.personal.js replaces js/profile.js so the app starts pre-filled
# Never upload the personal ZIP anywhere public.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT=..
STAGE=$(mktemp -d)
FILES="index.html manifest.webmanifest sw.js README.md css js icons docs"
mkdir -p "$STAGE/lifeos"
cp -r $FILES "$STAGE/lifeos/"
rm -f "$STAGE/lifeos/js/profile.personal.js"
(cd "$STAGE" && python3 -m zipfile -c "$OLDPWD/$OUT/lifeos-2.0-public.zip" lifeos)
if [ -f js/profile.personal.js ]; then
  cp js/profile.personal.js "$STAGE/lifeos/js/profile.js"
  (cd "$STAGE" && python3 -m zipfile -c "$OLDPWD/$OUT/lifeos-2.0-personal.zip" lifeos)
fi
rm -rf "$STAGE"
ls -la "$OUT"/lifeos-2.0-*.zip
