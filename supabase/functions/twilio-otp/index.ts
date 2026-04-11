import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      throw new Error('Twilio credentials not configured');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { action, phone, code } = await req.json();

    if (!phone || typeof phone !== 'string' || phone.length < 10 || phone.length > 20) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid phone number' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'send') {
      // Rate limit: max 3 OTPs per phone per 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('phone_verifications')
        .select('*', { count: 'exact', head: true })
        .eq('phone', phone)
        .gte('created_at', tenMinutesAgo);

      if ((count ?? 0) >= 3) {
        return new Response(
          JSON.stringify({ success: false, message: 'Too many OTP requests. Please wait 10 minutes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const otp = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

      // Store OTP in DB — survives cold starts
      await supabase.from('phone_verifications').insert({
        phone,
        code: otp,
        expires_at: expiresAt,
        attempts: 0,
        verified: false,
      });

      // Send via Twilio
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
          Body: `Your PickMe verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
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
      // Get latest unexpired, unverified OTP for this phone
      const { data: record, error } = await supabase
        .from('phone_verifications')
        .select('*')
        .eq('phone', phone)
        .eq('verified', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !record) {
        return new Response(
          JSON.stringify({ success: false, message: 'No OTP found. Please request a new code.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if ((record.attempts ?? 0) >= 5) {
        await supabase.from('phone_verifications').update({ verified: false }).eq('id', record.id);
        return new Response(
          JSON.stringify({ success: false, message: 'Too many attempts. Please request a new code.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Increment attempts
      await supabase.from('phone_verifications')
        .update({ attempts: (record.attempts ?? 0) + 1 })
        .eq('id', record.id);

      if (record.code !== code) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid OTP code.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark as verified
      await supabase.from('phone_verifications')
        .update({ verified: true })
        .eq('id', record.id);

      console.log('OTP verified successfully for:', phone);
      return new Response(
        JSON.stringify({ success: true, verified: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      throw new Error('Invalid action. Use "send" or "verify".');
    }

  } catch (error) {
    console.error('[twilio-otp] Internal error:', error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ success: false, error: 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
