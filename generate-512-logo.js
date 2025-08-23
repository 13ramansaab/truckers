const fs = require('fs');
const path = require('path');

// This script will generate a 512x512 logo from the SVG
// You'll need to use an online SVG to PNG converter or design tool
// to create the 512x512 logo.png file

console.log('Logo generation script');
console.log('Please convert the SVG logo to 512x512 PNG format');
console.log('and save it as: assets/images/icon.png');

// Check if the logo file exists
const logoPath = path.join(__dirname, 'assets', 'images', 'icon.png');
if (fs.existsSync(logoPath)) {
  console.log('✅ Logo file exists:', logoPath);
} else {
  console.log('❌ Logo file not found:', logoPath);
  console.log('Please create a 512x512 PNG logo and save it as icon.png in the assets/images folder');
}
