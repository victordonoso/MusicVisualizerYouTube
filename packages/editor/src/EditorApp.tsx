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

const presetEntries = Object.entries(butterchurnPresets.getPresets());
const defaultPreset = presetEntries.find(([name]) => name.includes("Geiss")) ?? presetEntries[0];

function getSavedTemplates(): SavedTemplate[] {
  try {
    return JSON.parse(localStorage.getItem(savedTemplatesKey) ?? "[]") as SavedTemplate[];
  } catch {
    return [];
  }
}

export function EditorApp() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const visualizerRef = useRef<ReturnType<typeof butterchurn.createVisualizer> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const mediaSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
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

  const selectedPreset = useMemo(
    () => presetEntries.find(([name]) => name === presetName) ?? defaultPreset,
    [presetName],
  );

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

  useEffect(() => () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    void audioContextRef.current?.close();
  }, []);

  async function handleAudioImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const audio = audioRef.current;
    if (!file || !audio) return;

    if (audio.src) URL.revokeObjectURL(audio.src);
    audio.src = URL.createObjectURL(file);
    setAudioName(file.name);
    setNotice("Audio loaded. Press play to drive the visualizer.");

    const context = audioContextRef.current;
    if (context && !mediaSourceRef.current) {
      const source = context.createMediaElementSource(audio);
      source.connect(context.destination);
      visualizerRef.current?.connectAudio(source);
      mediaSourceRef.current = source;
    }
  }

  async function togglePlayback() {
    const audio = audioRef.current;
    const context = audioContextRef.current;
    if (!audio || !audio.src) {
      setNotice("Choose an MP3, WAV, FLAC, or M4A file first.");
      return;
    }
    if (context?.state === "suspended") await context.resume();
    if (audio.paused) {
      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
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
          <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />
        </section>

        <aside className="inspector">
          <div className="section-heading">Track details</div>
          <label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <label>Artist<input value={artist} onChange={(event) => setArtist(event.target.value)} /></label>
          <label>Accent <input className="color-input" type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /></label>

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
      </section>
    </main>
  );
}
