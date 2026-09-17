"use client";

import { useEffect, useRef, useState } from "react";
import { readCalmMotion, useCalmMotion } from "@/lib/comfort";

/**
 * The home hero's looping background video, with a Pause/Play control
 * (WCAG 2.2.2: moving content that loops needs a way to stop it). Calm motion
 * (Comfort settings, or the device's reduce-motion setting) shows the still
 * poster until they press Play, and a pause is remembered on this device.
 */
const STORAGE_KEY = "ad_hero_video_paused";

export default function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  const calm = useCalmMotion();

  // Keep the button honest about what the video is actually doing.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const sync = () => setPaused(video.paused);
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    sync();
    return () => {
      video.removeEventListener("play", sync);
      video.removeEventListener("pause", sync);
    };
  }, []);

  // Start (or stop) on load and whenever Calm motion is switched. Reads the
  // setting directly so the first pass doesn't start playing before the
  // stored choice has been picked up.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stored = false;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      // Storage blocked; fall back to the motion setting alone.
    }
    if (stored || readCalmMotion()) {
      video.pause();
    } else {
      video.play().catch(() => {
        // Autoplay refused (e.g. low-power mode): the poster shows instead.
      });
    }
  }, [calm]);

  function toggle() {
    const video = videoRef.current;
    if (!video) return;
    const next = !video.paused;
    if (next) video.pause();
    else video.play().catch(() => {});
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // Applies for this visit even if it can't be remembered.
    }
  }

  return (
    <>
      <video ref={videoRef} className="hero-bg" poster={poster} muted loop playsInline preload="metadata" aria-hidden="true">
        <source src={src} type="video/mp4" />
      </video>
      <button type="button" className="hero-video-toggle" onClick={toggle} aria-pressed={paused}>
        {paused ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor" /></svg>
        )}
        <span>{paused ? "Play background video" : "Pause background video"}</span>
      </button>
    </>
  );
}
