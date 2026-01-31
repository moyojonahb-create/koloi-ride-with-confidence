import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { CallButton } from "./CallButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRideRealtime } from "@/hooks/useRideRealtime";
import { Send, Phone, MessageCircle } from "lucide-react";
import { playMessageSound } from "@/lib/notificationSounds";

type Message = {
  id: string;
  ride_id: string;
  sender_id: string;
  text: string;
  created_at: string;
};

type RideCommunicationProps = {
  rideId: string;
  currentUserId: string;
  otherUserPhone?: string | null;
  riderId: string;
};

export function RideCommunication({ 
  rideId, 
  currentUserId, 
  otherUserPhone, 
  riderId 
}: RideCommunicationProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [lastMessageCount, setLastMessageCount] = useState(0);

  const loadMessages = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("ride_id", rideId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      // Play sound for new messages (not from current user)
      if (data.length > lastMessageCount && lastMessageCount > 0) {
        const lastMsg = data[data.length - 1];
        if (lastMsg.sender_id !== currentUserId) {
          playMessageSound();
        }
      }
      setLastMessageCount(data.length);
      setMessages(data as Message[]);
    }
  }, [rideId, currentUserId, lastMessageCount]);

  // Subscribe to realtime message updates
  useRideRealtime(rideId, {
    onMessageChange: loadMessages,
  });

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const sendMessage = async () => {
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        ride_id: rideId,
        sender_id: currentUserId,
        text: text.trim(),
      });

      if (!error) {
        setText("");
        loadMessages();
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Communication
        </h3>
      </div>

      {/* Call Button with Phone Display */}
      {otherUserPhone && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="flex-1 text-sm font-medium">{otherUserPhone}</span>
          <CallButton phone={otherUserPhone} label="Call Now" className="text-sm py-2 px-4" />
        </div>
      )}

      {/* Chat Section */}
      <div className="border border-border rounded-xl overflow-hidden">
        {/* Messages List */}
        <div className="h-48 overflow-y-auto p-3 space-y-2 bg-muted/30">
          {messages.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((m) => {
              const isMe = m.sender_id === currentUserId;
              const isRider = m.sender_id === riderId;
              
              return (
                <div
                  key={m.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-xl px-3 py-2 ${
                      isMe
                        ? "bg-primary text-primary-foreground"
                        : "bg-background border border-border"
                    }`}
                  >
                    <p className="text-xs font-semibold mb-0.5 opacity-70">
                      {isRider ? "Rider" : "Driver"}
                    </p>
                    <p className="text-sm">{m.text}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Message Input */}
        <div className="flex gap-2 p-2 bg-background border-t border-border">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            className="flex-1"
            disabled={sending}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!text.trim() || sending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Messages are sent in real-time. Call uses your phone's dialer.
      </p>
    </div>
  );
}
