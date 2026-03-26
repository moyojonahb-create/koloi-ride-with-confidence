// Environment polyfill MUST be imported first to patch missing env vars
import './lib/envPolyfill';

import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import App from "./App";
import { AuthProvider } from "./hooks/useAuth";
import { I18nProvider } from "./lib/i18n";
import { FemaleThemeProvider } from "./hooks/useFemaleTheme";
import ErrorBoundary from "./components/ErrorBoundary";
import "./index.css";

window.addEventListener('unhandledrejection', (event) => {
  console.error('[PickMe] Unhandled promise rejection:', event.reason);
});

window.addEventListener('error', (event) => {
  console.error('[PickMe] Global runtime error:', event.error || event.message);
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min — avoid refetching on every mount
      gcTime: 10 * 60 * 1000,         // 10 min garbage collection
      retry: 1,                        // single retry to stay fast
      refetchOnWindowFocus: false,     // don't refetch when tab regains focus
    },
  },
});

// Register PWA service workers only in production.
// In development they can cache stale assets/routes and cause the app
// to appear stuck on splash/loading screens.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    if (import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('[PickMe] PWA SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('[PickMe] PWA SW registration failed:', error);
        });

      navigator.serviceWorker.register('/sw-tiles.js')
        .then((registration) => {
          console.log('[PickMe] Tile cache SW registered:', registration.scope);
        })
        .catch((error) => {
          console.log('[PickMe] Tile cache SW registration failed:', error);
        });
    } else {
      // Clean up previously installed service workers while in dev.
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <I18nProvider>
          <FemaleThemeProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </FemaleThemeProvider>
        </I18nProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);
