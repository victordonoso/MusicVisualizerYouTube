# YouTube Music Visualizer Generator - Specification

## Objective

Build desktop software that turns an audio track plus user-selected visuals into a finished YouTube-ready music visualizer video.

Primary output:
- MP4 video
- 1920x1080 by default
- 30 or 60 FPS
- H.264 video codec
- AAC audio codec
- YouTube-safe bitrate and color profile

## Target Users

- Independent musicians
- YouTube music channels
- Beat producers
- DJs and labels
- Content creators who need repeatable branded visualizer videos

## Core Workflow

1. Import an audio file.
2. Choose a visualizer template.
3. Add cover art, logo, title, artist, and optional background media.
4. Adjust colors, waveform style, motion intensity, and layout.
5. Preview in real time.
6. Export a YouTube-ready MP4.

## MVP Features

### Audio Input

Supported formats:
- MP3
- WAV
- FLAC
- M4A

Audio analysis:
- Duration
- Waveform amplitude
- Frequency spectrum
- Beat/onset detection
- Loudness normalization preview

### Visualizer Templates

MVP templates:
- Circular spectrum around album art
- Horizontal waveform below cover art
- Full-screen bar spectrum
- Particle pulse background
- Minimal title and waveform layout

Template controls:
- Primary color
- Accent color
- Background color
- Glow intensity
- Motion intensity
- Smoothing
- Bar count or waveform detail
- Scale and position

### Media Assets

Supported image inputs:
- PNG
- JPG
- WEBP

Supported video background inputs:
- MP4
- MOV
- WEBM

Asset options:
- Static background image
- Blurred album-art background
- Looping video background
- Logo overlay
- Cover art crop mode: contain, cover, square

### Text

Editable fields:
- Song title
- Artist name
- Album or label
- Optional release date
- Optional call-to-action text

Typography:
- Font selector
- Font size
- Weight
- Alignment
- Color
- Text shadow toggle

### Preview

Preview requirements:
- Real-time playback when possible
- Play, pause, seek
- Current timestamp
- Visualizer reacts to audio
- Low-quality preview mode for slower machines

### Timeline And Preset Cues

- Display a decoded waveform with a seekable playhead.
- Allow visualizer preset changes at exact timestamps.
- Each cue has a user-editable musical-section name, such as `Intro`, `Chorus`, `Drop 1`, or `Outro`.
- Keep the cue name separate from its MilkDrop preset name; musical structure is the primary timeline label, while the preset remains an implementation detail in the cue inspector.
- Use compact cue markers as the default timeline representation. Reveal cue labels for selected or hovered markers, and show more labels only when timeline zoom and available spacing prevent collisions.

### Export

Export presets:
- YouTube 1080p, 30 FPS
- YouTube 1080p, 60 FPS
- YouTube Shorts, 1080x1920
- Square social, 1080x1080

Advanced export settings:
- Resolution
- FPS
- Video bitrate
- Audio bitrate
- Start/end trim
- Fade in/out

Default YouTube preset:
- Container: MP4
- Video: H.264
- Audio: AAC
- Resolution: 1920x1080
- FPS: 30
- Video bitrate: 12 Mbps
- Audio bitrate: 320 kbps

Primary export priority:
- Exact preview fidelity for the final YouTube output
- Stable 1080p render quality over maximum export speed
- Deterministic frame rendering so the exported MP4 matches the editor preview
- Speed optimizations are acceptable only when they do not visibly change the output

## Recommended Tech Stack

## Framework Decision

Primary framework choice for desktop plus web:
- Shared app UI: React with TypeScript
- Build tool: Vite
- Desktop shell: Tauri
- Web app: hosted React/Vite app with an export backend
- MVP visualizer engine: Butterchurn with MilkDrop-compatible presets
- Desktop encoding/export: native FFmpeg
- Web encoding/export: backend render workers using native FFmpeg

Reasoning:
- React and TypeScript keep the editor UI maintainable and allow the same editor to run in desktop and web builds.
- Vite keeps the shared browser app simple and portable.
- Tauri gives the desktop app local file access, native FFmpeg process control, and a smaller footprint than Electron.
- Butterchurn is open source, browser-native, WebGL-based, and directly supports MilkDrop-style music visualizer presets across desktop and web.
- MilkDrop-compatible preset ecosystems provide far more ready-made music visualizer looks than general animation frameworks.
- Native FFmpeg remains the best export layer for YouTube-ready MP4 output.
- Serious web exports should run on backend workers, not only in-browser WebAssembly, because browser FFmpeg is much slower and more memory constrained.

Alternative evaluated:
- Electron has the strongest desktop ecosystem and most consistent Chromium rendering, but it is heavier than Tauri and less attractive if web plus desktop portability is the goal.
- Remotion has excellent React-based video rendering, documentation, and community adoption, but its special commercial license makes it a weaker fit for a product that must prioritize open source from the start.
- Motion Canvas is open source and well documented, but it is more focused on programmed motion graphics and voice-over animations than preset-heavy music visualization.
- projectM is the best long-term native visualizer engine for maximum MilkDrop compatibility and large preset libraries, but it adds more native integration complexity than Butterchurn for an Electron MVP.

Decision:
- Use a shared React + TypeScript + Vite editor for both desktop and web.
- Use Tauri for the desktop version.
- Use Butterchurn as the MVP visualizer rendering framework.
- Use native FFmpeg locally in the desktop app.
- Use backend render workers with native FFmpeg for production-quality web exports.
- Keep projectM as a future advanced/native renderer option.
- Do not base the MVP on Remotion unless the licensing requirement changes.
- Keep Electron as a fallback desktop shell if Tauri's system WebView causes visualizer compatibility or frame-capture issues.

### Desktop And Web App

Recommended:
- React
- TypeScript
- Vite
- Tauri
- Native FFmpeg
- Backend FFmpeg render workers for web export

Reason:
- Fast UI development
- Cross-platform Windows/macOS/Linux builds
- Shared codebase for desktop and web editor UI
- Native desktop integration without shipping a full Chromium runtime
- Easy integration with FFmpeg on desktop
- Strong ecosystem for canvas/WebGL previews
- Browser-based preview support for the web version
- Backend rendering support for long audio tracks and high-bitrate YouTube exports

Decision:
- Build the editor as a shared web app first.
- Package the same editor into a Tauri desktop app.
- Use local rendering for desktop exports.
- Use server-side/backend rendering for web exports.
- Avoid relying on browser-only FFmpeg for full-length YouTube exports.

### Rendering

Preview renderer:
- Butterchurn WebGL renderer for MilkDrop-compatible templates
- HTML Canvas 2D for custom simple templates
- Three.js for custom advanced particle scenes

Final export renderer:
- Headless Chromium frame rendering
- FFmpeg for video/audio encoding

Audio analysis:
- Web Audio API for preview
- FFmpeg or Node audio analysis library for export consistency

Suggested libraries:
- `ffmpeg-static`
- `fluent-ffmpeg`
- `wavesurfer.js`
- `meyda`
- `butterchurn`
- `butterchurn-presets`
- `three`
- `zustand`
- `react-hook-form`

## Architecture

### Main Modules

`app-shell`
- Tauri desktop shell
- File access
- Export job management
- FFmpeg orchestration

`web-app`
- Hosted browser editor
- User projects and account flows
- Upload/download workflow
- Export job submission

`editor-ui`
- Timeline
- Controls
- Template customization
- Preview viewport

`audio-engine`
- Audio loading
- Waveform generation
- Spectrum analysis
- Beat detection

`render-engine`
- Canvas/WebGL scene rendering
- Template runtime
- Frame generation

`export-engine`
- Render frames
- Encode with FFmpeg
- Progress reporting
- Cancellation

`render-worker`
- Backend rendering for web exports
- Native FFmpeg execution
- Job queue integration
- Output validation

`project-store`
- Save/load projects
- Asset references
- Template parameters

## Project File Format

Use JSON for editable projects.

Example:

```json
{
  "version": 1,
  "audio": {
    "path": "song.wav",
    "normalize": false
  },
  "canvas": {
    "width": 1920,
    "height": 1080,
    "fps": 30
  },
  "template": {
    "id": "circular-spectrum",
    "settings": {
      "primaryColor": "#00E5FF",
      "accentColor": "#FF2E63",
      "barCount": 128,
      "glow": 0.65,
      "motion": 0.8
    }
  },
  "text": {
    "title": "Track Title",
    "artist": "Artist Name"
  },
  "assets": {
    "coverArt": "cover.png",
    "background": "background.mp4",
    "logo": "logo.png"
  }
}
```

## Reusable Templates

Users must be able to save customized templates as reusable presets.

Template preset requirements:
- Save visualizer settings independently from the current audio file
- Include colors, typography, layout, animation settings, and export aspect ratio
- Support duplicate, rename, delete, import, and export preset actions
- Store presets locally as JSON files
- Allow a saved preset to be applied to a new song project

Preset file example:

```json
{
  "version": 1,
  "name": "Neon Circle 1080p",
  "templateId": "circular-spectrum",
  "canvas": {
    "width": 1920,
    "height": 1080,
    "fps": 30
  },
  "settings": {
    "primaryColor": "#00E5FF",
    "accentColor": "#FF2E63",
    "barCount": 128,
    "glow": 0.65,
    "motion": 0.8
  },
  "textStyle": {
    "fontFamily": "Inter",
    "titleSize": 64,
    "artistSize": 36
  }
}
```

## Licensing And Watermarking

Commercial licensing and watermarking must be included from the start.

MVP licensing requirements:
- Free mode exports with a visible watermark
- Paid/commercial mode exports without watermark
- License state stored locally with room for future online activation
- Clear project-level flag showing whether the export is commercial-use enabled
- Export metadata should record app version, preset name, and license mode

Watermark requirements:
- Configurable default watermark position
- Watermark visible in free exports across 16:9, 9:16, and 1:1 formats
- Watermark must not cover primary title text or center artwork
- Paid mode must remove the watermark from exported video

## UI Layout

Primary screen:
- Left sidebar: templates and assets
- Center: live preview
- Right inspector: selected template controls
- Bottom: timeline, playback controls, export button

Required states:
- Empty project
- Importing media
- Audio analyzing
- Preview loading
- Exporting
- Export complete
- Export failed

## Export Pipeline

1. Validate project settings.
2. Decode or inspect source audio.
3. Generate cached audio analysis data.
4. Render video frames at target FPS.
5. Pipe frames into FFmpeg.
6. Mux original or normalized audio.
7. Encode MP4.
8. Verify output exists and duration matches source audio.
9. Verify output resolution, FPS, codec, audio codec, and watermark/license state.

## Quality Requirements

Performance:
- Preview should maintain 30 FPS on a mid-range laptop for simple templates.
- Export should support long tracks without loading all frames into memory.

Reliability:
- Export jobs must be cancelable.
- Failed exports must show actionable error messages.
- Missing assets must be detected before export starts.

YouTube compatibility:
- H.264 MP4
- Progressive scan
- Square pixels
- Rec.709 color
- AAC-LC audio

## Nice-To-Have Features

- Batch render multiple songs with the same template
- Saved brand presets
- Lyric captions
- Spotify Canvas style short loops
- Visualizer template marketplace
- GPU-accelerated final rendering
- Direct upload metadata export: title, description, tags
- Watermark-free paid export mode

## First Implementation Milestone

Deliver a local desktop prototype that can:

1. Import one audio file.
2. Import one cover image.
3. Display a circular spectrum visualizer in real time.
4. Edit title, artist, colors, and bar count.
5. Save and reuse one visualizer preset.
6. Export a 1920x1080 MP4 using FFmpeg.
7. Export a 1080x1920 Shorts MP4 using FFmpeg.
8. Apply a watermark in free mode and omit it in commercial mode.

## Suggested Folder Structure

```text
MusicVisualizerYouTube/
  SPEC.md
  README.md
  package.json
  apps/
    desktop/
      src-tauri/
      src/
        main.tsx
    web/
      src/
        main.tsx
    render-worker/
      src/
        exportJob.ts
        ffmpeg.ts
  packages/
    editor/
      App.tsx
      components/
      templates/
      stores/
      styles/
    shared/
      projectSchema.ts
      types.ts
  assets/
    presets/
    sample/
  output/
  tests/
```

## Open Decisions

Resolved decisions:
- App type: shared desktop and web app.
- Desktop shell: Tauri, with Electron kept as a fallback if WebView compatibility becomes a blocker.
- Web export: backend render workers with native FFmpeg, not browser-only FFmpeg for full-length videos.
- Export priority: exact preview fidelity and best 1080p YouTube output quality.
- Reusable templates: yes.
- Vertical Shorts output: yes, included in MVP.
- Commercial licensing/watermarking: yes, included from the start.
