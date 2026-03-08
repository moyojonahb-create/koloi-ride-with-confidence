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

  // Use refs for values needed in realtime callbacks to avoid stale closures
  const sessionIdRef = useRef<string | null>(null);
  const callStatusRef = useRef<CallStatus>("idle");
  const incomingCallRef = useRef<typeof incomingCall>(null);

  // Keep refs in sync
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);
  useEffect(() => { incomingCallRef.current = incomingCall; }, [incomingCall]);

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
          console.log("[AgoraCall] INSERT received:", session.status, session.id);
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

          console.log("[AgoraCall] UPDATE received:", session.status, session.id, "my sessionId:", sessionIdRef.current);

          if (session.status === "ended" || session.status === "declined") {
            if (session.id === sessionIdRef.current || (session.id as string) === incomingCallRef.current?.sessionId) {
              cleanup();
              setCallStatus("ended");
              setIncomingCall(null);
              setTimeout(() => setCallStatus("idle"), 2000);
            }
          }
          if (session.status === "answered" && session.id === sessionIdRef.current) {
            console.log("[AgoraCall] Other party answered, joining channel...");
            joinChannel(session.id as string);
          }
        }
      )
      .subscribe((status) => {
        console.log("[AgoraCall] Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // Only re-subscribe when currentUserId changes
  }, [currentUserId]);

  const cleanup = useCallback(async () => {
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
      try {
        setCallStatus("connecting");

        // Ensure we have an active session before invoking the edge function
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.access_token) {
          toast.error("Voice token error", { description: "No session token. Please log in again." });
          console.error("[AgoraCall] No session token available");
          setCallStatus("error");
          setTimeout(() => setCallStatus("idle"), 3000);
          return;
        }

        console.log("[AgoraCall] Invoking agora-token", sid);

        const { data, error } = await supabase.functions.invoke("agora-token", {
          body: { session_id: sid },
        });

        if (error) {
          console.error("[AgoraCall] Voice token error:", error);
          toast.error("Voice token error", { description: error.message || String(error) });
          setCallStatus("error");
          setTimeout(() => setCallStatus("idle"), 3000);
          return;
        }

        if (!data?.token) {
          console.error("[AgoraCall] Token response missing token:", data);
          toast.error("Call failed", { description: "No token in response" });
          setCallStatus("error");
          setTimeout(() => setCallStatus("idle"), 3000);
          return;
        }

        console.log("[AgoraCall] Token response", data);
        const { token, channelName, agoraUid, appId } = data;

        const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
        clientRef.current = client;

        client.on("user-published", async (user: IAgoraRTCRemoteUser, mediaType) => {
          await client.subscribe(user, mediaType);
          if (mediaType === "audio") {
            user.audioTrack?.play();
          }
        });

        client.on("user-left", () => {
          console.log("[AgoraCall] Remote user left");
          endCall();
        });

        await client.join(appId, channelName, token, agoraUid);

        const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localTrackRef.current = micTrack;
        await client.publish([micTrack]);

        setCallStatus("connected");
        console.log("[AgoraCall] Connected and publishing audio");

        const start = Date.now();
        timerRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      } catch (err) {
        console.error("[AgoraCall] Failed to join Agora channel:", err);
        toast.error("Call failed", { description: String(err) });
        setCallStatus("error");
        cleanup();
        setTimeout(() => setCallStatus("idle"), 3000);
      }
    },
    [cleanup]
  );

  const startCall = useCallback(async () => {
    if (!rideId || !currentUserId || !otherUserId) {
      console.error("[AgoraCall] startCall missing params:", { rideId, currentUserId, otherUserId });
      toast.error("Cannot start call", { description: "Missing ride or user info" });
      return;
    }

    try {
      setCallStatus("ringing");
      console.log("[AgoraCall] Starting call: ride=", rideId, "caller=", currentUserId, "callee=", otherUserId);

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
      setSessionId(data.id);
      // sessionIdRef is updated via useEffect sync
      // Now waiting for callee to answer (realtime UPDATE will trigger joinChannel)
      toast.info("Calling rider...", { description: "Waiting for answer" });
    } catch (err: unknown) {
      console.error("[AgoraCall] Failed to start call:", err);
      toast.error("Call failed", { description: (err as Error).message });
      setCallStatus("error");
      setTimeout(() => setCallStatus("idle"), 2000);
    }
  }, [rideId, currentUserId, otherUserId]);

  const answerCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      console.log("[AgoraCall] Answering call:", incomingCall.sessionId);
      await supabase
        .from("call_sessions")
        .update({ status: "answered" })
        .eq("id", incomingCall.sessionId);

      setSessionId(incomingCall.sessionId);
      setIncomingCall(null);
      await joinChannel(incomingCall.sessionId);
    } catch (err: unknown) {
      console.error("[AgoraCall] Failed to answer call:", err);
      toast.error("Failed to answer", { description: (err as Error).message });
      setCallStatus("error");
    }
  }, [incomingCall, joinChannel]);

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
        console.warn('Failed to end call session:', err);
      }    }
    await cleanup();
    setCallStatus("ended");
    setSessionId(null);
    setTimeout(() => setCallStatus("idle"), 2000);
  }, [cleanup]);

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
