const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

// ── icon.png (1024x1024) ──
async function generateIcon() {
  const svg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff4d56"/>
      <stop offset="100%" stop-color="#c5252d"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="225" ry="225" fill="url(#bg)"/>
  <text x="512" y="520" text-anchor="middle" dominant-baseline="central"
        font-family="Arial,Helvetica,sans-serif" font-weight="bold"
        font-size="420" fill="white">AS</text>
  <text x="512" y="780" text-anchor="middle" dominant-baseline="central"
        font-family="Arial,Helvetica,sans-serif" font-weight="bold"
        font-size="90" fill="rgba(255,255,255,0.85)">AGAIN SCHOOL</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'icon.png'));

  console.log('✓ icon.png (1024x1024)');
}

// ── adaptive-icon.png (1024x1024 with 20% safe zone padding) ──
async function generateAdaptiveIcon() {
  const svg = `
<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" fill="#e8313a"/>
  <defs>
    <linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff4d56"/>
      <stop offset="100%" stop-color="#c5252d"/>
    </linearGradient>
  </defs>
  <g transform="translate(102,102) scale(0.8)">
    <rect width="1024" height="1024" rx="225" ry="225" fill="url(#bg2)"/>
    <text x="512" y="520" text-anchor="middle" dominant-baseline="central"
          font-family="Arial,Helvetica,sans-serif" font-weight="bold"
          font-size="420" fill="white">AS</text>
    <text x="512" y="780" text-anchor="middle" dominant-baseline="central"
          font-family="Arial,Helvetica,sans-serif" font-weight="bold"
          font-size="90" fill="rgba(255,255,255,0.85)">AGAIN SCHOOL</text>
  </g>
</svg>`;

  await sharp(Buffer.from(svg))
    .resize(1024, 1024)
    .png()
    .toFile(path.join(ASSETS_DIR, 'adaptive-icon.png'));

  console.log('✓ adaptive-icon.png (1024x1024, 20% padding)');
}

// ── splash.png (1284x2778) ──
async function generateSplash() {
  const svg = `
<svg width="1284" height="2778" xmlns="http://www.w3.org/2000/svg">
  <rect width="1284" height="2778" fill="#e8313a"/>
  <defs>
    <linearGradient id="iconBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ff4d56"/>
      <stop offset="100%" stop-color="#c5252d"/>
    </linearGradient>
  </defs>
  <!-- Center icon (300x300) -->
  <g transform="translate(492,1089)">
    <rect width="300" height="300" rx="66" ry="66" fill="url(#iconBg)"/>
    <text x="150" y="148" text-anchor="middle" dominant-baseline="central"
          font-family="Arial,Helvetica,sans-serif" font-weight="bold"
          font-size="123" fill="white">AS</text>
    <text x="150" y="224" text-anchor="middle" dominant-baseline="central"
          font-family="Arial,Helvetica,sans-serif" font-weight="bold"
          font-size="26" fill="rgba(255,255,255,0.85)">AGAIN SCHOOL</text>
  </g>
  <!-- App name -->
  <text x="642" y="1480" text-anchor="middle" dominant-baseline="central"
        font-family="Arial,Helvetica,sans-serif" font-weight="bold"
        font-size="56" fill="white">Again School</text>
  <!-- Slogan -->
  <text x="642" y="1545" text-anchor="middle" dominant-baseline="central"
        font-family="Arial,Helvetica,sans-serif"
        font-size="30" fill="rgba(255,255,255,0.7)">다시 만나는 우리들의 학교</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .resize(1284, 2778)
    .png()
    .toFile(path.join(ASSETS_DIR, 'splash.png'));

  console.log('✓ splash.png (1284x2778)');
}

async function main() {
  console.log('Generating assets...\n');
  await generateIcon();
  await generateAdaptiveIcon();
  await generateSplash();
  console.log('\nAll assets generated in:', ASSETS_DIR);
}

main().catch((err) => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
