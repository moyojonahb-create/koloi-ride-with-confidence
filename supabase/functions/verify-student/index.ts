// Student verification edge function
// - Validates input
// - Enforces device lock + uniqueness + attempt cap
// - Calls Lovable AI (Gemini multimodal) to compare ID photo vs selfie
// - Updates student_profiles with score + status
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const APPROVAL_THRESHOLD = 90;
const ATTEMPT_LOCK = 5;

interface PhotoQualityIn {
  brightness?: number;
  glare?: boolean;
  blur?: number;
  width?: number;
  height?: number;
}

interface Body {
  institution_id: string;
  registration_number: string;
  national_id_number: string;
  id_photo_path: string;     // storage path inside student-verification bucket
  selfie_photo_path: string;
  device_id: string;
  id_photo_quality?: PhotoQualityIn;
  selfie_photo_quality?: PhotoQualityIn;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY')!;

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: claims, error: claimErr } = await userClient.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as Body;
    const reg = body.registration_number?.trim();
    const nid = body.national_id_number?.trim();
    if (!body.institution_id || !reg || !nid || !body.id_photo_path || !body.selfie_photo_path || !body.device_id) {
      return json({ error: 'Missing required fields' }, 400);
    }
    if (reg.length < 3 || reg.length > 40 || nid.length < 5 || nid.length > 40) {
      return json({ error: 'Invalid registration number or national ID format' }, 400);
    }

    // Uniqueness check (admin client to bypass RLS but we never return others' data)
    const { data: dupe } = await admin
      .from('student_profiles')
      .select('id, user_id, device_id')
      .or(`registration_number.eq.${reg},national_id_number.eq.${nid}`)
      .maybeSingle();

    if (dupe && dupe.user_id !== userId) {
      return json({
        error: 'This identity is already registered on another device.',
        code: 'DUPLICATE_IDENTITY',
      }, 409);
    }

    // Existing record for this user — increment attempts
    const { data: existing } = await admin
      .from('student_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const attempts = (existing?.attempt_count ?? 0) + 1;

    if (existing && existing.device_id && existing.device_id !== body.device_id && existing.verification_status === 'approved') {
      return json({
        error: 'This account is linked to another device. Contact support.',
        code: 'DEVICE_MISMATCH',
      }, 403);
    }

    if (attempts > ATTEMPT_LOCK) {
      await admin.from('student_profiles').upsert({
        user_id: userId,
        institution_id: body.institution_id,
        registration_number: reg,
        national_id_number: nid,
        id_photo_path: body.id_photo_path,
        selfie_photo_path: body.selfie_photo_path,
        device_id: body.device_id,
        attempt_count: attempts,
        verification_status: 'locked',
        student_mode_active: false,
        fraud_score: Math.min(100, (existing?.fraud_score ?? 0) + 25),
        id_photo_quality: body.id_photo_quality ?? null,
        selfie_photo_quality: body.selfie_photo_quality ?? null,
      }, { onConflict: 'user_id' });
      return json({
        error: 'Verification requires manual review.',
        code: 'LOCKED',
      }, 423);
    }

    // Fraud signal: same device used by other approved accounts
    let fraudBoost = 0;
    if (body.device_id) {
      const { count } = await admin
        .from('student_profiles')
        .select('id', { count: 'exact', head: true })
        .eq('device_id', body.device_id)
        .neq('user_id', userId);
      if ((count ?? 0) > 0) fraudBoost += 30;
    }

    // Fetch the two photos as base64 (admin client – private bucket)
    const idImg = await fetchImageAsBase64(admin, body.id_photo_path);
    const selfieImg = await fetchImageAsBase64(admin, body.selfie_photo_path);
    if (!idImg || !selfieImg) {
      return json({ error: 'Could not load uploaded photos.' }, 400);
    }

    // Call Lovable AI (Gemini) to compare faces — structured output via tool calling
    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content:
              'You compare two photographs of a person and return a similarity score from 0-100 indicating whether they show the same individual. ' +
              'Image 1 is a national ID document; image 2 is a live selfie. ' +
              'Score 90+ means very likely the same person. 70-89 likely. <70 likely different. ' +
              'Also flag if either image is unclear, missing a face, or appears to be a photo-of-a-screen / printed photo.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Compare these two photos and return a similarity score.' },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${idImg}` } },
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${selfieImg}` } },
            ],
          },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'submit_face_match',
            description: 'Submit the face comparison result',
            parameters: {
              type: 'object',
              properties: {
                similarity_score: { type: 'number', minimum: 0, maximum: 100 },
                same_person: { type: 'boolean' },
                id_face_clear: { type: 'boolean' },
                selfie_face_clear: { type: 'boolean' },
                spoof_suspected: { type: 'boolean', description: 'true if photo of screen / printed photo / heavy editing' },
                notes: { type: 'string' },
              },
              required: ['similarity_score', 'same_person', 'id_face_clear', 'selfie_face_clear', 'spoof_suspected'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'submit_face_match' } },
      }),
    });

    if (aiResp.status === 429) return json({ error: 'AI rate limit – try again shortly.' }, 429);
    if (aiResp.status === 402) return json({ error: 'AI credits exhausted – contact support.' }, 402);
    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error('AI error', aiResp.status, txt);
      return json({ error: 'Face comparison service unavailable.' }, 502);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall ? JSON.parse(toolCall.function.arguments) : null;
    if (!args) return json({ error: 'Face comparison returned no result.' }, 502);

    const score = Math.round(Number(args.similarity_score) || 0);
    const spoof = !!args.spoof_suspected;
    const facesClear = !!args.id_face_clear && !!args.selfie_face_clear;

    if (spoof) fraudBoost += 40;
    if (!facesClear) fraudBoost += 10;

    const newFraudScore = Math.min(100, (existing?.fraud_score ?? 0) + fraudBoost);
    const approved = score >= APPROVAL_THRESHOLD && facesClear && !spoof && newFraudScore < 50;

    const upsertPayload = {
      user_id: userId,
      institution_id: body.institution_id,
      registration_number: reg,
      national_id_number: nid,
      id_photo_path: body.id_photo_path,
      selfie_photo_path: body.selfie_photo_path,
      device_id: body.device_id,
      attempt_count: attempts,
      face_match_score: score,
      fraud_score: newFraudScore,
      verification_status: approved ? 'approved' : 'pending',
      student_mode_active: approved,
      approved_at: approved ? new Date().toISOString() : null,
      rejection_reason: approved ? null : (args.notes ?? null),
      id_photo_quality: body.id_photo_quality ?? null,
      selfie_photo_quality: body.selfie_photo_quality ?? null,
    };

    const { error: upErr } = await admin
      .from('student_profiles')
      .upsert(upsertPayload, { onConflict: 'user_id' });
    if (upErr) {
      console.error('upsert error', upErr);
      return json({ error: upErr.message }, 500);
    }

    return json({
      ok: true,
      face_match_score: score,
      verification_status: upsertPayload.verification_status,
      student_mode_active: upsertPayload.student_mode_active,
      attempts_remaining: Math.max(0, ATTEMPT_LOCK - attempts),
    });
  } catch (e) {
    console.error('verify-student error', e);
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});

async function fetchImageAsBase64(admin: ReturnType<typeof createClient>, path: string): Promise<string | null> {
  try {
    const { data, error } = await admin.storage.from('student-verification').download(path);
    if (error || !data) return null;
    const buf = new Uint8Array(await data.arrayBuffer());
    // base64 in chunks to avoid stack overflow
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < buf.length; i += chunk) {
      bin += String.fromCharCode(...buf.subarray(i, i + chunk));
    }
    return btoa(bin);
  } catch (e) {
    console.error('image fetch failed', e);
    return null;
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
