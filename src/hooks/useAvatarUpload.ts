import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useAvatarUpload() {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.user_metadata?.avatar_url ?? null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.user_metadata?.avatar_url) setAvatarUrl(user.user_metadata.avatar_url);
  }, [user?.user_metadata?.avatar_url]);

  const selectFile = (file: File) => {
    setUploadError(null);
    setPendingImage(URL.createObjectURL(file));
    setCropOpen(true);
  };

  const cancelCrop = () => {
    setCropOpen(false);
    setPendingImage(null);
  };

  const confirmCrop = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    const localUrl = URL.createObjectURL(blob);
    setAvatarUrl(localUrl);
    setCropOpen(false);

    const path = `${user.id}/avatar.jpg`;
    const { error } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) {
      setUploadError(error.message);
      setUploading(false);
      setPendingImage(null);
      return;
    }

    const { data: pubData } = supabase.storage.from("avatars").getPublicUrl(path);
    let persistUrl = `${pubData.publicUrl}?t=${Date.now()}`;
    try {
      const res = await fetch(persistUrl, { method: "HEAD" });
      if (!res.ok) {
        const { data: signed } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) persistUrl = signed.signedUrl;
      }
    } catch { /* network error — keep localUrl */ }

    await supabase.auth.updateUser({ data: { avatar_url: persistUrl } });
    setAvatarUrl(persistUrl);
    setUploading(false);
    setPendingImage(null);
  };

  return { avatarUrl, pendingImage, cropOpen, uploading, uploadError, selectFile, cancelCrop, confirmCrop };
}
