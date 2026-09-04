import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import butterchurn from "butterchurn";
import butterchurnPresets from "butterchurn-presets";
import { AspectRatio, LicenseMode, outputProfiles } from "@visualizer/shared";

const savedTemplatesKey = "signal-frame.templates";

type SavedTemplate = {
  id: string;
  name: string;
  presetName: string;
  accent: string;
  output: AspectRatio;
};

type PresetMarker = {
  id: string;
  time: number;
  presetName: string;
};

const presetEntries = Object.entries(butterchurnPresets.getPresets());
const defaultPreset = presetEntries.find(([name]) => name.includes("Geiss")) ?? presetEntries[0];

function getSavedTemplates(): SavedTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(savedTemplatesKey) ?? "[]") as SavedTemplate[];
  } catch {
    return [];
  }
}

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  return `${minutes}:${Math.floor(safeSeconds % 60).toString().padStart(2, "0")}`;
}

async function readWaveform(file: File) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const channel = decoded.getChannelData(0);
    const samples = 180;
    const blockSize = Math.max(1, Math.floor(channel.length / samples));
    return Array.from({ length: samples }, (_, index) => {
      let peak = 0;
      const start = index * blockSize;
      const end = Math.min(start + blockSize, channel.length);
      for (let sample = start; sample < end; sample += 1) peak = Math.max(peak, Math.abs(channel[sample]));
      return peak;
    });
  } finally {
    await context.close();
  }
}

export function EditorApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const visualizerRef = useRef<ReturnType<typeof butterchurn.createVisualizer> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const activeMarkerRef = useRef<string | null>(null);
  const [audioName, setAudioName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [presetName, setPresetName] = useState(defaultPreset?.[0] ?? "");
  const [accent, setAccent] = useState("#24d7a4");
  const [title, setTitle] = useState("True Self");
  const [artist, setArtist] = useState("pbasiq");
  const [output, setOutput] = useState<AspectRatio>("youtube");
  const [license, setLicense] = useState<LicenseMode>("free");
  const [templates, setTemplates] = useState<SavedTemplate[]>(getSavedTemplates);
  const [notice, setNotice] = useState("Import an audio file to begin.");
  const [waveform, setWaveform] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [presetMarkers, setPresetMarkers] = useState<PresetMarker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => presetEntries.find(([name]) => name === presetName) ?? defaultPreset,
    [presetName],
  );
  const selectedMarker = presetMarkers.find((marker) => marker.id === selectedMarkerId) ?? null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedPreset) return;

    const context = audioContextRef.current ?? new AudioContext();
    audioContextRef.current = context;
    const visualizer = butterchurn.createVisualizer(context, canvas, { width: canvas.width, height: canvas.height });
    visualizer.loadPreset(selectedPreset[1], 0);
    visualizerRef.current = visualizer;

    const render = () => {
      visualizerRef.current?.render();
      animationRef.current = requestAnimationFrame(render);
    };
    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedPreset) visualizerRef.current?.loadPreset(selectedPreset[1], 1.2);
  }, [selectedPreset]);

  function loadPreset(name: string, blendTime = 0.8) {
    const preset = presetEntries.find(([presetName]) => presetName === name);
    if (preset) visualizerRef.current?.loadPreset(preset[1], blendTime);
  }

  function syncPresetAtTime(time: number) {
    const activeMarker = [...presetMarkers].reverse().find((marker) => marker.time <= time);
    const markerId = activeMarker?.id ?? null;
    if (markerId === activeMarkerRef.current) return;
    activeMarkerRef.current = markerId;
    loadPreset(activeMarker?.presetName ?? presetName);
  }

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    // Clear refs as well as closing the context. React Strict Mode runs this
    // cleanup once before remounting effects during development.
    const context = audioContextRef.current;
    audioContextRef.current = null;
    mediaSourceRef.current = null;
    visualizerRef.current = null;
    void context?.close();
  }, []);

  async function handleAudioImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const audio = audioRef.current;
    if (!file || !audio) return;

    if (audio.src) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(file);
    setAudioName(file.name);
    setCurrentTime(0);
    setDuration(0);
    setPresetMarkers([]);
    setSelectedMarkerId(null);
    activeMarkerRef.current = null;
    setNotice("Audio loaded. Analyzing waveform...");

    const context = audioContextRef.current;
    if (context && !mediaSourceRef.current) {
      const source = context.createMediaElementSource(audio);
      source.connect(context.destination);
      visualizerRef.current?.connectAudio(source);
      mediaSourceRef.current = source;
    }

    try {
      setWaveform(await readWaveform(file));
      setNotice("Audio loaded. Press play to drive the visualizer.");
    } catch {
      setWaveform([]);
      setNotice("Audio loaded. Waveform analysis was unavailable for this file.");
    }
  }

  function seek(time: number) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(time)) return;
    audio.currentTime = time;
    setCurrentTime(time);
    syncPresetAtTime(time);
  }

  function addPresetMarker() {
    if (!audioRef.current?.src) {
      setNotice("Import audio before adding a preset marker.");
      return;
    }
    const marker = { id: crypto.randomUUID(), time: currentTime, presetName };
    const next = [...presetMarkers, marker].sort((a, b) => a.time - b.time);
    setPresetMarkers(next);
    setSelectedMarkerId(marker.id);
    activeMarkerRef.current = marker.id;
    setNotice(`Preset marker added at ${formatTime(marker.time)}.`);
  }

  function updateSelectedMarker(update: Partial<Pick<PresetMarker, "time" | "presetName">>) {
    if (!selectedMarker) return;
    const next = presetMarkers.map((marker) => marker.id === selectedMarker.id ? { ...marker, ...update } : marker).sort((a, b) => a.time - b.time);
    setPresetMarkers(next);
    activeMarkerRef.current = null;
    syncPresetAtTime(currentTime);
  }

  function removeSelectedMarker() {
    if (!selectedMarker) return;
    setPresetMarkers(presetMarkers.filter((marker) => marker.id !== selectedMarker.id));
    setSelectedMarkerId(null);
    activeMarkerRef.current = null;
    syncPresetAtTime(currentTime);
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    const context = audioContextRef.current;
    if (!audio || !audio.src) {
      setNotice("Choose an MP3, WAV, FLAC, or M4A file first.");
      return;
    }
    if (context?.state === "suspended") await context.resume();
    try {
      if (audio.paused) {
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch (error) {
      setNotice(error instanceof Error ? `Playback failed: ${error.message}` : "Playback failed. Try importing the file again.");
    }
  }

  function saveTemplate() {
    const template: SavedTemplate = {
      id: crypto.randomUUID(),
      name: `${title || "Untitled"} visualizer`,
      presetName,
      accent,
      output,
    };
    const next = [...templates, template];
    localStorage.setItem(savedTemplatesKey, JSON.stringify(next));
    setTemplates(next);
    setNotice(`Saved template: ${template.name}`);
  }

  function applyTemplate(template: SavedTemplate) {
    setPresetName(template.presetName);
    setAccent(template.accent);
    setOutput(template.output);
    setNotice(`Applied template: ${template.name}`);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">S</span> Signal Frame</div>
        <div className="project-name">{title || "Untitled visualizer"}</div>
        <button className="export-button" type="button" onClick={() => setNotice("Export pipeline arrives in the next milestone.")}>Export MP4</button>
      </header>

      <section className="workspace">
        <aside className="sidebar">
          <div className="section-heading">Source</div>
          <label className="file-button">
            <input type="file" accept="audio/mpeg,audio/wav,audio/flac,audio/mp4,.mp3,.wav,.flac,.m4a" onChange={handleAudioImport} />
            Import audio
          </label>
          <div className="file-name">{audioName || "No audio selected"}</div>

          <div className="section-heading">MilkDrop preset</div>
          <select value={presetName} onChange={(event) => setPresetName(event.target.value)}>
            {presetEntries.slice(0, 80).map(([name]) => <option key={name} value={name}>{name}</option>)}
          </select>

          <div className="section-heading">Saved templates</div>
          <button className="secondary-button" type="button" onClick={saveTemplate}>Save current template</button>
          <div className="template-list">
            {templates.length === 0 && <p>Nothing saved yet.</p>}
            {templates.map((template) => <button key={template.id} className="template-row" type="button" onClick={() => applyTemplate(template)}>{template.name}</button>)}
          </div>
        </aside>

        <section className="preview-area">
          <div className={`preview-frame ${output}`}>
            <canvas ref={canvasRef} width="1280" height="720" />
            <div className="track-copy">
              <p>{artist}</p>
              <h1>{title}</h1>
            </div>
            {license === "free" && <div className="watermark">SIGNAL FRAME</div>}
          </div>
          <div className="transport">
            <button className="play-button" type="button" onClick={() => void togglePlayback()}>{isPlaying ? "Pause" : "Play"}</button>
            <span>{notice}</span>
          </div>
          <audio
            ref={audioRef}
            onEnded={() => setIsPlaying(false)}
            onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
            onTimeUpdate={(event) => {
              const time = event.currentTarget.currentTime;
              setCurrentTime(time);
              syncPresetAtTime(time);
            }}
          />
        </section>

        <aside className="inspector">
          <div className="section-heading">Track details</div>
          <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Artist<input value={artist} onChange={(event) => setArtist(event.target.value)} /></label>
          <label>Accent <input className="color-input" type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /></label>

          <div className="section-heading">Preset cues</div>
          <button className="secondary-button" type="button" onClick={addPresetMarker}>Add at playhead</button>
          {selectedMarker ? <div className="marker-editor">
            <label>Timestamp<input type="number" min="0" max={duration || undefined} step="0.1" value={selectedMarker.time.toFixed(1)} onChange={(event) => updateSelectedMarker({ time: Number(event.target.value) })} /></label>
            <label>Preset<select value={selectedMarker.presetName} onChange={(event) => updateSelectedMarker({ presetName: event.target.value })}>{presetEntries.slice(0, 80).map(([name]) => <option key={name} value={name}>{name}</option>)}</select></label>
            <button className="text-button danger" type="button" onClick={removeSelectedMarker}>Remove cue</button>
          </div> : <p className="profile-detail">Select a cue on the timeline to edit it.</p>}

          <div className="section-heading">Output</div>
          <div className="segmented">
            {(Object.keys(outputProfiles) as AspectRatio[]).map((profile) => <button key={profile} className={output === profile ? "active" : ""} type="button" onClick={() => setOutput(profile)}>{outputProfiles[profile].label}</button>)}
          </div>
          <p className="profile-detail">{outputProfiles[output].width} x {outputProfiles[output].height} / H.264 / AAC</p>

          <div className="section-heading">License</div>
          <div className="segmented two-up">
            <button className={license === "free" ? "active" : ""} type="button" onClick={() => setLicense("free")}>Free</button>
            <button className={license === "commercial" ? "active" : ""} type="button" onClick={() => setLicense("commercial")}>Commercial</button>
          </div>
          <p className="profile-detail">{license === "free" ? "Watermark enabled" : "Watermark removed"}</p>
        </aside>

        <section className="timeline" aria-label="Timeline">
          <div className="timeline-header">
            <div><strong>Timeline</strong><span>{formatTime(currentTime)} / {formatTime(duration)}</span></div>
            <button className="secondary-button timeline-add" type="button" onClick={addPresetMarker}>Add preset cue</button>
          </div>
          <div className="marker-lane">
            {presetMarkers.map((marker) => <button key={marker.id} className={`preset-marker ${selectedMarkerId === marker.id ? "selected" : ""}`} type="button" style={{ left: `${duration ? (marker.time / duration) * 100 : 0}%` }} onClick={() => setSelectedMarkerId(marker.id)} title={`${formatTime(marker.time)} - ${marker.presetName}`}><span /></button>)}
          </div>
          <div className="waveform-track">
            <div className="waveform-bars" aria-hidden="true">{(waveform.length ? waveform : Array.from({ length: 180 }, () => 0.06)).map((peak, index) => <i key={index} style={{ height: `${Math.max(5, peak * 100)}%` }} />)}</div>
            <input className="seek-control" type="range" min="0" max={duration || 0} step="0.01" value={Math.min(currentTime, duration || 0)} onChange={(event) => seek(Number(event.target.value))} aria-label="Seek audio" />
            <div className="playhead" style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
          </div>
        </section>
      </section>
    </main>
  );
}
