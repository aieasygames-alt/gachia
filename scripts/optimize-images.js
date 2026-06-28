#!/usr/bin/env node

/**
 * Image optimization script for Gachia project
 * Converts large PNG images to WebP format and compresses them
 *
 * Usage: node scripts/optimize-images.js
 */

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const PUBLIC_DIR = join(process.cwd(), 'apps', 'web', 'public');

// Target images that need optimization
const TARGET_IMAGES = [
  'images/logo.png', // 1.3MB → target <50KB
  'images/og/genshin.png', // 2.1MB → target <100KB
  'images/og/starrail.png', // 2.1MB → target <100KB
  'images/og/wuwa.png', // 2.1MB → target <100KB
  'images/og/nte.png', // 2.1MB → target <100KB
  'images/og/zzz.png', // 2.1MB → target <100KB
  'images/og/guihuan.png', // 2.1MB → target <100KB
  'images/og/ananta.png', // 2.1MB → target <100KB
  'images/og/endfield.png', // 2.1MB → target <100KB
  'images/og/sea.png', // 2.1MB → target <100KB
];

function getFileSize(filePath) {
  try {
    const stats = statSync(filePath);
    return (stats.size / 1024).toFixed(2); // Return size in KB
  } catch {
    return 'N/A';
  }
}

function checkImageMagick() {
  try {
    execSync('convert -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkSharp() {
  try {
    require('sharp');
    return true;
  } catch {
    return false;
  }
}

async function optimizeWithSharp() {
  const sharp = require('sharp');

  console.log('🔧 Optimizing images with Sharp...\n');

  for (const imagePath of TARGET_IMAGES) {
    const fullPath = join(PUBLIC_DIR, imagePath);
    const originalSize = getFileSize(fullPath);

    try {
      const image = sharp(fullPath);
      const metadata = await image.metadata();

      // Convert to WebP with quality 85
      const outputPath = fullPath.replace('.png', '.webp');

      await image
        .webp({ quality: 85 })
        .toFile(outputPath);

      const newSize = getFileSize(outputPath);
      const reduction = ((1 - parseFloat(newSize) / parseFloat(originalSize)) * 100).toFixed(1);

      console.log(`✅ ${imagePath}`);
      console.log(`   ${originalSize}KB → ${newSize}KB (${reduction}% reduction)`);
      console.log(`   Output: ${outputPath.replace(PUBLIC_DIR, '')}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Failed to optimize ${imagePath}:`, error.message);
    }
  }
}

async function optimizeWithImageMagick() {
  console.log('🔧 Optimizing images with ImageMagick...\n');

  for (const imagePath of TARGET_IMAGES) {
    const fullPath = join(PUBLIC_DIR, imagePath);
    const originalSize = getFileSize(fullPath);
    const outputPath = fullPath.replace('.png', '.webp');

    try {
      // Convert PNG to WebP with quality 85
      execSync(`convert "${fullPath}" -quality 85 "${outputPath}"`, { stdio: 'ignore' });

      const newSize = getFileSize(outputPath);
      const reduction = ((1 - parseFloat(newSize) / parseFloat(originalSize)) * 100).toFixed(1);

      console.log(`✅ ${imagePath}`);
      console.log(`   ${originalSize}KB → ${newSize}KB (${reduction}% reduction)`);
      console.log(`   Output: ${outputPath.replace(PUBLIC_DIR, '')}`);
      console.log('');
    } catch (error) {
      console.error(`❌ Failed to optimize ${imagePath}:`, error.message);
    }
  }
}

function generateReport() {
  console.log('\n📊 Current Image Sizes Report:\n');
  console.log('Image | Current Size | Target Size | Status');
  console.log('------|-------------|-------------|-------');

  for (const imagePath of TARGET_IMAGES) {
    const fullPath = join(PUBLIC_DIR, imagePath);
    const size = getFileSize(fullPath);
    const target = imagePath.includes('logo') ? '<50KB' : '<100KB';
    const status = parseFloat(size) < 50 ? '✅' : '⚠️ ';

    console.log(`${imagePath.replace('images/', '')} | ${size}KB | ${target} | ${status}`);
  }
}

async function main() {
  console.log('🖼️  Gachia Image Optimization Script\n');
  console.log('This script will optimize large PNG images and convert them to WebP format.\n');

  generateReport();

  const hasSharp = checkSharp();
  const hasImageMagick = checkImageMagick();

  if (!hasSharp && !hasImageMagick) {
    console.error('❌ Error: Neither Sharp nor ImageMagick is available.');
    console.error('Please install one of the following:');
    console.error('  npm install sharp  # For Node.js optimization');
    console.error('  brew install imagemagick  # For macOS');
    console.error('  apt-get install imagemagick  # For Ubuntu/Debian');
    process.exit(1);
  }

  if (hasSharp) {
    await optimizeWithSharp();
  } else if (hasImageMagick) {
    await optimizeWithImageMagick();
  }

  console.log('✨ Image optimization complete!');
  console.log('\nNext steps:');
  console.log('1. Update imports in your code to use .webp files');
  console.log('2. Test that all images load correctly');
  console.log('3. Remove the original .png files if everything works');
}

main().catch(console.error);