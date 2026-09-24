"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * A link that takes two taps: the first arms it, the second goes. For doors
 * that shouldn't open by a pocket tap — Call it off (Jose, 2026-09-24:
 * "make that a double press, and then it sends you to that section").
 */
export default function GarageDoubleTapLink({ href, label, armedLabel, className }: { href: string; label: string; armedLabel: string; className?: string }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() => (armed ? router.push(href) : setArmed(true))}
      onBlur={() => setArmed(false)}
    >
      {armed ? armedLabel : label}
    </button>
  );
}
