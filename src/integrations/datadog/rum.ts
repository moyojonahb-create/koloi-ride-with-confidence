import { datadogRum } from '@datadog/browser-rum';
import { reactPlugin } from '@datadog/browser-rum-react';

/**
 * Initializes Datadog Browser RUM.
 *
 * Safe to call multiple times; only the first call will initialize.
 * Uses Vite env vars so secrets/config are not hard-coded in source.
 */
export function initDatadogRum(): void {
  const enabled = import.meta.env.VITE_DD_RUM_ENABLED === 'true';

  // Keep RUM opt-in (explicitly enabled) to avoid sending telemetry
  // from local/dev environments unless desired.
  if (!enabled) {
    if (import.meta.env.DEV) {
      console.info('[Datadog] RUM disabled (VITE_DD_RUM_ENABLED != true)');
    }
    return;
  }

  const applicationId = import.meta.env.VITE_DD_RUM_APPLICATION_ID;
  const clientToken = import.meta.env.VITE_DD_RUM_CLIENT_TOKEN;
  const site = import.meta.env.VITE_DD_RUM_SITE || 'datadoghq.com';
  const service = import.meta.env.VITE_DD_RUM_SERVICE;
  const env = import.meta.env.VITE_DD_RUM_ENV;
  const version = import.meta.env.VITE_DD_RUM_VERSION;

  // If required config is missing, fail silently to avoid breaking the app.
  if (!applicationId || !clientToken || !service) {
    console.warn('[Datadog] RUM enabled but missing required config', {
      hasApplicationId: Boolean(applicationId),
      hasClientToken: Boolean(clientToken),
      hasService: Boolean(service),
    });
    return;
  }

  // Prevent double-init in case of HMR or repeated calls.
  // Newer SDK versions expose getInitConfiguration().
  type RumWithInitConfig = typeof datadogRum & { getInitConfiguration?: () => unknown };
  const rum = datadogRum as RumWithInitConfig;
  if (rum.getInitConfiguration?.()) return;

  try {
    datadogRum.init({
      applicationId,
      clientToken,
      site,
      service,
      env,
      version,
      sessionSampleRate: 100,
      sessionReplaySampleRate: 100,
      trackResources: true,
      trackUserInteractions: true,
      trackLongTasks: true,
      // trackFrustrations removed - not in this SDK version
      defaultPrivacyLevel: 'mask-user-input',
      plugins: [reactPlugin({ router: false })],
    });

    // Optional, but recommended by Datadog to start capturing immediately.
    datadogRum.startSessionReplayRecording();

    if (import.meta.env.DEV) {
      console.info('[Datadog] RUM initialized', {
        service,
        env,
        site,
        version,
      });
      // Helpful for local debugging.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).DD_RUM = datadogRum;
    }
  } catch (error) {
    console.error('[Datadog] RUM initialization failed', error);
  }
}
