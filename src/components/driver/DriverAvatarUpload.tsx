import { useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DriverAvatarUploadProps {
  currentAvatarUrl?: string | null;
  gender?: string | null;
  onUploaded: (url: string) => void;
}

export default function DriverAvatarUpload({ currentAvatarUrl, gender, onUploaded }: DriverAvatarUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl ?? null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar.${ext}`;

      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from("driver-avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("driver-avatars")
        .getPublicUrl(filePath);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update driver record
      const { error: updateErr } = await supabase
        .from("drivers")
        .update({ avatar_url: publicUrl })
        .eq("user_id", user.id);

      if (updateErr) throw updateErr;

      setPreviewUrl(publicUrl);
      onUploaded(publicUrl);
      toast.success("Profile photo updated!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error("Upload failed", { description: message });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-16 w-16 border-2 border-primary/20">
          {previewUrl ? (
            <AvatarImage src={previewUrl} alt="Driver avatar" />
          ) : null}
          <AvatarFallback className={`text-lg font-bold ${gender === "female" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"}`}>
            {gender === "female" ? "♀" : "♂"}
          </AvatarFallback>
        </Avatar>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
        >
          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
        </button>
      </div>
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "Uploading…" : previewUrl ? "Change Photo" : "Add Photo"}
        </Button>
        <p className="text-xs text-muted-foreground mt-1">Max 5MB, JPG/PNG</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
