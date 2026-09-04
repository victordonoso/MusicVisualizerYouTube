export type AspectRatio = "youtube" | "shorts" | "square";
export type LicenseMode = "free" | "commercial";

export interface VisualizerPreset {
  id: string;
  name: string;
  description: string;
}

export const outputProfiles: Record<AspectRatio, { label: string; width: number; height: number }> = {
  youtube: { label: "YouTube 1080p", width: 1920, height: 1080 },
  shorts: { label: "Shorts 1080x1920", width: 1080, height: 1920 },
  square: { label: "Square 1080x1080", width: 1080, height: 1080 },
};
