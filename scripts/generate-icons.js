// Generate PWA icons using Canvas API
// Run with: node scripts/generate-icons.js

const fs = require('fs');
const path = require('path');

// Simple SVG to use as base
const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4ECDC4;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3db8b0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#grad)" rx="80"/>
  <circle cx="256" cy="200" r="80" fill="white" opacity="0.9"/>
  <rect x="176" y="280" width="160" height="120" fill="white" opacity="0.9" rx="20"/>
  <text x="256" y="360" font-size="80" text-anchor="middle" fill="#4ECDC4" font-family="system-ui, -apple-system, sans-serif" font-weight="bold">$</text>
</svg>
`.trim();

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Write SVG files that can be converted to PNG
fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

console.log('✅ Generated icon.svg');
console.log('');
console.log('To generate PNG files, you can:');
console.log('1. Use an online converter like https://cloudconvert.com/svg-to-png');
console.log('2. Use ImageMagick: convert -background none -resize 192x192 public/icon.svg public/pwa-192x192.png');
console.log('3. Use ImageMagick: convert -background none -resize 512x512 public/icon.svg public/pwa-512x512.png');
console.log('4. Use the provided SVG as favicon by renaming to favicon.svg');
console.log('');
console.log('For now, creating placeholder files...');

// Create placeholder HTML files that browsers can use
const placeholder192 = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Icon</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;background:#4ECDC4;width:192px;height:192px;">
<div style="font-size:120px;">💰</div>
</body></html>`;

const placeholder512 = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Icon</title></head>
<body style="margin:0;display:flex;align-items:center;justify-content:center;background:#4ECDC4;width:512px;height:512px;">
<div style="font-size:320px;">💰</div>
</body></html>`;

// For immediate use, create SVG versions
const svg192 = svgContent.replace('512', '192').replace('80"', '30"').replace('font-size="80"', 'font-size="60"');
const svg512 = svgContent;

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.svg'), svg192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.svg'), svg512);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svg512);

console.log('✅ Created SVG icon files (pwa-192x192.svg, pwa-512x512.svg, favicon.svg)');
console.log('✅ Browsers will use these until PNG versions are generated');

// Made with Bob
