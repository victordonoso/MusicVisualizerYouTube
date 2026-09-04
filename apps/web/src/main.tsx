import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { EditorApp } from "@visualizer/editor";
import "@visualizer/editor/styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EditorApp />
  </StrictMode>,
);
