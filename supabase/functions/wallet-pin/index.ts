import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as encodeHex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple rate limiting using in-memory map (resets on cold start, good enough for brute force)
const attempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; lockedUntil?: number } {
  const now = Date.now();
  const record = attempts.get(userId);

  if (record && record.lockedUntil > now) {
    return { allowed: false, remaining: 0, lockedUntil: record.lockedUntil };
  }

  if (record && record.lockedUntil <= now) {
    attempts.delete(userId);
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - (attempts.get(userId)?.count || 0) };
}

function recordFailedAttempt(userId: string) {
  const record = attempts.get(userId) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= MAX_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCKOUT_MS;
  }
  attempts.set(userId, record);
}

function clearAttempts(userId: string) {
  attempts.delete(userId);
}

// Hash PIN using PBKDF2 with a salt
async function hashPin(pin: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder();
  const pinKey = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveBits"]);
  
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }
  
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    pinKey,
    256
  );
  
  const hashHex = new TextDecoder().decode(encodeHex(new Uint8Array(derived)));
  const saltHex = new TextDecoder().decode(encodeHex(salt));
  
  return { hash: `pbkdf2:100000:${saltHex}:${hashHex}`, salt: saltHex };
}

async function verifyPin(pin: string, storedHash: string): Promise<boolean> {
  // Legacy plaintext check (5 digit numeric stored directly)
  if (/^\d{5}$/.test(storedHash)) {
    return pin === storedHash;
  }
  
  // PBKDF2 format: pbkdf2:iterations:salt:hash
  const parts = storedHash.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  
  const saltHex = parts[2];
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
  
  const { hash } = await hashPin(pin, salt);
  return hash === storedHash;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;
    const body = await req.json();
    const { action, pin } = body;

    // Service client for reading/writing PIN hashes
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    switch (action) {
      case "check": {
        // Check if user has a PIN set (don't return the PIN itself!)
        const { data } = await serviceClient
          .from("wallets")
          .select("wallet_pin")
          .eq("user_id", userId)
          .maybeSingle();

        return new Response(
          JSON.stringify({ hasPin: !!data?.wallet_pin }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "set": {
        if (!pin || !/^\d{5}$/.test(pin)) {
          return new Response(
            JSON.stringify({ error: "PIN must be exactly 5 digits" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { hash } = await hashPin(pin);

        // Upsert wallet with hashed PIN
        const { data: existing } = await serviceClient
          .from("wallets")
          .select("id")
          .eq("user_id", userId)
          .maybeSingle();

        if (!existing) {
          await serviceClient.from("wallets").insert({ user_id: userId, balance: 0, wallet_pin: hash });
        } else {
          await serviceClient.from("wallets").update({ wallet_pin: hash }).eq("user_id", userId);
        }

        clearAttempts(userId);

        return new Response(
          JSON.stringify({ ok: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "verify": {
        if (!pin || !/^\d{5}$/.test(pin)) {
          return new Response(
            JSON.stringify({ error: "PIN must be exactly 5 digits" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Rate limit check
        const rl = checkRateLimit(userId);
        if (!rl.allowed) {
          const minutesLeft = Math.ceil((rl.lockedUntil! - Date.now()) / 60000);
          return new Response(
            JSON.stringify({ error: `Too many attempts. Try again in ${minutesLeft} minutes.`, locked: true }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { data } = await serviceClient
          .from("wallets")
          .select("wallet_pin")
          .eq("user_id", userId)
          .maybeSingle();

        if (!data?.wallet_pin) {
          return new Response(
            JSON.stringify({ error: "No PIN set" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const valid = await verifyPin(pin, data.wallet_pin);
        
        if (!valid) {
          recordFailedAttempt(userId);
          const remaining = MAX_ATTEMPTS - (attempts.get(userId)?.count || 0);
          return new Response(
            JSON.stringify({ ok: false, error: "Incorrect PIN", remaining: Math.max(0, remaining) }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // If PIN was legacy plaintext, upgrade to hashed
        if (/^\d{5}$/.test(data.wallet_pin)) {
          const { hash } = await hashPin(pin);
          await serviceClient.from("wallets").update({ wallet_pin: hash }).eq("user_id", userId);
        }

        clearAttempts(userId);

        return new Response(
          JSON.stringify({ ok: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Unknown action" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error: unknown) {
    console.error("[wallet-pin] Error:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
