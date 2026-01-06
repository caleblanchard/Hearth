# PWA Icon Generation Guide

This guide explains how to generate all required PWA icons from your source 1024x1024 image.

## Quick Start

1. **Place your source image** in the repository root:
   ```bash
   # Copy your 1024x1024 PNG image to the repo root
   cp /path/to/your/icon-padding-1024x1024.png .
   ```

2. **Run the generation script**:
   ```bash
   ./scripts/generate-icons.sh icon-padding-1024x1024.png
   ```
   
   Or if the image is in a different location:
   ```bash
   ./scripts/generate-icons.sh /path/to/your/image.png
   ```

3. **Verify icons** were generated in the `public/` directory

## Generated Icons

The script generates the following icons:

### Required PWA Icons
- `icon-192x192.png` - Standard PWA icon (required)
- `icon-512x512.png` - Large PWA icon (required)

### Apple Touch Icons (iOS)
- `apple-touch-icon.png` (180x180) - Primary iOS icon
- `apple-touch-icon-152x152.png` - iPad
- `apple-touch-icon-144x144.png` - Legacy iOS
- `apple-touch-icon-120x120.png` - iPhone
- `apple-touch-icon-114x114.png` - Legacy iPhone

### Favicons (Browser)
- `favicon-32x32.png` - Standard favicon
- `favicon-16x16.png` - Small favicon
- `favicon.ico` - Multi-size ICO file

### Additional Sizes
- `icon-96x96.png` - Android
- `icon-144x144.png` - Android
- `icon-384x384.png` - Android splash

## How It Works

The script uses ImageMagick to:
1. Resize the source image to each required size
2. Maintain aspect ratio with transparent background padding
3. Center the icon content within each size
4. Generate optimized PNG files

## Requirements

- **ImageMagick** installed:
  ```bash
  # macOS
  brew install imagemagick
  
  # Linux (Ubuntu/Debian)
  sudo apt-get install imagemagick
  
  # Linux (Fedora)
  sudo dnf install ImageMagick
  ```

## Alternative: Using Node.js Script

If you prefer using Node.js with the `sharp` library:

1. **Install sharp**:
   ```bash
   npm install --save-dev sharp
   ```

2. **Run the Node.js script**:
   ```bash
   node scripts/generate-pwa-icons.js icon-padding-1024x1024.png
   ```

## Source Image Requirements

- **Format**: PNG (recommended) or any format ImageMagick supports
- **Size**: 1024x1024 pixels (or larger, will be resized)
- **Content**: Your icon should have appropriate padding (the black padding in your image will be preserved as transparent background)

## Manifest Configuration

The `manifest.json` is already configured with the required icons:
- `icon-192x192.png`
- `icon-512x512.png`

No changes needed unless you want to add additional sizes.

## Testing

After generating icons:

1. **Check files exist**:
   ```bash
   ls -lh public/icon-*.png public/apple-touch-icon*.png public/favicon*
   ```

2. **Test PWA installation**:
   - Open your app in a browser
   - Check if the install prompt shows your icon
   - Install the PWA and verify the icon appears correctly

3. **Test on different devices**:
   - iOS: Check home screen icon
   - Android: Check app icon and splash screen
   - Desktop: Check browser favicon

## Troubleshooting

### ImageMagick not found
```bash
# Install ImageMagick
brew install imagemagick  # macOS
# or
sudo apt-get install imagemagick  # Linux
```

### Icons look blurry
- Ensure source image is at least 1024x1024
- Use PNG format for best quality
- Check that icons are being generated at correct sizes

### Icons have wrong aspect ratio
- The script maintains aspect ratio and centers content
- If your source has padding, it will be preserved as transparent background
- The icon content will be centered within each size

### Favicon.ico not working
- Some browsers cache favicons aggressively
- Try hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
- Clear browser cache
- Test in incognito/private mode

## Updating Icons

To update icons with a new design:

1. Replace the source image
2. Run the generation script again
3. Clear browser cache
4. Test PWA installation

## Next Steps

- ✅ Icons generated
- ✅ Manifest.json configured
- 🔄 Test PWA installation
- 🔄 Verify icons on different devices
- 🔄 Update app metadata if needed
