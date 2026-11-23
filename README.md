<div align="center">

<img src="web/public/icons/icon-192.png" width="96" alt="ReyCam logo" />

# ReyCam

**Vintage cameras, film looks and pro edits for photos and videos, right in the browser.**

625 looks · 16 categories · GPU rendering with WebGL2 · Full resolution export · MP4 video with sound · Installable PWA · 6 languages

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![WebGL2](https://img.shields.io/badge/WebGL2-GPU-990000)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-5A0FC8)
![Tests](https://img.shields.io/badge/tests-Playwright%20%7C%20pytest-2EAD33)
![License](https://img.shields.io/badge/license-MIT-7A1F3D)

<img src="docs/screenshots/editor-desktop.png" alt="ReyCam editor on desktop" width="100%" />

</div>

---

## Contents

- [Highlights](#highlights)
- [Screenshots](#screenshots)
- [Looks](#looks)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Testing](#testing)
- [API](#api)
- [Privacy](#privacy)
- [Project layout](#project-layout)
- [Roadmap](#roadmap)
- [License](#license)

## Highlights

- **On device and private.** Every pixel is processed on the GPU of the user's device. Photos and videos are never uploaded.
- **625 looks in 16 categories** (every category has at least 39, Y2K has 50), including the new **Moody** category led by **Mirror Mood** (dark cinematic teal shadows with warm natural skin, fitted to a reference photo) and a **Black and White** category. Looks span film, Y2K, indie, flash, film simulations, low light, nature, yellow, green, wine and more. Each look has an intensity slider, and at 0% it matches the original.
- **Pro adjustments.** Light, parametric tone curve, color, 8 band HSL mixer, three way color grading, clarity, dehaze, sharpen, grain, bloom, light leaks, dust, chromatic shift, scanlines, glitch and lo fi pixels.
- **Camera details.** 10 frames (instant, film strip, slide mount, half frame, 8mm, cinema bars), date stamp in 4 formats and 5 colors, VHS, camcorder and CCTV overlays, double exposure.
- **"No date" everywhere.** A one tap option, plus a remembered setting for people who never want a date, even on looks that ship with one.
- **Instant preview.** The preview redraws in the same frame as the slider moves, and drops resolution only while dragging on slow GPUs.
- **Export.** JPEG, PNG or WebP at full resolution. MP4 (H.264 and AAC) processed frame by frame with WebCodecs, with a real time recorder fallback for older browsers.
- **Favorites, presets and workflow.** Heart any look, save your own presets, copy and paste edits, undo and redo, and hold to compare.
- **Automatic language.** Follows the phone or browser language, then a server hint, and can always be changed by hand. English, Portuguese, Spanish, Mandarin, Hindi and German are fully translated, and right to left layouts work for Arabic, Hebrew, Persian and Urdu.
- **iPhone formats.** HEIC and HEIF photos open everywhere: Safari decodes them natively and other browsers convert them on the device to a full quality JPEG (with the photo's rotation). iPhone `.mov` videos open wherever the device can play HEVC, with a clear tip when it cannot.
- **Built for phones.** A welcome screen, three big bottom buttons (Filters, Edit, Upload) that open full screen pages, a quick filters strip, one tap shortcuts, sliders docked under the photo, and support for iPhone notches and Android gesture bars.
- **Installable PWA** with an offline app shell.

## Screenshots

### Welcome screen

The app opens on a home screen with a floating collage of looks, a short pitch and two buttons: **Choose photo or video** or **Try with a sample**. Tapping the ReyCam logo in the editor brings it back.

<table>
<tr>
<td width="70%"><img src="docs/screenshots/welcome-desktop.png" alt="Welcome screen on desktop" /></td>
<td width="30%"><img src="docs/screenshots/mobile-iphone-welcome.png" alt="Welcome screen on iPhone" /></td>
</tr>
</table>

### Phone app (iOS and Android)

On phones the editor works like a native photo app: the photo gets the space, with three big buttons at the bottom (**Filters**, **Edit**, **Upload**). Each button opens its own full screen page. The home view also has a **Quick filters** strip and **shortcuts** (Auto, Light, Color, Crop, Frame, Date).

<table>
<tr>
<td width="25%"><img src="docs/screenshots/mobile-iphone.png" alt="Phone editor on iPhone" /><br/><sub>Editor (iPhone)</sub></td>
<td width="25%"><img src="docs/screenshots/mobile-iphone-filters.png" alt="Filters page" /><br/><sub>Filters page: every look previewed on your photo, categories on top</sub></td>
<td width="25%"><img src="docs/screenshots/mobile-iphone-edit.png" alt="Edit page" /><br/><sub>Edit page: pick a tool</sub></td>
<td width="25%"><img src="docs/screenshots/mobile-iphone-tool.png" alt="Light tool docked under the photo" /><br/><sub>Sliders docked under the photo, with Done</sub></td>
</tr>
<tr>
<td width="25%"><img src="docs/screenshots/mobile-iphone-upload.png" alt="Upload page" /><br/><sub>Upload page: photo, video or camera</sub></td>
<td width="25%"><img src="docs/screenshots/mobile-android.png" alt="Phone editor on Android" /><br/><sub>Editor (Android, Pixel 7)</sub></td>
<td width="50%" colspan="2"><img src="docs/screenshots/looks-grid.png" alt="Original and five looks" /><br/><sub>Top: Original, CCD 2003, Indie Sleaze. Bottom: Red Wine, Instant Flash (instant frame), VHS Tape (overlay).</sub></td>
</tr>
</table>

| Date panel with color and "Never add a date" | Compact category menu with favorites |
| --- | --- |
| <img src="docs/screenshots/date-panel.png" alt="Date panel" /> | <img src="docs/screenshots/categories.png" alt="Categories" width="320" /> |

| Export dialog | Black and white look |
| --- | --- |
| <img src="docs/screenshots/export-dialog.png" alt="Export dialog" /> | <img src="docs/screenshots/look-mono.png" alt="Mono 400 look" /> |

> Screenshots are captured from the running app with Playwright. The welcome, phone and desktop editor shots use [`docs/screenshots/sample-photo.png`](docs/screenshots/sample-photo.png) as the uploaded photo. The older look and panel shots come from [`web/tests/screenshots.mjs`](web/tests/screenshots.mjs).

## Looks

| Group | Examples |
| --- | --- |
| Film | Daily Classic, CP 35, NE 135, SR 135, Golf Pastel, KV 88, S 67, D Expired, 1998, CT 2F, Nostalgia, Hoga, Sprocket, Okak, FQS, Pola I, Inst Mini, Mono 400, Medium 120, Dispo 27 |
| Indie | Indie Sleaze, Indie Core, Overblown, Flash 2020, Blown Out, Bad Flash, Pink Blowout, Webcam 2020, Tumblr 2014, Bedroom Pop, Grunge 90 |
| Y2K | Y2K Flash, CCD Blue, CCD 2003, Glow Party, Digi 2000, Phone 2010, Myspace |
| Simulations | Vivid 50, Standard 100, Soft Portrait, Chrome Calm, Super Neg, Amber Neg, Cine Soft, Bleach, Fine Mono, True Color |
| Yellow | Honey, Sunflower, Amber 70, Lemon Pastel, Summer Sun, Mustard |
| Green | Emerald, Cold Forest, Mint, Retro Olive, Drugstore Green, Neon Green |
| Wine | Red Wine, Bordeaux, Cherry Noir, Rose, Merlot Film, Velvet |
| Flash, Low light, Nature, Colors, Video, Extras | Paparazzi, Neon Noir, Golden Hour, Ultra Violet, VHS Tape, Super 8, Fisheye, Prism, Night Vision and more |

Look names are original. Several looks are inspired by classic film stocks and popular retro camera apps, without using their names or logos.

## Architecture

```mermaid
flowchart LR
  subgraph Browser["Browser or installed PWA (all media stays here)"]
    UI["React UI<br/>App, Library, Panels"] -->|EditState| PIPE["Pipeline<br/>pipeline.ts"]
    PIPE -->|uniforms| GL["GLRenderer<br/>WebGL2 shaders"]
    GL -->|GPU canvas| PIPE
    PIPE -->|"2D pass: leaks, dust,<br/>glitch, date, frames"| OUT["Preview canvas"]
    PIPE --> EXP["Export<br/>JPEG / PNG / WebP"]
    PIPE --> VID["videoExport.ts<br/>WebCodecs + mp4-muxer"]
    UI <--> I18N["i18n<br/>6 languages + RTL"]
    UI <--> LS[("localStorage<br/>favorites, presets,<br/>language, no date")]
    SW["Service worker<br/>offline shell"]
  end
  subgraph Server["FastAPI server"]
    STATIC["Static app<br/>web/dist"]
    API["/api/health<br/>/api/presets<br/>/api/locale"]
    DB[("SQLite")]
    API --> DB
  end
  UI -- "presets sync, locale hint" --> API
  Browser -- "loads app" --> STATIC
```

### Render pipeline

```mermaid
flowchart TD
  SRC["Source frame<br/>(image or video)"] --> TEX["Upload to texture<br/>(once per photo, per frame for video)"]
  TEX --> BLUR{"Clarity or bloom on?"}
  BLUR -- yes --> B["Downscaled blur passes<br/>(1/6 resolution)"]
  BLUR -- no --> MAIN
  B --> MAIN["Main shader<br/>geometry, softness, skin smoothing, sharpen,<br/>tone, curve, white balance, HSL, split tone,<br/>grading, duotone, bloom, grain, scanlines, vignette"]
  MAIN --> NEED{"Needs a 2D pass?<br/>(leak, dust, glitch, flicker, date)"}
  NEED -- no --> FRAME["Frame composer"]
  NEED -- yes --> TWO["2D canvas pass"] --> FRAME
  FRAME --> DONE["Preview / export canvas"]
```

**Key ideas**

- Every look is a *recipe*: plain numbers on the same scale as the user sliders. Effective value = recipe value × intensity + user edit, so looks and manual edits always combine predictably.
- The preview and the exports share one pipeline. Only the output size changes, so what you see is what you export.
- Video export seeks each source frame, renders it at full resolution and encodes it with its exact timestamp, so slow devices never drop frames. Audio is copied from the original file.

## Getting started

### Option 1: Python only (prebuilt app included)

Requires Python 3.9 or newer.

```bash
cd server
pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

Open http://localhost:8000. Windows: double click `start.bat`. macOS or Linux: run `./start.sh`.

### Option 2: Docker

```bash
docker build -t reycam .
docker run -p 8000:8000 reycam
```

### Option 3: Develop the frontend

Requires Node.js 18 or newer.

```bash
cd web
npm install
npm run dev        # hot reload on http://localhost:5173, proxies /api to port 8000
npm run build      # checks translations, type checks and writes web/dist
```

### Android app (APK)

[`.github/workflows/android-apk.yml`](.github/workflows/android-apk.yml) builds **`ReyCam.apk`** on every push and attaches it to the latest **Android build** release. Open the APK on the phone, allow **Install unknown apps** for the browser or file manager, and install. Exports are saved to a **ReyCam** album in the gallery.

### iPhone profile (`.mobileconfig`)

[`docs/install/ReyCam.mobileconfig`](docs/install/ReyCam.mobileconfig) (also on the release and at `https://gutomadon.github.io/reycam/ReyCam.mobileconfig`) is an iOS configuration profile that adds ReyCam to the Home Screen with its icon, full screen. Open it in Safari, then go to **Settings → Profile Downloaded → Install**. It needs no computer and no Apple ID, never expires, and can be removed in **Settings → General → VPN & Device Management**. Regenerate it with `cd web && node scripts/make-mobileconfig.mjs [url]`.

### Install on iPhone from a link (recommended)

The app is published on GitHub Pages by [`.github/workflows/pages.yml`](.github/workflows/pages.yml) on every push: **https://gutomadon.github.io/reycam/**

1. Open the link in **Safari** on the iPhone (not Chrome).
2. Tap **Share** → **Add to Home Screen** → **Add**.

ReyCam gets its own icon, opens full screen like a native app, works offline after the first visit, and never expires. Share the same link with anyone to let them install it.

### Install on iPhone as a native app (IPA, no App Store)

An `.ipa` cannot be installed by tapping it on the iPhone: iOS only installs apps signed for that device. Use a computer and the steps below.

Every push to `main` runs [`.github/workflows/ios-ipa.yml`](.github/workflows/ios-ipa.yml) on a macOS runner. It builds the Capacitor iOS app with the ReyCam logo as the app icon, and publishes an unsigned **`ReyCam.ipa`** on the [Releases page](../../releases). In the native app, **Export saves photos and videos straight to the Photos gallery**.

1. Download `ReyCam.ipa` from the latest **iOS build** release.
2. Install [Sideloadly](https://sideloadly.io) on Windows or macOS (iTunes or Apple Devices must be installed on Windows), plug in the iPhone, drop the IPA in and sign in with your Apple ID.
3. On the iPhone, trust your Apple ID in **Settings → General → VPN & Device Management**, and on iOS 16 or later turn on **Settings → Privacy & Security → Developer Mode**.

With a free Apple ID the app has to be reinstalled every 7 days (AltStore can refresh it automatically). A paid Apple Developer account removes the limit and allows TestFlight.

To regenerate the icon and splash after changing the logo: `cd web && node scripts/make-app-assets.mjs`.

### Install on a phone

Phones need HTTPS for the gallery picker and file export (localhost is exempt on computers). Deploy the server behind HTTPS, or test with a tunnel such as `cloudflared tunnel --url http://localhost:8000`, then use **Add to Home Screen** (iOS Safari) or **Install app** (Android Chrome).

## Look lab

`web/tests/lab/run.mjs` renders looks with the real pipeline in Chromium:

```bash
npm run lab:counts
```
Shows how many looks each category has.

```bash
npm run test:looks
```
Fails when two looks have almost identical thumbnails.

```bash
npm run lab:mirror
```
Shows how close each Moody look is to the Mirror Mood reference (mean delta E per pixel).

HEIC photos open in every browser: Safari decodes them natively and other browsers load `heic-to` (LGPL-3.0) on demand.

## Testing

| Suite | Command | What it covers |
| --- | --- | --- |
| Translations | `cd web && npm run test:i18n` | Fails if any UI string or look description is missing in pt, es, zh, hi or de |
| API | `python -m pytest server` | Health, presets round trip, invalid payloads (400 and 413), `/api/locale` variants and country header |
| End to end | `cd web && npm run test:e2e` | Opening media (button, drag and drop, paste, JPEG, PNG, WebP, MP4, MOV, invalid file, HEIC), every look on a photo and a video, intensity, every panel and slider, undo and redo, presets, photo and video export checked with ffprobe, playback, "No date", automatic language, phone and desktop layouts, PWA, accessibility and console |
| Date color | `cd web && node tests/date-color.test.mjs` | Reads the pixels of the date for every color in the preview, the photo export and the video export, on desktop, iPhone and Android profiles |
| Screenshots | `cd web && node tests/screenshots.mjs` | Regenerates the images in `docs/screenshots` |

The browser suites use Playwright with the installed Chrome (`CHANNEL=chrome`) and expect the server on `http://localhost:8010` (change it with `BASE`). Test media is generated with ffmpeg into `web/tests/fixtures`.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/locale` | Suggested UI language from `Accept-Language` and an optional CDN country header (`CF-IPCountry`, `X-Vercel-IP-Country`, `CloudFront-Viewer-Country` and others). No external geolocation service is used |
| GET | `/api/presets` | List saved presets |
| PUT | `/api/presets` | Replace the saved preset list. Validates shape, at most 500 presets and 2 MB per request |

Presets are stored in SQLite (`server/reycam.db`, change with `REYCAM_DB`). There are no user accounts yet, so one server holds one shared preset list. Add authentication or per device IDs before exposing it to many users.

## Privacy

- Photos and videos are processed locally and never sent to the server.
- The server only stores presets (edit settings, no images) and reads request headers to suggest a language.
- Favorites, language and the "No date" setting live in the browser's localStorage.

## Project layout

```
web/                    React + TypeScript + Vite app (PWA)
  src/engine/           WebGL2 renderer, pipeline, recipes, video exporter
  src/components/       Library (looks, favorites, categories), panels, logo
  src/i18n/locales/     en, pt, es, zh, hi, de
  public/               icons, manifest, service worker, fonts, sample photo
  tests/                Playwright suites, i18n test, fixtures
  dist/                 prebuilt app served by the server
server/                 FastAPI app, API tests
docs/screenshots/       README images
Dockerfile
```

## Roadmap

- 3D LUT (.cube) support and LUT based film looks
- Live camera mode with real time looks
- Faster video export with WebCodecs decoding
- Per device private presets and optional accounts
- Social presets (Stories, Reels, feed) with safe area guides
- Batch editing, local adjustments, point tone curve, live histogram
- Native packaging with Capacitor for iOS and Android

## License

Code: [MIT](LICENSE).

Fonts: Inter, Space Grotesk and VT323 under the SIL Open Font License, bundled from Fontsource. MP4 muxing by [mp4-muxer](https://github.com/Vanilagy/mp4-muxer) (MIT).

The showcase photo in the screenshots and tests is an illustrative image provided by the project owner for demonstration. The posters and artwork visible in it belong to their respective owners and are not part of this project.
