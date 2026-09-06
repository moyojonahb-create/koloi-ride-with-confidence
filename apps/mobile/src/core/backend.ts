/**
 * The Go backend client, built from `@cruixe/core`.
 *
 * Created lazily and once. `createGoBackendClient` registers an auth-event
 * subscription to close its failure breaker, so constructing one per call would
 * leak subscriptions and reset breaker state on every request.
 *
 * NOTE: `authReady` is deliberately not wired here yet. Core accepts it so the
 * client cannot read a token before the session has hydrated, and the socket
 * increment will supply it. Every call site in *this* increment gates on a
 * session object that already exists, which gives the same guarantee by a
 * narrower route — see `pendingProfile.ts` for why that distinction matters.
 */

import { createGoBackendClient, createSupabaseAuthProvider, type GoBackendClient } from '@cruixe/core';

import { coreConfigResult } from './config';
import { requireSupabase } from './supabase';

let client: GoBackendClient | null = null;

export function getBackend(): GoBackendClient {
  if (client) return client;
  if (!coreConfigResult.ok) {
    throw new Error('Go backend client unavailable — CruiXe core is misconfigured.');
  }

  client = createGoBackendClient({
    config: coreConfigResult.config,
    auth: createSupabaseAuthProvider(requireSupabase()),
  });
  return client;
}
