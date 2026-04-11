/**
 * Backwards-compatible Datadog init entrypoint.
 *
 * This project also has a more complete implementation at:
 * `src/integrations/datadog/rum.ts`.
 *
 * We keep this file as a stable import target (`./rum`) used by `src/main.tsx`.
 */
import { initDatadogRum } from './integrations/datadog/rum';

export function initDatadog(): void {
  initDatadogRum();
}