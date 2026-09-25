const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'dist');
const destDir = path.resolve(__dirname, '..', 'desktop', 'dist');
const desktopDir = path.resolve(__dirname, '..', 'desktop');

console.log(`Copying built web assets from ${srcDir} to ${destDir}...`);

if (!fs.existsSync(srcDir)) {
  console.error(`Error: Source directory ${srcDir} does not exist. Run "npm run build" first.`);
  process.exit(1);
}

// Clean destination directory if it exists
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}

fs.mkdirSync(destDir, { recursive: true });
fs.cpSync(srcDir, destDir, { recursive: true });

// Ensure icon.png is copied
const srcPng = path.resolve(__dirname, '..', 'public', 'pwa-512x512.png');
const destPng = path.resolve(desktopDir, 'icon.png');
if (fs.existsSync(srcPng)) {
  fs.copyFileSync(srcPng, destPng);
  console.log('Synced icon.png (512x512) to desktop directory.');
}

console.log('Successfully prepared desktop assets for Windows executable packaging.');
