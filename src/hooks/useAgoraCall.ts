/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

export type CallStatus =
  | "idle"
  | "ringing"
  | "connecting"
  | "connected"
  | "ended"
  | "error";

interface UseAgoraCallOptions {
  rideId: string | null;
  currentUserId: string;
  otherUserId: string | null;
}

/** Request mic permission early so mobile browsers don't block it later */
async function ensureMicPermission(): Promise<boolean> {
  try {
    // On mobile, getUserMedia must be called from a user gesture context
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop immediately – Agora will create its own track
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch (err) {
    console.warn("[AgoraCall] Mic permission denied:", err);
    return false;
  }
}

export function useAgoraCall({
  rideId,
  currentUserId,
  otherUserId,
}: UseAgoraCallOptions) {
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [incomingCall, setIncomingCall] = useState<{
    sessionId: string;
    callerId: string;
  } | null>(null);

  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const joiningRef = useRef(false); // prevent double-join

  // Use refs for values needed in realtime callbacks to avoid stale closures
  const sessionIdRef = useRef<string | null>(null);
  const callStatusRef = useRef<CallStatus>("idle");
  const incomingCallRef = useRef<typeof incomingCall>(null);

  // Keep refs in sync
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

  // Helper to set sessionId + ref atomically
  const setSessionIdSync = useCallback((id: string | null) => {
    sessionIdRef.current = id;
    setSessionId(id);
  }, []);

  // Listen for incoming calls and status changes via realtime
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`call-session-${currentUserId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
          filter: `callee_id=eq.${currentUserId}`,
        },
        (payload) => {
          const session = payload.new as Record<string, unknown>;
          if (session.status === "ringing" && callStatusRef.current === "idle") {
            setIncomingCall({
              sessionId: session.id as string,
              callerId: session.caller_id as string,
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "call_sessions",
        },
        (payload) => {
          const session = payload.new as Record<string, unknown>;
          const isParticipant =
            session.caller_id === currentUserId ||
            session.callee_id === currentUserId;
          if (!isParticipant) return;

          if (session.status === "ended" || session.status === "declined") {
            if (
              session.id === sessionIdRef.current ||
              (session.id as string) === incomingCallRef.current?.sessionId
            ) {
              cleanup();
              setCallStatus("ended");
              setIncomingCall(null);
              setTimeout(() => setCallStatus("idle"), 2000);
            }
          }
          if (
            session.status === "answered" &&
            session.id === sessionIdRef.current
          ) {
            console.log("[AgoraCall] Callee answered, joining channel…");
            joinChannel(session.id as string);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const cleanup = useCallback(async () => {
    joiningRef.current = false;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (localTrackRef.current) {
      localTrackRef.current.close();
      localTrackRef.current = null;
    }
    if (clientRef.current) {
      await clientRef.current.leave().catch(() => {});
      clientRef.current = null;
    }
    setCallDuration(0);
    setIsMuted(false);
  }, []);

  const joinChannel = useCallback(
    async (sid: string) => {
      // Guard against double-join (both realtime event and direct call)
      if (joiningRef.current) {
        console.log("[AgoraCall] Already joining, skipping duplicate");
        return;
      }
      joiningRef.current = true;

      try {
        setCallStatus("connecting");

        // Ensure mic permission on mobile before anything else
        const hasMic = await ensureMicPermission();
        if (!hasMic) {
          toast.error("Microphone access required", {
            description: "Please allow microphone access to make calls.",
          });
          setCallStatus("error");
          joiningRef.current = false;
          setTimeout(() => setCallStatus("idle"), 3000);
          return;
        }

        // Ensure we have an active auth session
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.access_token) {
          toast.error("Voice token error", {
            description: "No session token. Please log in again.",
          });
          setCallStatus("error");
          joiningRef.current = false;
          setTimeout(() => setCallStatus("idle"), 3000);
          return;
        }

        console.log("[AgoraCall] Requesting token for session:", sid);

        const { data, error } = await supabase.functions.invoke(
          "agora-token",
          { body: { session_id: sid } }
        );

        if (error || !data?.token) {
          console.error("[AgoraCall] Token error:", error || "no token");
          toast.error("Voice token error", {
            description: error?.message || "No token in response",
          });
          setCallStatus("error");
          joiningRef.current = false;
          setTimeout(() => setCallStatus("idle"), 3000);
          return;
        }

        const { token, channelName, agoraUid, appId } = data;
        console.log("[AgoraCall] Got token, joining channel:", channelName);

        // Cleanup any previous client
        if (clientRef.current) {
          await clientRef.current.leave().catch(() => {});
          clientRef.current = null;
        }

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on(
          "user-published",
          async (user: IAgoraRTCRemoteUser, mediaType) => {
            await client.subscribe(user, mediaType);
            if (mediaType === "audio") {
              console.log("[AgoraCall] Remote audio playing");
              user.audioTrack?.play();
            }
          }
        );

        client.on("user-left", () => {
          console.log("[AgoraCall] Remote user left");
          endCall();
        });

        await client.join(appId, channelName, token, agoraUid);
        console.log("[AgoraCall] Joined channel successfully");

        const micTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: "speech_low_quality", // optimised for voice on mobile
        });
        localTrackRef.current = micTrack;
        await client.publish([micTrack]);

        setCallStatus("connected");
        console.log("[AgoraCall] Connected & publishing audio");

        const start = Date.now();
        timerRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      } catch (err) {
        console.error("[AgoraCall] joinChannel error:", err);
        toast.error("Call failed", { description: String(err) });
        setCallStatus("error");
        cleanup();
        setTimeout(() => setCallStatus("idle"), 3000);
      } finally {
        joiningRef.current = false;
      }
    },
    [cleanup]
  );

  const startCall = useCallback(async () => {
    if (!rideId || !currentUserId || !otherUserId) {
      toast.error("Cannot start call", {
        description: "Missing ride or user info",
      });
      return;
    }

    // Request mic permission immediately on user tap (required by mobile browsers)
    const hasMic = await ensureMicPermission();
    if (!hasMic) {
      toast.error("Microphone access required", {
        description: "Please allow microphone access to make calls.",
      });
      return;
    }

    try {
      setCallStatus("ringing");
      console.log(
        "[AgoraCall] Starting call: ride=",
        rideId,
        "caller=",
        currentUserId,
        "callee=",
        otherUserId
      );

      const { data, error } = await supabase
        .from("call_sessions")
        .insert({
          ride_id: rideId,
          caller_id: currentUserId,
          callee_id: otherUserId,
          status: "ringing",
        })
        .select("id")
        .single();

      if (error) {
        console.error("[AgoraCall] Insert error:", error);
        throw error;
      }

      console.log("[AgoraCall] Call session created:", data.id);
      // Set ref IMMEDIATELY so realtime handler can match it
      setSessionIdSync(data.id);

      toast.info("Calling…", { description: "Waiting for answer" });
    } catch (err: unknown) {
      console.error("[AgoraCall] Failed to start call:", err);
      toast.error("Call failed", { description: (err as Error).message });
      setCallStatus("error");
      setTimeout(() => setCallStatus("idle"), 2000);
    }
  }, [rideId, currentUserId, otherUserId, setSessionIdSync]);

  const answerCall = useCallback(async () => {
    if (!incomingCall) return;

    // Request mic permission immediately on user tap
    const hasMic = await ensureMicPermission();
    if (!hasMic) {
      toast.error("Microphone access required", {
        description: "Please allow microphone access to answer calls.",
      });
      return;
    }

    try {
      console.log("[AgoraCall] Answering call:", incomingCall.sessionId);
      await supabase
        .from("call_sessions")
        .update({ status: "answered" })
        .eq("id", incomingCall.sessionId);

      setSessionIdSync(incomingCall.sessionId);
      setIncomingCall(null);
      await joinChannel(incomingCall.sessionId);
    } catch (err: unknown) {
      console.error("[AgoraCall] Failed to answer call:", err);
      toast.error("Failed to answer", { description: (err as Error).message });
      setCallStatus("error");
    }
  }, [incomingCall, joinChannel, setSessionIdSync]);

  const declineCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      await supabase
        .from("call_sessions")
        .update({ status: "declined", ended_at: new Date().toISOString() })
        .eq("id", incomingCall.sessionId);

      setIncomingCall(null);
    } catch (err) {
      console.error("[AgoraCall] Failed to decline call:", err);
    }
  }, [incomingCall]);

  const endCall = useCallback(async () => {
    const sid = sessionIdRef.current;
    if (sid) {
      try {
        await supabase
          .from("call_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", sid);
      } catch (err) {
        console.warn("Failed to end call session:", err);
      }
    }
    await cleanup();
    setCallStatus("ended");
    setSessionIdSync(null);
    setTimeout(() => setCallStatus("idle"), 2000);
  }, [cleanup, setSessionIdSync]);

  const toggleMute = useCallback(() => {
    if (localTrackRef.current) {
      const newMuted = !isMuted;
      localTrackRef.current.setEnabled(!newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callStatus,
    isMuted,
    isSpeaker,
    callDuration,
    incomingCall,
    startCall,
    answerCall,
    declineCall,
    endCall,
    toggleMute,
    toggleSpeaker,
  };
}

export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
