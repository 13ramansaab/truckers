const fs = require('fs');
const path = require('path');

// This script will generate all required iOS icon sizes
// You'll need to manually create these icon files from your logo

console.log('iOS Icon Generation Script');
console.log('==========================');

const iconSizes = [
  { name: 'App-Icon-120x120@2x.png', size: '120x120', description: 'iPhone 2x (60x60)' },
  { name: 'App-Icon-180x180@3x.png', size: '180x180', description: 'iPhone 3x (60x60)' },
  { name: 'App-Icon-152x152@2x.png', size: '152x152', description: 'iPad 2x (76x76)' },
  { name: 'App-Icon-167x167@2x.png', size: '167x167', description: 'iPad Pro 2x (83.5x83.5)' }
];

const iconDir = path.join(__dirname, 'ios', 'boltexponativewind', 'Images.xcassets', 'AppIcon.appiconset');

console.log('\nRequired iOS Icon Files:');
console.log('------------------------');

iconSizes.forEach(icon => {
  const iconPath = path.join(iconDir, icon.name);
  if (fs.existsSync(iconPath)) {
    console.log(`✅ ${icon.name} (${icon.size}) - ${icon.description}`);
  } else {
    console.log(`❌ ${icon.name} (${icon.size}) - ${icon.description} - MISSING`);
  }
});

console.log('\nInstructions:');
console.log('1. Open your logo file (assets/images/icon.png)');
console.log('2. Create the following icon sizes:');
iconSizes.forEach(icon => {
  console.log(`   - ${icon.name}: ${icon.size} pixels`);
});
console.log('3. Save them in: ios/boltexponativewind/Images.xcassets/AppIcon.appiconset/');
console.log('4. Run this script again to verify all icons are present');
console.log('\nNote: You can use online tools like:');
console.log('- https://www.appicon.co/');
console.log('- https://makeappicon.com/');
console.log('- Or design software like Figma, Sketch, or Photoshop');
