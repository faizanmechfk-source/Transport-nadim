const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'dist');
const destDir = path.resolve(__dirname, '..', 'desktop', 'dist');

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

console.log('Successfully prepared desktop/dist assets for Windows executable packaging.');
