// Environment polyfill MUST be imported first to patch missing env vars
import './lib/envPolyfill';

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Register main PWA service worker
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[Voyex] PWA SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('[Voyex] PWA SW registration failed:', error);
      });

    // Also register tile caching service worker
    navigator.serviceWorker.register('/sw-tiles.js')
      .then((registration) => {
        console.log('[Koloi] Tile cache SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('[Koloi] Tile cache SW registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
