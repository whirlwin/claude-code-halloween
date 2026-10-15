#!/usr/bin/env bash
# Builds "Halloween Clawd.saver" from the mod's scene into build/. With
# --install it also replaces the copy in ~/Library/Screen Savers.
set -euo pipefail
cd "$(dirname "$0")"

NAME='Halloween Clawd'
SAVER="build/$NAME.saver"
MACOS=13.0
VERSION=$(node -p "require('../.claude-plugin/plugin.json').version")

rm -rf "$SAVER" build/arch
mkdir -p "$SAVER/Contents/MacOS" "$SAVER/Contents/Resources" build/arch

node bake.mjs "$SAVER/Contents/Resources/scene.json"

for arch in arm64 x86_64; do
  swiftc -O -module-name HalloweenClawd -target "$arch-apple-macos$MACOS" \
    -emit-library -Xlinker -bundle -o "build/arch/$arch" \
    -framework AppKit -framework ScreenSaver HalloweenClawdView.swift
done
lipo -create build/arch/arm64 build/arch/x86_64 -output "$SAVER/Contents/MacOS/HalloweenClawd"
rm -rf build/arch

cat > "$SAVER/Contents/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleExecutable</key><string>HalloweenClawd</string>
  <key>CFBundleIdentifier</key><string>com.github.whirlwin.claude-code-halloween.saver</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>$NAME</string>
  <key>CFBundlePackageType</key><string>BNDL</string>
  <key>CFBundleShortVersionString</key><string>$VERSION</string>
  <key>CFBundleVersion</key><string>$VERSION</string>
  <key>LSMinimumSystemVersion</key><string>$MACOS</string>
  <key>NSPrincipalClass</key><string>HalloweenClawdView</string>
</dict>
</plist>
PLIST

# System Settings shows these in its list of screensavers.
swift render.swift "$SAVER" "$SAVER/Contents/Resources/thumbnail.png" 90 58 20
swift render.swift "$SAVER" "$SAVER/Contents/Resources/thumbnail@2x.png" 180 116 20

codesign --force --sign - "$SAVER"
echo "Built $SAVER"

if [[ "${1:-}" == --install ]]; then
  DEST="$HOME/Library/Screen Savers"
  mkdir -p "$DEST"
  rm -rf "$DEST/$NAME.saver"
  cp -R "$SAVER" "$DEST/"
  # The host keeps a loaded saver in memory, so a rebuild only shows once it
  # restarts.
  killall legacyScreenSaver 2>/dev/null || true
  echo "Installed into $DEST"
fi
