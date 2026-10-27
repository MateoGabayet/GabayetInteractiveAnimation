# Gabayet Live Visual Studio

A Next.js performance studio using 2,813 of Mateo Gabayet's processed stencil SVGs.

## Run

`npm ci` then `npm run dev`. Visit `/gallery`. `npm run build` creates the production build.

## Features

- Browse/search/shuffle the processed archive. Each tile has a colour fill; choose a colour and add three independently coloured forms to the stage.
- VJ controls: speed, rotation, size, opacity, density, auto-spawn rate, background and warm/cool/full-spectrum random palettes. Forms expire after 15 minutes. Stage caps are 1,200 desktop / 240 mobile; default density is deliberately lower.
- Microphone audio is analysed locally with Web Audio (volume and low-frequency energy). Enable explicitly with the microphone button. This is energy response, not BPM estimation.
- Canvas video recording: 30 fps, WebM or MP4 according to browser support. Microphone audio is included only when already enabled at recording start. Finish with Stop & download. Navigating back to the archive stops the recording.
- Save up to 20 named compositions in browser localStorage. Export/import JSON for portable backups. Imported values, colours, asset identifiers and shape limits are validated.
- Live audience participation: start Audience QR on the host Stage, scan from another device, choose a form and send it. PeerJS Cloud supplies WebRTC signalling. Keep the host open; no durable room/server/database is needed. Some restrictive networks require the same Wi-Fi or a hotspot. Host can pause/end contributions, and input is validated and rate-limited per connection. Microphone audio is never transmitted to guests.

## Assets

`public/stencils/*.svg.gz` contains gzip-compressed SVG files; `lib/stencils.json` is the catalogue. The browser decompresses the files with DecompressionStream, rasterizes the original vector paths and applies per-instance colour. Closed path geometry and transforms are preserved; outline-only fills are restored to black before tinting. Original source files are unchanged. Loading is on demand, with bounded caches; SVGs are not all loaded up front.

The preparation script accepts the processed SVG source directory as an argument. It is not needed at runtime. Existing legacy SVG directories are retained only as historical source, and are no longer used by the gallery.

## Validation

`node --experimental-strip-types --test tests/scene.test.mjs` covers bounce behaviour, audio response, per-shape colours, import round-trips, invalid payloads and caps. Run `npm run build` for type and production route checks.
