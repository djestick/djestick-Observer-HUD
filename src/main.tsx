import React from "react";
import ReactDOM from "react-dom/client";
import process from "process";
import App from "./App.tsx";

if (!(globalThis as any).process) {
  (globalThis as any).process = process;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
