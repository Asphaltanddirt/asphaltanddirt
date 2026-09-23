"use client";

import { useEffect, useState } from "react";

/**
 * "Turn on notifications on this device."
 *
 * Per device, not per person — this has to be tapped on every phone that
 * should buzz. iOS will only grant permission from a real tap inside the
 * installed Home Screen app, which is why this is a button and not something
 * that asks on page load.
 */

type State = "checking" | "unsupported" | "not-installed" | "blocked" | "off" | "on" | "working";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export default function GarageNotifications() {
  const [state, setState] = useState<State>("checking");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined") return;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // On iOS this is what a browser tab looks like — the APIs only appear
        // once the app has been added to the Home Screen.
        const standalone =
          window.matchMedia("(display-mode: standalone)").matches ||
          (window.navigator as unknown as { standalone?: boolean }).standalone === true;
        if (!cancelled) setState(standalone ? "unsupported" : "not-installed");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("blocked");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function turnOn() {
    setState("working");
    setMessage("");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "blocked" : "off");
        return;
      }

      const config = await fetch("/api/push/subscribe").then((r) => r.json());
      if (!config.configured || !config.publicKey) {
        setState("off");
        setMessage("Push isn't configured on the server yet.");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sub.toJSON(), label: `${navigator.platform || "Device"} · ${new Date().toLocaleDateString()}` }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save this device.");

      setState("on");
      setMessage(data.tested ? "Sent a test — you should see a banner." : "Saved. The test didn't send.");
    } catch (err) {
      setState("off");
      setMessage(err instanceof Error ? err.message : "That didn't work.");
    }
  }

  async function turnOff() {
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
      setMessage("This device won't be notified.");
    } catch {
      setState("on");
      setMessage("Couldn't turn it off.");
    }
  }

  if (state === "checking") return <p className="garage-form-note">Checking this device…</p>;

  if (state === "not-installed")
    return (
      <p className="garage-form-note">
        Add the Garage to your Home Screen first — Share → Add to Home Screen — then open it from there. iPhone only allows
        notifications from the installed app, not from a Safari tab.
      </p>
    );

  if (state === "unsupported") return <p className="garage-form-note">This device can&apos;t do push notifications.</p>;

  if (state === "blocked")
    return (
      <p className="garage-form-note">
        Notifications are blocked for the Garage. Turn them back on in iPhone Settings → Notifications → Garage, then come back.
      </p>
    );

  return (
    <>
      <button className="btn btn-outline btn-sm" onClick={state === "on" ? turnOff : turnOn} disabled={state === "working"}>
        {state === "working" ? "Working…" : state === "on" ? "Turn off on this device" : "Turn on for this device"}
      </button>
      {message && (
        <p className="garage-form-note" role="status">
          {message}
        </p>
      )}
    </>
  );
}
