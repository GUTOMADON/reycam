// Builds the native app icon and splash screen from the ReyCam logo.
// Output goes to web/assets, which @capacitor/assets turns into every iOS size.
// Run: node scripts/make-app-assets.mjs
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(out, { recursive: true });

// Same drawing as LogoMark in src/components/Logo.tsx. iOS rounds the corners
// itself, so the icon background fills the whole square.
const mark = (bg) => `
  ${bg ? '<rect width="64" height="64" fill="#6E1A35" />' : ''}
  <rect x="18" y="13" width="15" height="8" rx="3" fill="#F6E7D8" />
  <rect x="9" y="19" width="46" height="32" rx="9" fill="#F6E7D8" />
  <circle cx="32" cy="35" r="12.5" fill="#6E1A35" />
  <circle cx="32" cy="35" r="9.5" fill="#3A0B1B" />
  <path d="M34.5 25.5 L26.5 36.5 H31.5 L29.5 45 L38 33.5 H33 Z" fill="#FFC857" />
  <circle cx="47.5" cy="26" r="2.6" fill="#FFC857" />`;

const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 64 64">
  <defs><radialGradient id="g" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="#8A2444"/><stop offset="1" stop-color="#5A1229"/></radialGradient></defs>
  <rect width="64" height="64" fill="url(#g)" />
  <g transform="translate(4 4) scale(0.875)">${mark(false)}</g>
</svg>`;
await sharp(Buffer.from(icon)).flatten({ background: '#6E1A35' }).png().toFile(join(out, 'icon-only.png'));

const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <defs><radialGradient id="s" cx="50%" cy="45%" r="60%"><stop offset="0" stop-color="#3A0E1E"/><stop offset="1" stop-color="#0E0709"/></radialGradient></defs>
  <rect width="2732" height="2732" fill="url(#s)" />
  <g transform="translate(1046 1046) scale(10)">
    <rect width="64" height="64" rx="16" fill="#6E1A35" />${mark(false)}
  </g>
</svg>`;
for (const name of ['splash.png', 'splash-dark.png']) {
  await sharp(Buffer.from(splash)).png().toFile(join(out, name));
}
console.log('App icon and splash written to', out);
