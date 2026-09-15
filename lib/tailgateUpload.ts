"use client";

import { compressImage } from "@/lib/imageCompress";

/**
 * Browser side of a Tailgate photo/video post (server side: lib/tailgateMedia.ts).
 * Each file: preview first (so the post shows with its picture the moment it
 * lands), then the original to Drive in resumable chunks, then complete.
 */

export const MAX_PHOTO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 4 * 1024 * 1024 * 1024;
const MAX_PREVIEW_BYTES = 3.5 * 1024 * 1024;
// Google requires chunks in multiples of 256 KiB; 8 MiB keeps each request
// short enough to survive a trailhead cell connection.
const CHUNK_BYTES = 8 * 1024 * 1024;
const MAX_RETRIES = 5;

export type MediaFileKind = "photo" | "video";

export function mediaKindOf(file: File): MediaFileKind | null {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  if (file.type.startsWith("image/") || ["heic", "heif"].includes(ext)) return "photo";
  if (file.type.startsWith("video/") || ["mov", "mp4", "m4v", "webm"].includes(ext)) return "video";
  return null;
}

function putChunk(url: string, blob: Blob, start: number, total: number, onProgress: (loaded: number) => void) {
  return new Promise<number>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Range", `bytes ${start}-${start + blob.size - 1}/${total}`);
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => resolve(xhr.status);
    xhr.onerror = () => resolve(0);
    xhr.ontimeout = () => resolve(0);
    xhr.send(blob);
  });
}

/** A still from a phone video, for the feed. Null if the browser can't decode it. */
export function videoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    const timer = setTimeout(() => finish(null), 8000);
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx || !canvas.width) {
        clearTimeout(timer);
        return finish(null);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          clearTimeout(timer);
          finish(blob);
        },
        "image/jpeg",
        0.75,
      );
    };
    video.onerror = () => {
      clearTimeout(timer);
      finish(null);
    };
    video.src = url;
  });
}

export interface PostAuth {
  messageId: string;
  token: string;
}

export async function sendPreview(slug: string, file: File, kind: MediaFileKind, auth: PostAuth) {
  try {
    let image: Blob | null;
    if (kind === "photo") {
      const small = await compressImage(file);
      image = small.type.startsWith("image/") ? small : null;
    } else {
      image = await videoPoster(file);
    }
    if (!image || image.size > MAX_PREVIEW_BYTES) return;
    const data = new FormData();
    data.set("messageId", auth.messageId);
    data.set("token", auth.token);
    data.set("image", image instanceof File ? image : new File([image], "preview.jpg", { type: "image/jpeg" }));
    await fetch(`/api/comms/${slug}/media/preview`, { method: "POST", body: data });
  } catch {
    // No preview just means a placeholder tile; the original still posts.
  }
}

/** Sends one original to Drive. Resolves true once Google has all of it. */
export async function uploadOriginal(
  slug: string,
  file: File,
  uploadUrl: string,
  auth: PostAuth,
  onProgress: (sent: number) => void,
): Promise<boolean> {
  const total = file.size;
  let offset = 0;
  let retries = 0;
  while (offset < total) {
    const chunk = file.slice(offset, Math.min(offset + CHUNK_BYTES, total));
    const base = offset;
    const code = await putChunk(uploadUrl, chunk, offset, total, (loaded) => onProgress(base + loaded));
    if (code === 200 || code === 201) {
      onProgress(total);
      return true;
    }
    if (code === 308) {
      offset += chunk.size;
      retries = 0;
      continue;
    }
    // Dropped signal: ask where Google got to, then carry on from there.
    if (++retries > MAX_RETRIES) return false;
    await new Promise((r) => setTimeout(r, 1500 * retries));
    try {
      const res = await fetch(`/api/comms/${slug}/media/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...auth, uploadUrl, size: total }),
      });
      if (!res.ok) continue;
      const state = await res.json();
      if (state.done) {
        onProgress(total);
        return true;
      }
      offset = state.offset;
    } catch {
      // Still no signal; the next attempt checks again.
    }
  }
  return true;
}

export async function completePost(slug: string, auth: PostAuth, failed: boolean): Promise<boolean> {
  try {
    const res = await fetch(`/api/comms/${slug}/media/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...auth, failed }),
    });
    const data = await res.json().catch(() => ({}));
    return res.ok && data.status === "Ready";
  } catch {
    return false;
  }
}
