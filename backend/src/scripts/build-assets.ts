
import fs from 'fs';
import path from 'path';

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

console.log('Assets copied successfully.');
