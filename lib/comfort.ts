"use client";

import { useSyncExternalStore } from "react";

/**
 * Comfort settings: a few visitor choices remembered on this device only
 * (localStorage, no account, nothing sent anywhere). Set from the footer's
 * "Comfort settings" panel; read by the pieces of the site they change.
 *
 * - Calm motion: the home video and Community photo deck stay still, and
 *   decorative CSS animation is switched off. With no choice made, it follows
 *   the device's "reduce motion" setting.
 * - Captions: YouTube players start with captions on (same preference as the
 *   Captions button under every video).
 * - Optional boxes start unchecked: opt-in boxes that are normally pre-ticked
 *   (e.g. the RSVP list sign-ups) start empty instead.
 */

const MOTION_KEY = "ad_comfort_motion"; // "calm" | "moving"; unset = follow the device
const CAPTIONS_KEY = "ad_captions"; // "on" | "off" (predates the panel)
const OPTIONAL_KEY = "ad_comfort_optional_unchecked"; // "1" | "0"
const CHANGE_EVENT = "ad-comfort-change";
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private mode etc.): the change still applies to this page.
    memory.set(key, value);
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Fallback for browsers that refuse storage, so a toggle still sticks until reload.
const memory = new Map<string, string>();
function get(key: string): string | null {
  return read(key) ?? memory.get(key) ?? null;
}

export function deviceWantsReducedMotion(): boolean {
  return window.matchMedia?.(REDUCE_QUERY).matches ?? false;
}

export function readCalmMotion(): boolean {
  const stored = get(MOTION_KEY);
  if (stored === "calm") return true;
  if (stored === "moving") return false;
  return deviceWantsReducedMotion();
}

/** True when the visitor hasn't chosen and the device setting is deciding. */
export function readMotionFollowsDevice(): boolean {
  const stored = get(MOTION_KEY);
  return stored !== "calm" && stored !== "moving";
}

export function writeCalmMotion(calm: boolean) {
  write(MOTION_KEY, calm ? "calm" : "moving");
}

export function readCaptionsPref(): boolean {
  return get(CAPTIONS_KEY) === "on";
}

export function writeCaptionsPref(on: boolean) {
  write(CAPTIONS_KEY, on ? "on" : "off");
}

export function readOptionalUnchecked(): boolean {
  return get(OPTIONAL_KEY) === "1";
}

export function writeOptionalUnchecked(unchecked: boolean) {
  write(OPTIONAL_KEY, unchecked ? "1" : "0");
}

// Every component using a setting updates together, including when another tab
// changes it (storage event) or the device's motion setting flips.
function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  const query = window.matchMedia?.(REDUCE_QUERY);
  query?.addEventListener("change", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    query?.removeEventListener("change", onChange);
  };
}

const serverFalse = () => false;

export function useCalmMotion(): boolean {
  return useSyncExternalStore(subscribe, readCalmMotion, serverFalse);
}

export function useMotionFollowsDevice(): boolean {
  return useSyncExternalStore(subscribe, readMotionFollowsDevice, () => true);
}

export function useCaptionsPref(): boolean {
  return useSyncExternalStore(subscribe, readCaptionsPref, serverFalse);
}

export function useOptionalUnchecked(): boolean {
  return useSyncExternalStore(subscribe, readOptionalUnchecked, serverFalse);
}
