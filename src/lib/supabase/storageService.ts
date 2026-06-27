import { supabase } from "./client";

/** Captura um frame do vídeo como JPEG (Blob). */
export function captureFrame(video: HTMLVideoElement, mirror = true): Promise<Blob | null> {
  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  // recorte central quadrado
  const vw = video.videoWidth || size;
  const vh = video.videoHeight || size;
  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;
  if (mirror) {
    ctx.translate(size, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
}

export const storageService = {
  /** Sobe a selfie do funcionário no bucket público `avatars` e devolve a URL. */
  async uploadAvatar(uid: string, blob: Blob): Promise<string | null> {
    if (!supabase) return null;
    const path = `${uid}.jpg`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (error) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    // cache-bust para refletir a nova foto
    return `${data.publicUrl}?t=${Date.now()}`;
  },
};
