#!/bin/bash
# Generate PWA icons from source 1024x1024 image using ImageMagick

SOURCE_IMAGE="${1:-icon-padding-1024x1024.png}"
OUTPUT_DIR="public"

if [ ! -f "$SOURCE_IMAGE" ]; then
    echo "❌ Error: Source image not found: $SOURCE_IMAGE"
    echo "Usage: ./scripts/generate-icons.sh [path-to-source-image]"
    exit 1
fi

if ! command -v convert &> /dev/null && ! command -v magick &> /dev/null; then
    echo "❌ Error: ImageMagick not found. Install with: brew install imagemagick"
    exit 1
fi

CONVERT_CMD=$(command -v convert || command -v magick)

echo "📸 Generating PWA icons from: $SOURCE_IMAGE"
echo "📁 Output directory: $OUTPUT_DIR"
echo ""

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Generate icons
echo "🚀 Generating icons..."

# PWA manifest icons (required)
$CONVERT_CMD "$SOURCE_IMAGE" -resize 192x192 -background transparent -gravity center -extent 192x192 "$OUTPUT_DIR/icon-192x192.png"
echo "✓ Generated icon-192x192.png"

$CONVERT_CMD "$SOURCE_IMAGE" -resize 512x512 -background transparent -gravity center -extent 512x512 "$OUTPUT_DIR/icon-512x512.png"
echo "✓ Generated icon-512x512.png"

# Apple touch icons
$CONVERT_CMD "$SOURCE_IMAGE" -resize 180x180 -background transparent -gravity center -extent 180x180 "$OUTPUT_DIR/apple-touch-icon.png"
echo "✓ Generated apple-touch-icon.png"

$CONVERT_CMD "$SOURCE_IMAGE" -resize 152x152 -background transparent -gravity center -extent 152x152 "$OUTPUT_DIR/apple-touch-icon-152x152.png"
echo "✓ Generated apple-touch-icon-152x152.png"

$CONVERT_CMD "$SOURCE_IMAGE" -resize 144x144 -background transparent -gravity center -extent 144x144 "$OUTPUT_DIR/apple-touch-icon-144x144.png"
echo "✓ Generated apple-touch-icon-144x144.png"

$CONVERT_CMD "$SOURCE_IMAGE" -resize 120x120 -background transparent -gravity center -extent 120x120 "$OUTPUT_DIR/apple-touch-icon-120x120.png"
echo "✓ Generated apple-touch-icon-120x120.png"

$CONVERT_CMD "$SOURCE_IMAGE" -resize 114x114 -background transparent -gravity center -extent 114x114 "$OUTPUT_DIR/apple-touch-icon-114x114.png"
echo "✓ Generated apple-touch-icon-114x114.png"

# Favicons
$CONVERT_CMD "$SOURCE_IMAGE" -resize 32x32 -background transparent -gravity center -extent 32x32 "$OUTPUT_DIR/favicon-32x32.png"
echo "✓ Generated favicon-32x32.png"

$CONVERT_CMD "$SOURCE_IMAGE" -resize 16x16 -background transparent -gravity center -extent 16x16 "$OUTPUT_DIR/favicon-16x16.png"
echo "✓ Generated favicon-16x16.png"

# Generate favicon.ico (multi-size ICO)
$CONVERT_CMD "$SOURCE_IMAGE" \
  \( -clone 0 -resize 16x16 -background transparent -gravity center -extent 16x16 \) \
  \( -clone 0 -resize 32x32 -background transparent -gravity center -extent 32x32 \) \
  -delete 0 -alpha off -colors 256 "$OUTPUT_DIR/favicon.ico"
echo "✓ Generated favicon.ico"

# Additional Android sizes
$CONVERT_CMD "$SOURCE_IMAGE" -resize 96x96 -background transparent -gravity center -extent 96x96 "$OUTPUT_DIR/icon-96x96.png"
echo "✓ Generated icon-96x96.png"

$CONVERT_CMD "$SOURCE_IMAGE" -resize 144x144 -background transparent -gravity center -extent 144x144 "$OUTPUT_DIR/icon-144x144.png"
echo "✓ Generated icon-144x144.png"

$CONVERT_CMD "$SOURCE_IMAGE" -resize 384x384 -background transparent -gravity center -extent 384x384 "$OUTPUT_DIR/icon-384x384.png"
echo "✓ Generated icon-384x384.png"

echo ""
echo "✅ All icons generated successfully!"
echo ""
echo "📝 Generated files:"
echo "  - icon-192x192.png (PWA required)"
echo "  - icon-512x512.png (PWA required)"
echo "  - apple-touch-icon.png (iOS)"
echo "  - favicon-32x32.png, favicon-16x16.png, favicon.ico (browser)"
echo "  - Additional sizes for Android and other platforms"
echo ""
echo "✨ Icons are ready to use in your PWA!"
