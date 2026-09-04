# YouTube Music Visualizer Generator

Desktop and web software for creating YouTube-ready music visualizer videos from audio, cover art, reusable presets, and branded export settings.

## Current Direction

- Shared editor: React, TypeScript, Vite
- Desktop shell: Tauri
- Visualizer engine: Butterchurn with MilkDrop-compatible presets
- Desktop export: native FFmpeg
- Web export: backend workers running native FFmpeg

## Documents

- [SPEC.md](SPEC.md) - product and technical specification

## Local Development

Install dependencies and run the shared web editor:

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5180/`. Import an audio file through the Source panel, select a MilkDrop preset, and press Play to drive the Butterchurn preview.

The desktop wrapper uses the same editor. Install Rust and the Tauri prerequisites before running:

```powershell
npm run desktop:dev
```

The local test-audio path stays in ignored `local-samples.json`; use `local-samples.example.json` as its safe-to-commit format.
