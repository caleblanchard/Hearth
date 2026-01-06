#!/usr/bin/env node

/**
 * Generate PWA icons from a source 1024x1024 image
 * 
 * This script generates all required PWA icon sizes from a source image.
 * It uses sharp if available, otherwise falls back to ImageMagick.
 * 
 * Usage: node scripts/generate-pwa-icons.js [source-image-path]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_IMAGE = process.argv[2] || 'icon-padding-1024x1024.png';
const OUTPUT_DIR = path.join(__dirname, '..', 'public');

// Required PWA icon sizes
const ICON_SIZES = [
  // PWA manifest icons (required)
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' },
  
  // Apple touch icons
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 152, name: 'apple-touch-icon-152x152.png' },
  { size: 144, name: 'apple-touch-icon-144x144.png' },
  { size: 120, name: 'apple-touch-icon-120x120.png' },
  { size: 114, name: 'apple-touch-icon-114x114.png' },
  
  // Favicons
  { size: 32, name: 'favicon-32x32.png' },
  { size: 16, name: 'favicon-16x16.png' },
  
  // Additional Android sizes
  { size: 96, name: 'icon-96x96.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 384, name: 'icon-384x384.png' },
];

// Check if sharp is available
let useSharp = false;
try {
  require.resolve('sharp');
  useSharp = true;
  console.log('✓ Using sharp for image processing');
} catch (e) {
  console.log('⚠ sharp not found, checking for ImageMagick...');
}

// Check if ImageMagick is available
let useImageMagick = false;
try {
  execSync('which convert', { stdio: 'ignore' });
  useImageMagick = true;
  console.log('✓ Using ImageMagick for image processing');
} catch (e) {
  try {
    execSync('which magick', { stdio: 'ignore' });
    useImageMagick = true;
    console.log('✓ Using ImageMagick (magick) for image processing');
  } catch (e2) {
    console.log('⚠ ImageMagick not found');
  }
}

if (!useSharp && !useImageMagick) {
  console.error('❌ Error: Neither sharp nor ImageMagick is available.');
  console.error('Please install one of them:');
  console.error('  npm install --save-dev sharp');
  console.error('  OR install ImageMagick: brew install imagemagick (macOS)');
  process.exit(1);
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Check if source image exists
const sourcePath = path.isAbsolute(SOURCE_IMAGE) 
  ? SOURCE_IMAGE 
  : path.join(__dirname, '..', SOURCE_IMAGE);

if (!fs.existsSync(sourcePath)) {
  console.error(`❌ Error: Source image not found: ${sourcePath}`);
  console.error('Usage: node scripts/generate-pwa-icons.js [source-image-path]');
  process.exit(1);
}

console.log(`\n📸 Source image: ${sourcePath}`);
console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);

// Generate icons using sharp
async function generateWithSharp() {
  const sharp = require('sharp');
  
  for (const icon of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, icon.name);
    
    try {
      await sharp(sourcePath)
        .resize(icon.size, icon.size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Error generating ${icon.name}:`, error.message);
    }
  }
}

// Generate icons using ImageMagick
function generateWithImageMagick() {
  const convertCmd = execSync('which convert', { encoding: 'utf-8' }).trim() || 'magick';
  
  for (const icon of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, icon.name);
    
    try {
      // ImageMagick command: resize and maintain aspect ratio with transparent background
      execSync(
        `${convertCmd} "${sourcePath}" -resize ${icon.size}x${icon.size} -background transparent -gravity center -extent ${icon.size}x${icon.size} "${outputPath}"`,
        { stdio: 'ignore' }
      );
      
      console.log(`✓ Generated ${icon.name} (${icon.size}x${icon.size})`);
    } catch (error) {
      console.error(`❌ Error generating ${icon.name}:`, error.message);
    }
  }
}

// Generate favicon.ico (special case - multi-size ICO file)
async function generateFavicon() {
  const faviconPath = path.join(OUTPUT_DIR, 'favicon.ico');
  
  if (useSharp) {
    try {
      const sharp = require('sharp');
      // Generate 16x16 and 32x32 and combine into ICO
      // Note: sharp doesn't directly support ICO, so we'll create a simple PNG-based ICO
      // For a proper ICO, you might want to use a dedicated tool
      await sharp(sourcePath)
        .resize(32, 32, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(faviconPath.replace('.ico', '.png'));
      
      console.log('⚠ favicon.ico: Created favicon-32x32.png instead (ICO format requires special tools)');
      console.log('  You can use an online converter or imagemagick to create proper .ico file');
    } catch (error) {
      console.error('❌ Error generating favicon:', error.message);
    }
  } else if (useImageMagick) {
    try {
      const convertCmd = execSync('which convert', { encoding: 'utf-8' }).trim() || 'magick';
      execSync(
        `${convertCmd} "${sourcePath}" -resize 32x32 -background transparent -gravity center -extent 32x32 "${faviconPath}"`,
        { stdio: 'ignore' }
      );
      console.log('✓ Generated favicon.ico');
    } catch (error) {
      console.error('❌ Error generating favicon:', error.message);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Generating PWA icons...\n');
  
  if (useSharp) {
    await generateWithSharp();
  } else if (useImageMagick) {
    generateWithImageMagick();
  }
  
  // Generate favicon
  await generateFavicon();
  
  console.log('\n✅ Icon generation complete!');
  console.log('\n📝 Next steps:');
  console.log('  1. Verify icons in the public/ directory');
  console.log('  2. Update manifest.json if needed (already configured)');
  console.log('  3. Test PWA installation on your device');
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
