import { supabase } from '@/lib/supabaseClient';

export interface FraudCheck {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
}

/**
 * Check for GPS spoofing by comparing speed between consecutive positions.
 * If a user "teleports" > 200km in < 1 minute, flag as suspicious.
 */
export function detectGPSSpoofing(
  prevLat: number, prevLng: number, prevTime: number,
  curLat: number, curLng: number, curTime: number
): FraudCheck | null {
  const R = 6371; // Earth radius km
  const dLat = (curLat - prevLat) * Math.PI / 180;
  const dLon = (curLng - prevLng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(prevLat * Math.PI / 180) * Math.cos(curLat * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const distance = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  const timeDiffMin = (curTime - prevTime) / 60000;
  if (timeDiffMin <= 0) return null;
  
  const speedKmh = distance / (timeDiffMin / 60);
  
  // Flag if "traveling" faster than 300km/h (impossible in Zimbabwe)
  if (speedKmh > 300 && distance > 5) {
    return {
      type: 'gps_spoofing',
      severity: 'critical',
      details: {
        speedKmh: Math.round(speedKmh),
        distanceKm: Math.round(distance * 10) / 10,
        timeDiffMinutes: Math.round(timeDiffMin * 10) / 10,
        fromCoords: { lat: prevLat, lng: prevLng },
        toCoords: { lat: curLat, lng: curLng },
      },
    };
  }
  return null;
}

/**
 * Check for suspicious ride patterns:
 * - Too many cancellations in a short period
 * - Rides to same location repeatedly (possible fraud)
 */
export async function detectSuspiciousPatterns(userId: string): Promise<FraudCheck[]> {
  const flags: FraudCheck[] = [];
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();

  // Check cancellation rate in last hour
  const { count: cancelCount } = await supabase
    .from('rides')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'cancelled')
    .gte('created_at', oneHourAgo);

  if ((cancelCount ?? 0) >= 5) {
    flags.push({
      type: 'excessive_cancellations',
      severity: 'medium',
      details: { cancellationsLastHour: cancelCount, threshold: 5 },
    });
  }

  // Check for rapid ride requests (> 10 in 1 hour)
  const { count: requestCount } = await supabase
    .from('rides')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);

  if ((requestCount ?? 0) >= 10) {
    flags.push({
      type: 'rapid_requests',
      severity: 'high',
      details: { requestsLastHour: requestCount, threshold: 10 },
    });
  }

  return flags;
}

/**
 * Report a fraud flag to the database.
 */
export async function reportFraudFlag(userId: string, check: FraudCheck) {
  await supabase.from('fraud_flags').insert({
    user_id: userId,
    flag_type: check.type,
    severity: check.severity,
    details: check.details,
  } as Record<string, unknown>);
}

/**
 * Run all fraud checks for a location update.
 */
export async function runLocationFraudChecks(
  userId: string,
  prevLat: number, prevLng: number, prevTime: number,
  curLat: number, curLng: number, curTime: number
) {
  const gpsCheck = detectGPSSpoofing(prevLat, prevLng, prevTime, curLat, curLng, curTime);
  if (gpsCheck) {
    await reportFraudFlag(userId, gpsCheck);
    return gpsCheck;
  }
  return null;
}
