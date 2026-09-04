declare module "butterchurn" {
  interface Visualizer {
    connectAudio(node: AudioNode): void;
    loadPreset(preset: unknown, blendTime: number): void;
    render(): void;
  }

  const butterchurn: {
    createVisualizer(context: AudioContext, canvas: HTMLCanvasElement, options: { width: number; height: number }): Visualizer;
  };

  export default butterchurn;
}

declare module "butterchurn-presets" {
  const presets: { getPresets(): Record<string, unknown> };
  export default presets;
}
