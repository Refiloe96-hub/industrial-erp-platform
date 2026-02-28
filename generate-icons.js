// Icon Generator Script
// Generates placeholder PWA icons to fix 404 errors
const fs = require('fs');
const path = require('path');

const ICON_DIR = path.join(__dirname, 'public', 'icons');
const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Minimal 1x1 pixel blue PNG base64
// Ideally, replace these files with proper branded icons later
const BASE64_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const BUFFER = Buffer.from(BASE64_PNG, 'base64');

console.log('Generating placeholder icons...');
console.log('Location: public/icons/');

if (!fs.existsSync(ICON_DIR)) {
    fs.mkdirSync(ICON_DIR, { recursive: true });
}

SIZES.forEach(size => {
    const filename = `icon-${size}.png`;
    const filepath = path.join(ICON_DIR, filename);
    if (!fs.existsSync(filepath)) {
        fs.writeFileSync(filepath, BUFFER);
        console.log(`✅ Created ${filename}`);
    } else {
        console.log(`ℹ️  ${filename} exists, skipping`);
    }
});

console.log('Done! Icons are ready for PWA.');
