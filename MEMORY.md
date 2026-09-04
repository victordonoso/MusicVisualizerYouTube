# Project Memory

## Product Decisions

- The editor is a shared React and TypeScript app, packaged for desktop with Tauri and delivered on the web with a server-side export path.
- Butterchurn and MilkDrop-compatible presets power the MVP preview renderer.
- YouTube export prioritizes deterministic preview fidelity and stable 1080p quality over maximum speed.
- Reusable templates, vertical Shorts output, and free/commercial watermarking are MVP requirements.

## Timeline Cues

- A timeline cue represents a musical section, not merely a renderer event.
- Give each cue a user-editable musical name such as `Intro`, `Chorus`, `Drop 1`, or `Outro`.
- Store the MilkDrop preset separately from the cue name and edit it in the cue inspector.
- Use compact markers as the default timeline representation. Reveal names on selected or hovered markers, and only render additional labels when zoom and available space prevent collisions.
