/**
 * @cruixe/core — business logic shared by the CruiXe web app and RN app.
 *
 * Rules for this package:
 *   - No DOM globals (enforced by .eslintrc.cjs's no-restricted-globals).
 *   - No `import.meta.env` — config is injected via defineCoreConfig().
 *   - No React Native imports either; this must stay runnable in Node for tests.
 *   - No module-level side effects. Everything is a factory, so tests get clean
 *     state and RN screens can dispose what they create.
 */

export { defineCoreConfig, CoreConfigError, type CoreConfig } from './config';

export {
  createSupabaseAuthProvider,
  type AuthTokenProvider,
  type AuthEvent,
  type SupabaseAuthLike,
} from './auth';

export {
  createGoBackendClient,
  GoBackendError,
  type GoBackendClient,
  type GoBackendErrorCode,
} from './net/goBackendClient';

export {
  BackendSocketClient,
  createBackendSocketClient,
  type BackendSocketEvent,
  type BackendSocketEventType,
  type BackendSocketState,
  type SocketFactory,
} from './net/backendSocketClient';

export {
  eventRideId,
  eventDriverId,
  eventOfferId,
  eventNumber,
  eventString,
} from './net/socketEvents';

export {
  buildSupabaseOptions,
  type StorageAdapter,
  type SupabaseClientOptions,
} from './supabase/createSupabaseClient';

export {
  TOWNS,
  ZIMBABWE_NATIONAL,
  DEFAULT_TOWN,
  getDistance,
  detectTown,
  isWithinAnyServiceArea,
  isWithinTownServiceArea,
  getTownById,
  isWithinImportBounds,
  type TownConfig,
} from './geo/towns';

export {
  isStreetLike,
  rankTownStreets,
  type RankablePlace,
  type RankContext,
} from './geo/streetSearchRank';

export {
  createNominatimClient,
  buildSearchUrl,
  buildReverseUrl,
  NOMINATIM_TIMEOUT_MS,
  type NominatimClient,
  type NominatimResult,
  type Viewbox,
} from './geo/nominatim';

export {
  DEFAULT_PRICING,
  calculateRecommendedFare,
  formatFare,
  getFareStep,
  isNightTime,
  type FareQuote,
  type TownPricingConfig,
} from './pricing/fare';

export {
  PARCEL_SIZE_SURCHARGE,
  SHARE_DISCOUNT_RATE,
  PARCEL_DISTANCE_RATE,
  computeFareBreakdown,
  tierOptionsWithFare,
  tierOptionsWithoutFare,
  type EconomyFareInput,
  type FareBreakdown,
  type FareBreakdownInput,
  type ParcelSize,
  type RideTierId,
  type RideTierOption,
} from './pricing/tiers';

export * from './tokens/index';
