import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register tile caching service worker for offline map support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
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
