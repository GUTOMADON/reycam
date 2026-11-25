<div align="center">

<img src="web/public/icons/icon-192.png" width="88" alt="ReyCam app icon" />

# ReyCam

**A private, browser-based photo and video editor with film-inspired looks, collage tools, and Stories.**

[Open the web app](https://gutomadon.github.io/reycam/) ·
[Download the Android APK](https://github.com/GUTOMADON/reycam/releases/download/android-build-15/ReyCam.apk) ·
[Browse releases](https://github.com/GUTOMADON/reycam/releases)

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![WebGL2](https://img.shields.io/badge/WebGL2-GPU-990000)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8)
![License](https://img.shields.io/badge/license-MIT-7A1F3D)

</div>

---

## Overview

ReyCam edits photos and browser-supported videos on the device. Its WebGL2 renderer powers fast previews and camera-inspired looks; a separate Collage studio creates layered designs and multi-photo Stories.

The public web app is hosted on GitHub Pages:

**https://gutomadon.github.io/reycam/**

### Features

- Hundreds of film, vintage, flash, color, monochrome, and creative looks, with adjustable intensity.
- Photo controls for light, curves, color, HSL, grading, detail, grain, crop, frames, dates, and more.
- Video preview and export where the browser supports the required codecs.
- A Collage workspace with templates, subject cutouts, stickers, drawing tools, layers, and multi-photo Stories.
- JPEG, PNG, and WebP photo export; video export uses WebCodecs when available, with a browser-supported fallback.
- Installable PWA and Capacitor builds for Android and iOS.
- Interface translations for English, Portuguese, Spanish, Chinese, Hindi, and German.
- On-device rendering and segmentation; user media is not uploaded for editing.

## Screenshots and sample photo

The screenshots are regenerated from the running app with the same dog-and-guinea-pigs photo used by the mobile regression test: [`docs/screenshots/sample-photo.png`](docs/screenshots/sample-photo.png).

<img src="docs/screenshots/editor-desktop.png" alt="ReyCam desktop editor showing the dog-and-guinea-pigs sample photo" width="100%" />

| iPhone layout | Android layout |
| --- | --- |
| <img src="docs/screenshots/mobile-iphone.png" alt="ReyCam mobile editor on iPhone" /> | <img src="docs/screenshots/mobile-android.png" alt="ReyCam mobile editor on Android" /> |

Sample photo used for screenshots and mobile tests:

<img src="docs/screenshots/sample-photo.png" alt="A dog with guinea pigs" width="640" />

To regenerate the screenshots, start the Vite server and run `node tests/screenshots.mjs` from `web/`. The script uses the same `photo.jpg` fixture.

## Try it on a phone

### Web app / PWA

Open [the ReyCam web app](https://gutomadon.github.io/reycam/) over HTTPS:

- **iPhone/iPad:** open the link in Safari, tap **Share**, then **Add to Home Screen**.
- **Android:** open the link in Chrome and choose **Install app** or **Add to Home screen**.

### Android APK

Download the [current Android APK](https://github.com/GUTOMADON/reycam/releases/download/android-build-15/ReyCam.apk), open it on the phone, and allow installation from that browser or file manager when prompted. CI builds are debug-signed; Android may require uninstalling an older build before installing a newer one.

### iOS native build

The iOS workflow publishes an unsigned IPA in GitHub Releases. Installing it requires signing it for the device with a tool such as Sideloadly or AltStore; an IPA cannot be installed by tapping it in Safari.

## Run locally

### Requirements

- Node.js 20 or newer and npm.
- A current browser with WebGL2 for the photo and video editor.
- Python 3.9 or newer only if running the optional API.

### Frontend

```bash
git clone https://github.com/GUTOMADON/reycam.git
cd reycam/web
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`). The frontend can run without the Python API. To create a production build:

```bash
npm run build
npm run preview -- --host 127.0.0.1
```

GitHub Pages builds the app with the `/reycam/` base path automatically. For a different deployment path, pass the matching base to Vite, for example `npm run build -- --base=/my-app/`.

### Optional API

The FastAPI service is only needed for self-hosted deployments that want shared preset storage or a language hint. GitHub Pages serves the static frontend and does not provide these API routes.

From the repository root:

```bash
python -m pip install -r server/requirements.txt
python -m uvicorn main:app --app-dir server --host 127.0.0.1 --port 8000
```

The development server proxies `/api` to `http://localhost:8000`. The API reads supported language and country headers; it does not call an external geolocation service.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Health check |
| `GET` | `/api/locale` | Suggest a UI language from request headers |
| `GET` | `/api/presets` | Read shared edit presets |
| `PUT` | `/api/presets` | Replace the shared edit preset list |

Presets are stored in SQLite. The API does not receive image or video files.

### Docker

From the repository root:

```bash
docker build -t reycam .
docker run --rm -p 8000:8000 reycam
```

Open `http://127.0.0.1:8000`.

## Testing

The mobile browser tests use `docs/screenshots/sample-photo.png`, including checks across 360, 390, and 430 pixel viewports.

Start Vite in one terminal:

```bash
cd web
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Run the relevant checks from another terminal:

```bash
cd web
npm run build
npm run test:i18n
npm run test:mobile
npm run test:collage
npm run test:story
npm run test:library
```

`test:mobile`, `test:collage`, `test:story`, and the screenshot script use the local Vite server. The end-to-end suite is `npm run test:e2e`; see `web/tests/e2e.mjs` for its server configuration. API tests can be run with `python -m pytest server` after installing the server requirements and test dependencies.

Regenerate the README screenshots from the dog sample:

```bash
cd web
BASE=http://127.0.0.1:5173 node tests/screenshots.mjs
```

In PowerShell:

```powershell
cd web
$env:BASE = "http://127.0.0.1:5173"
node tests/screenshots.mjs
```

## Privacy and local storage

- Photo and video editing, previews, and exports run in the browser or installed app. The media files are not sent to the ReyCam API.
- The service worker caches application files for the PWA; it does not store imported photos.
- Preferences such as language and favorites are stored in browser `localStorage`.
- Collage drafts, including their source photos and masks, are saved in the browser's `IndexedDB` so drafts can be reopened on the same device. Clear the browser's site data to remove them.
- If the optional API is configured, it stores edit preset data in SQLite. GitHub Pages does not include that API.

## Project structure

```text
web/
  src/engine/       Photo/video rendering pipeline and look recipes
  src/collage/      Collage templates, Stories, layers, and renderer
  src/components/   React UI components and editing panels
  src/i18n/         Locale bundles
  public/           PWA assets, sample media, fonts, and segmentation model
  tests/            Browser tests, fixtures, and screenshot generator
server/             Optional FastAPI service and API tests
docs/install/       iOS Home Screen profile
docs/screenshots/   README screenshots
.github/workflows/  Pages, Android, and iOS build workflows
```

## Contributing

Keep pull requests focused and include tests for behavior changes. Update all supported locale bundles when adding UI text, and regenerate screenshots when the documented UI changes. Before submitting, run `npm run build` and the relevant browser tests. For API changes, also run `python -m pytest server`.

## License

ReyCam is licensed under the [MIT License](LICENSE). Bundled fonts and dependencies retain their respective licenses.
