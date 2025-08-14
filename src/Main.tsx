import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) {
  console.error("Root element #root not found");
} else {
  createRoot(rootEl).render(<App />);
}
