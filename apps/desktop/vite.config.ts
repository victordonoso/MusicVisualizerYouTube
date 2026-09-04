import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@visualizer/editor": path.resolve(__dirname, "../../packages/editor/src"), "@visualizer/shared": path.resolve(__dirname, "../../packages/shared/src") } },
  server: { port: 1420, strictPort: true },
  clearScreen: false,
});
