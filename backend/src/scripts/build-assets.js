
const fs = require('fs');
const path = require('path');

const srcDir = path.join(process.cwd(), 'public');
const destDir = path.join(process.cwd(), 'dist', 'public');

console.log(`Copying assets from ${srcDir} to ${destDir}...`);

if (!fs.existsSync(srcDir)) {
    console.error(`Source directory ${srcDir} does not exist!`);
    process.exit(1);
}

if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

fs.cpSync(srcDir, destDir, { recursive: true });

// Create version.txt
const versionFile = path.join(destDir, 'version.txt');
fs.writeFileSync(versionFile, `Deployed: ${new Date().toISOString()}`);

console.log('Assets copied successfully.');
