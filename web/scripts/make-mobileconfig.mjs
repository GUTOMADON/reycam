// Builds ReyCam.mobileconfig: an iOS configuration profile with a Web Clip that
// puts ReyCam on the Home Screen with its icon and opens it full screen.
// Run: node scripts/make-mobileconfig.mjs [url]
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const web = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.argv[2] || 'https://gutomadon.github.io/reycam/';
const icon = (await sharp(join(web, 'assets', 'icon-only.png')).resize(400, 400).png().toBuffer()).toString('base64');

// Fixed identifiers so reinstalling replaces the old clip instead of adding a second icon.
const profileId = 'com.reycam.app.profile';
const clipUUID = 'B6F1C2A4-5E1D-4C3B-9A77-2F0E8D1C6A10';
const profileUUID = 'D3A9E7B2-1C4F-4E8A-8B65-7A2C9F0E1B34';

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>FullScreen</key><true/>
      <key>IgnoreManifestScope</key><false/>
      <key>Icon</key><data>${icon}</data>
      <key>IsRemovable</key><true/>
      <key>Label</key><string>ReyCam</string>
      <key>Precomposed</key><true/>
      <key>URL</key><string>${url}</string>
      <key>PayloadDescription</key><string>Adds ReyCam to the Home Screen.</string>
      <key>PayloadDisplayName</key><string>ReyCam</string>
      <key>PayloadIdentifier</key><string>${profileId}.webclip</string>
      <key>PayloadType</key><string>com.apple.webClip.managed</string>
      <key>PayloadUUID</key><string>${clipUUID}</string>
      <key>PayloadVersion</key><integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key><string>Installs the ReyCam photo and video editor on your Home Screen. It opens full screen like an app. Remove it any time in Settings → General → VPN &amp; Device Management.</string>
  <key>PayloadDisplayName</key><string>ReyCam</string>
  <key>PayloadIdentifier</key><string>${profileId}</string>
  <key>PayloadOrganization</key><string>ReyCam</string>
  <key>PayloadRemovalDisallowed</key><false/>
  <key>PayloadType</key><string>Configuration</string>
  <key>PayloadUUID</key><string>${profileUUID}</string>
  <key>PayloadVersion</key><integer>1</integer>
</dict>
</plist>
`;

for (const dir of [join(web, '..', 'docs', 'install'), join(web, 'public')]) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ReyCam.mobileconfig'), xml);
}
console.log('ReyCam.mobileconfig written for', url);
