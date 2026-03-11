import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// In-memory OTP store (in production, use a database)
const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();

// Rate limiting: max 3 OTPs per phone per 10 minutes
const rateLimitStore = new Map<string, { count: number; windowStart: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function isRateLimited(phone: string): boolean {
  const now = Date.now();
  const window = 10 * 60 * 1000; // 10 minutes
  const entry = rateLimitStore.get(phone);
  if (!entry || now - entry.windowStart > window) {
    rateLimitStore.set(phone, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= 3) return true;
  entry.count++;
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- JWT Authentication ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // --- End Authentication ---

    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio credentials');
      throw new Error('Twilio credentials not configured');
    }

    const { action, phone, code } = await req.json();
    console.log(`Twilio OTP action: ${action}, phone: ${phone}, user: ${claimsData.user.id}`);

    if (action === 'send') {
      // Rate limit check
      if (isRateLimited(phone)) {
        return new Response(
          JSON.stringify({ success: false, message: 'Too many OTP requests. Please wait 10 minutes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const otp = generateOTP();
      const expires = Date.now() + 10 * 60 * 1000;
      otpStore.set(phone, { code: otp, expires, attempts: 0 });

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
      const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);

      const response = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: phone,
          From: TWILIO_PHONE_NUMBER,
          Body: `Your Voyex verification code is: ${otp}. Valid for 10 minutes.`,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error('[twilio-otp] SMS send error:', result?.message);
        throw new Error('Failed to send SMS');
      }

      console.log('SMS sent successfully:', result.sid);
      return new Response(
        JSON.stringify({ success: true, message: 'OTP sent successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (action === 'verify') {
      const stored = otpStore.get(phone);
      
      if (!stored) {
        return new Response(
          JSON.stringify({ success: false, message: 'No OTP found. Please request a new code.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (Date.now() > stored.expires) {
        otpStore.delete(phone);
        return new Response(
          JSON.stringify({ success: false, message: 'OTP expired. Please request a new code.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Brute-force protection: max 5 attempts
      if (stored.attempts >= 5) {
        otpStore.delete(phone);
        return new Response(
          JSON.stringify({ success: false, message: 'Too many attempts. Please request a new code.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      stored.attempts++;

      if (stored.code !== code) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid OTP code.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      otpStore.delete(phone);
      console.log('OTP verified successfully for:', phone);
      
      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error('Invalid action. Use "send" or "verify".');
    }

  } catch (error) {
    console.error('Error in twilio-otp function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
