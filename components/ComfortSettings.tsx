"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import {
  useCalmMotion,
  useCaptionsPref,
  useMotionFollowsDevice,
  useOptionalUnchecked,
  writeCalmMotion,
  writeCaptionsPref,
  writeOptionalUnchecked,
} from "@/lib/comfort";

/** Marks <html> while Calm motion is on so CSS can switch off decorative
 *  animation site-wide. Rendered once in the root layout (every page,
 *  including the ones without the footer). */
export function ComfortMotionRoot() {
  const calm = useCalmMotion();
  useEffect(() => {
    if (calm) document.documentElement.dataset.calmMotion = "1";
    else delete document.documentElement.dataset.calmMotion;
  }, [calm]);
  return null;
}

function Switch({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: React.ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="comfort-row">
      <div className="comfort-row-text">
        <span className="comfort-row-label" id={`${id}-label`}>
          {label}
        </span>
        <span className="comfort-row-desc" id={`${id}-desc`}>
          {description}
        </span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        aria-describedby={`${id}-desc`}
        className={`comfort-switch${checked ? " on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span className="comfort-switch-knob" aria-hidden="true" />
        <span className="comfort-switch-state" aria-hidden="true">
          {checked ? "On" : "Off"}
        </span>
      </button>
    </div>
  );
}

/** Footer link + the Comfort settings panel. A native <dialog> opened with
 *  showModal(), so focus moves in, stays in, Escape closes it and focus goes
 *  back to the link. */
export default function ComfortSettings() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const calm = useCalmMotion();
  const followsDevice = useMotionFollowsDevice();
  const captions = useCaptionsPref();
  const optionalUnchecked = useOptionalUnchecked();

  function open() {
    dialogRef.current?.showModal();
    track("comfort_settings_open", {});
  }

  return (
    <>
      <button type="button" className="footer-link-button" onClick={open}>
        Comfort Settings
      </button>
      <dialog
        ref={dialogRef}
        className="comfort-dialog"
        aria-labelledby="comfort-title"
        // Clicking the dimmed backdrop (the dialog element itself) closes it.
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        // Browsers close a modal dialog on Escape themselves, but not every one
        // reliably does (and some need a prior click), so handle it here too.
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            dialogRef.current?.close();
            return;
          }
          // Keep Tab cycling inside the panel instead of stepping out to the
          // browser for one press (re-test 2026-09-17).
          if (e.key !== "Tab" || !dialogRef.current) return;
          const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        <div className="comfort-inner">
          <div className="comfort-head">
            <h2 id="comfort-title" className="comfort-title">
              Comfort Settings
            </h2>
            <button
              type="button"
              className="icon-btn"
              aria-label="Close comfort settings"
              onClick={() => dialogRef.current?.close()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <p className="comfort-intro">
            Make the site calmer or easier to use. These are saved on this device only.
          </p>

          <Switch
            id="comfort-motion"
            label="Calm motion"
            description={
              <>
                The home video and photo slideshows stay still, and animations are switched off.
                {followsDevice && calm && " On because your device asks for reduced motion."}
              </>
            }
            checked={calm}
            onChange={(next) => {
              writeCalmMotion(next);
              track("comfort_setting", { setting: "calm_motion", value: next ? "on" : "off" });
            }}
          />
          <Switch
            id="comfort-captions"
            label="Captions on"
            description="Videos start with captions turned on."
            checked={captions}
            onChange={(next) => {
              writeCaptionsPref(next);
              track("comfort_setting", { setting: "captions", value: next ? "on" : "off" });
            }}
          />
          <Switch
            id="comfort-optional"
            label="Start optional boxes unchecked"
            description="Optional sign-up boxes, like joining our email lists when you RSVP, start empty so you only get what you tick."
            checked={optionalUnchecked}
            onChange={(next) => {
              writeOptionalUnchecked(next);
              track("comfort_setting", { setting: "optional_unchecked", value: next ? "on" : "off" });
            }}
          />

          <button type="button" className="btn btn-primary btn-block mt-4" onClick={() => dialogRef.current?.close()}>
            Done
          </button>
        </div>
      </dialog>
    </>
  );
}
