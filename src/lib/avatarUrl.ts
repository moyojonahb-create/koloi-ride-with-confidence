import { supabase } from '@/lib/supabaseClient';

/**
 * Resolves an avatar_url value (which may be a storage path or a full URL)
 * into a usable image URL by generating a signed URL if needed.
 */
export async function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
  bucket = 'driver-avatars'
): Promise<string | null> {
  if (!avatarUrl) return null;
  // Already a full URL (signed or external)
  if (avatarUrl.startsWith('http')) return avatarUrl;
  // It's a storage path — generate a signed URL (valid 1 year)
  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(avatarUrl, 60 * 60 * 24 * 365);
  return data?.signedUrl ?? null;
}
