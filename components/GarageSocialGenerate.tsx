"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/** Builds a week's posts from the Posting Schedule (normally the daily cron does it). */
export default function GarageSocialGenerate({ week }: { week: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        className="btn btn-primary btn-sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const res = await fetch("/api/garage/social", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "generate", week }),
            });
            if (!res.ok) throw new Error();
            router.refresh();
          } catch {
            setError("Couldn't build the week. Try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Building…" : "Build this week from the schedule"}
      </button>
      {error && <p className="garage-error">{error}</p>}
    </>
  );
}
