import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { setupPwaUpdates } from "./pwa";

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}

setupPwaUpdates();
