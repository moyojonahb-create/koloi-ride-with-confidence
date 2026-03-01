import { useState, useEffect, useRef, useCallback } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";
import { supabase } from "@/lib/supabaseClient";

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
  const channelRef = useRef<any>(null);

  // Listen for incoming calls via realtime
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel(`call-incoming-${currentUserId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_sessions",
          filter: `callee_id=eq.${currentUserId}`,
        },
        (payload) => {
          const session = payload.new as any;
          if (session.status === "ringing" && callStatus === "idle") {
            setIncomingCall({
              sessionId: session.id,
              callerId: session.caller_id,
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
          const session = payload.new as any;
          const isParticipant =
            session.caller_id === currentUserId ||
            session.callee_id === currentUserId;
          if (!isParticipant) return;

          if (session.status === "ended" || session.status === "declined") {
            if (session.id === sessionId || session.id === incomingCall?.sessionId) {
              cleanup();
              setCallStatus("ended");
              setIncomingCall(null);
              setTimeout(() => setCallStatus("idle"), 2000);
            }
          }
          if (session.status === "answered" && session.id === sessionId) {
            // Other party answered, connect
            joinChannel(session.id);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, callStatus, sessionId]);

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

        // Get token from edge function
        const { data, error } = await supabase.functions.invoke("agora-token", {
          body: { session_id: sid },
        });

        if (error || !data?.token) {
          console.error("Failed to get Agora token:", error);
          setCallStatus("error");
          return;
        }

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
          endCall();
        });

        await client.join(
          appId,
          channelName,
          token,
          agoraUid
        );

        const micTrack = await AgoraRTC.createMicrophoneAudioTrack();
        localTrackRef.current = micTrack;
        await client.publish([micTrack]);

        setCallStatus("connected");

        // Start duration timer
        const start = Date.now();
        timerRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      } catch (err) {
        console.error("Failed to join Agora channel:", err);
        setCallStatus("error");
        cleanup();
      }
    },
    [cleanup]
  );

  const startCall = useCallback(async () => {
    if (!rideId || !currentUserId || !otherUserId) return;

    try {
      setCallStatus("ringing");

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

      if (error) throw error;

      setSessionId(data.id);
    } catch (err) {
      console.error("Failed to start call:", err);
      setCallStatus("error");
      setTimeout(() => setCallStatus("idle"), 2000);
    }
  }, [rideId, currentUserId, otherUserId]);

  const answerCall = useCallback(async () => {
    if (!incomingCall) return;

    try {
      await supabase
        .from("call_sessions")
        .update({ status: "answered" })
        .eq("id", incomingCall.sessionId);

      setSessionId(incomingCall.sessionId);
      setIncomingCall(null);
      await joinChannel(incomingCall.sessionId);
    } catch (err) {
      console.error("Failed to answer call:", err);
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
      console.error("Failed to decline call:", err);
    }
  }, [incomingCall]);

  const endCall = useCallback(async () => {
    if (sessionId) {
      try {
        await supabase
          .from("call_sessions")
          .update({ status: "ended", ended_at: new Date().toISOString() })
          .eq("id", sessionId);
      } catch {}
    }
    await cleanup();
    setCallStatus("ended");
    setSessionId(null);
    setTimeout(() => setCallStatus("idle"), 2000);
  }, [sessionId, cleanup]);

  const toggleMute = useCallback(() => {
    if (localTrackRef.current) {
      const newMuted = !isMuted;
      localTrackRef.current.setEnabled(!newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const toggleSpeaker = useCallback(() => {
    setIsSpeaker((prev) => !prev);
    // Note: speaker toggle is handled by device output in browsers
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
