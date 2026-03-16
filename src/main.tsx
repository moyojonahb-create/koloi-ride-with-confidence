// Environment polyfill MUST be imported first to patch missing env vars
import './lib/envPolyfill';

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import { AuthProvider } from "./hooks/useAuth";
import "./index.css";

const queryClient = new QueryClient();

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
        console.log('[Voyex] Tile cache SW registered:', registration.scope);
      })
      .catch((error) => {
        console.log('[Voyex] Tile cache SW registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <App />
    </AuthProvider>
  </QueryClientProvider>
);
