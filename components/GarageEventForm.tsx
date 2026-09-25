"use client";

import { TRAIL_RATINGS, TRAIL_RATING_COLORS } from "@/lib/trailRating";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { compressImage } from "@/lib/imageCompress";
import type { EditableEvent, EventEdit, VenueOption } from "@/lib/garageEventEditor";

// Kept in step with EVENT_STATUSES / VENUE_TYPES in lib/garageEventEditor.ts
// (that file is server-only, so the lists are repeated here).
const STATUSES = [
  { value: "Draft", label: "Draft", help: "Not shown anywhere yet." },
  { value: "Published", label: "Published", help: "Live on /events, open for RSVPs." },
  { value: "Unlisted", label: "Unlisted", help: "Works by direct link only. Not in lists, search or the newsletter." },
  { value: "Crew Only", label: "Crew ride", help: "Garage only. No public page, no RSVPs. Still gets a Drive folder." },
  { value: "Cancelled", label: "Cancelled", help: "Pulled. RSVPs can still be emailed the news." },
] as const;
const VENUE_TYPES = [
  { value: "State Forest (NJ)", help: "Adds the NJ state forest vehicle and conduct rules." },
  { value: "Private Land", help: "Adds the landowner-permission rules." },
  { value: "Off-Road Park", help: "Adds the park's own rules, pass and waiver (pick the park below)." },
  { value: "Race Track", help: "Track days and circuit events." },
];

// Which side this event is. Required — it seeds the primary tag on every file
// uploaded to the event's folder, so footage arrives already sorted into the
// bucket a posting slot draws from. Deciding it here, once, is what stops
// anything reaching the library untagged.
const EVENT_TYPES = [
  { value: "Dirt", help: "Offroad — trail, mud, park, overland." },
  { value: "Asphalt", help: "Onroad — street, track, car show, meets, cruise." },
  { value: "Both", help: "Genuinely both, e.g. a street cruise out to a trailhead." },
];

const EMPTY: EventEdit = {
  title: "",
  date: "",
  status: "Draft",
  eventType: "" as EventEdit["eventType"],
  generalArea: "",
  publicBlurb: "",
  atAGlance: "",
  requirements: "",
  venueTypes: [],
  venueIds: [],
  facebookEventUrl: "",
  meetupPoint: "",
  showMeetupPublicly: false,
  fullDetails: "",
  recap: "",
  trailRating: "",
};

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Add or edit an event: everything the Airtable "Add an Event" interface had,
 *  laid out for a phone. Public and private parts are kept visibly apart. */
export default function GarageEventForm({ initial, venues }: { initial: EditableEvent | null; venues: VenueOption[] }) {
  const router = useRouter();
  const start: EventEdit = initial ? { ...EMPTY, ...initial } : EMPTY;
  const [form, setForm] = useState<EventEdit>(start);
  const [saved, setSaved] = useState<EventEdit>(start);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl || "");
  const [photoBusy, setPhotoBusy] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const wasLive = initial && initial.status !== "Draft" && initial.status !== "Crew Only";
  const titleChanged = Boolean(initial && wasLive && form.title.trim() !== initial.title);
  const isPast = Boolean(form.date) && form.date < new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof EventEdit>(key: K, value: EventEdit[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setNote("");
  };
  const text = (key: keyof EventEdit) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(key, e.target.value as never),
  });
  const toggle = (key: "venueTypes" | "venueIds", value: string) =>
    set(key, form[key].includes(value) ? form[key].filter((v) => v !== value) : [...form[key], value]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/garage/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, id: initial?.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the event. Try again.");
      const event = data.event as EditableEvent;
      const next = { ...EMPTY, ...event };
      setSaved(next);
      setForm(next);
      if (!initial) {
        router.replace(`/garage/events/edit/${event.id}?created=1`);
        return;
      }
      setNote(
        event.status === "Draft" || event.status === "Cancelled" || event.driveFolderUrl
          ? "Saved."
          : "Saved. Its Drive folders are being made now.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the event. Try again.");
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !initial) return;
    setPhotoBusy(true);
    setError("");
    try {
      const small = await compressImage(file);
      const res = await fetch("/api/garage/event/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initial.id, filename: small.name, contentType: small.type, base64: await toBase64(small) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't save the photo. Try again.");
      setPhotoUrl(data.photoUrl || "");
      setNote("Photo saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the photo. Try again.");
    } finally {
      setPhotoBusy(false);
    }
  }

  return (
    <form className={`garage-form garage-event-form${dirty ? " is-dirty" : ""}`} onSubmit={save} noValidate>
      <section className="garage-panel">
        <h2>The basics</h2>
        <label htmlFor="ev-title">Title</label>
        <input id="ev-title" {...text("title")} required maxLength={120} autoComplete="off" />
        {titleChanged && (
          <p className="garage-form-note garage-warn">
            Changing the title changes the event&apos;s web address. Links already shared (Facebook, emails) will stop working.
          </p>
        )}

        <label htmlFor="ev-date">Date</label>
        <input id="ev-date" type="date" {...text("date")} />

        <fieldset className="garage-choice-group">
          <legend>Status</legend>
          {STATUSES.map((s) => (
            <label key={s.value} className="garage-choice">
              <input type="radio" name="status" value={s.value} checked={form.status === s.value} onChange={() => set("status", s.value)} />
              <span>
                <strong>{s.label}</strong>
                <small>{s.help}</small>
              </span>
            </label>
          ))}
        </fieldset>
      </section>

      <section className="garage-panel">
        <h2>Photo</h2>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="garage-event-form-photo" />
        ) : (
          <p className="garage-form-note">No photo yet.</p>
        )}
        {initial ? (
          <label className="btn btn-outline btn-sm garage-file-btn">
            {photoBusy ? "Uploading…" : photoUrl ? "Replace photo" : "Add photo"}
            <input type="file" accept="image/*" onChange={uploadPhoto} disabled={photoBusy} className="sr-only" />
          </label>
        ) : (
          <p className="garage-form-note">Save the event first, then add its photo.</p>
        )}
      </section>

      <section className="garage-panel">
        <h2>Public: everyone sees this</h2>
        <label htmlFor="ev-area">General area</label>
        <input id="ev-area" {...text("generalArea")} placeholder="Pine Barrens, NJ" aria-describedby="ev-area-help" />
        <p id="ev-area-help" className="garage-form-note">Keep it general. The exact spot goes in the private section.</p>

        <label htmlFor="ev-blurb">Blurb</label>
        <textarea id="ev-blurb" rows={4} {...text("publicBlurb")} />

        <label htmlFor="ev-glance">At a glance</label>
        <textarea id="ev-glance" rows={4} {...text("atAGlance")} placeholder={"Meet: 9:30 AM\nRoll out: 10:00 AM sharp\nVehicle: 4x4 required"} aria-describedby="ev-glance-help" />
        <p id="ev-glance-help" className="garage-form-note">One per line as Label: Value. Never the exact meetup spot.</p>

        <label htmlFor="ev-req">Requirements</label>
        <textarea id="ev-req" rows={4} {...text("requirements")} placeholder={"GMRS or FRS radio in every vehicle\nFull-size spare"} aria-describedby="ev-req-help" />
        <p id="ev-req-help" className="garage-form-note">One per line. People tick a box agreeing to these when they RSVP.</p>

        <fieldset className="garage-choice-group">
          <legend>A&amp;D Trail Rating</legend>
          {[{ value: "", name: "None", plain: "Car shows, meets, meals" }, ...TRAIL_RATING_COLORS.map((c) => ({ value: c, name: `${c} · ${TRAIL_RATINGS[c].name}`, plain: TRAIL_RATINGS[c].plain }))].map((r) => (
            <label key={r.value || "none"} className="garage-choice">
              <input type="radio" name="trailRating" checked={form.trailRating === r.value} onChange={() => setForm((f) => ({ ...f, trailRating: r.value }))} />
              <span>
                <strong>{r.name}</strong>
                <small>{r.plain}</small>
              </span>
            </label>
          ))}
          <p className="garage-form-note">Shows as a badge on the event page and in the RSVP email, with that level&apos;s standard lines.</p>
        </fieldset>

        <fieldset className="garage-choice-group">
          <legend>Asphalt or dirt?</legend>
          {EVENT_TYPES.map((t) => (
            <label key={t.value} className="garage-choice">
              <input
                type="radio"
                name="eventType"
                checked={form.eventType === t.value}
                onChange={() => setForm((f) => ({ ...f, eventType: t.value as EventEdit["eventType"] }))}
              />
              <span>
                <strong>{t.value}</strong>
                <small>{t.help}</small>
              </span>
            </label>
          ))}
          <p className="garage-form-note">
            Tags every clip uploaded to this event. Go by where it is, not what is in it — a Jeep at a car show is
            asphalt.
          </p>
        </fieldset>

        <fieldset className="garage-choice-group">
          <legend>Where it rides</legend>
          {VENUE_TYPES.map((t) => (
            <label key={t.value} className="garage-choice">
              <input type="checkbox" checked={form.venueTypes.includes(t.value)} onChange={() => toggle("venueTypes", t.value)} />
              <span>
                <strong>{t.value}</strong>
                <small>{t.help}</small>
              </span>
            </label>
          ))}
        </fieldset>

        {venues.length > 0 && (
          <fieldset className="garage-choice-group">
            <legend>Park or venue</legend>
            {venues.map((v) => (
              <label key={v.id} className="garage-choice">
                <input type="checkbox" checked={form.venueIds.includes(v.id)} onChange={() => toggle("venueIds", v.id)} />
                <span>
                  <strong>{v.name}</strong>
                  {v.type && <small>{v.type}</small>}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        <label htmlFor="ev-fb">Facebook event link</label>
        <input id="ev-fb" type="url" inputMode="url" {...text("facebookEventUrl")} placeholder="https://facebook.com/events/…" />
      </section>

      <section className="garage-panel garage-panel-private">
        <h2>Private: only people who RSVP</h2>
        <label htmlFor="ev-meet">Meetup point</label>
        <textarea id="ev-meet" rows={3} {...text("meetupPoint")} placeholder="Wawa, 4 NJ-72, Vincentown, NJ. Meet 9:30, roll out 10:00." />
        <label className="garage-choice garage-choice-inline">
          <input type="checkbox" checked={form.showMeetupPublicly} onChange={(e) => set("showMeetupPublicly", e.target.checked)} />
          <span>
            <strong>Show the meetup point publicly</strong>
            <small>Only for a well-known public spot, like a gas station lot.</small>
          </span>
        </label>

        <label htmlFor="ev-details">Full details</label>
        <textarea id="ev-details" rows={6} {...text("fullDetails")} aria-describedby="ev-details-help" />
        <p id="ev-details-help" className="garage-form-note">Parking, what to bring, the plan. Emailed to RSVPs, never on the public page.</p>
      </section>

      {(isPast || form.recap) && (
        <section className="garage-panel">
          <h2>After the event</h2>
          <label htmlFor="ev-recap">Recap</label>
          <textarea id="ev-recap" rows={6} {...text("recap")} aria-describedby="ev-recap-help" />
          <p id="ev-recap-help" className="garage-form-note">Shown on the event page once the date has passed.</p>
        </section>
      )}

      <div className="garage-event-form-save">
        {error && (
          <p className="garage-error" role="alert" tabIndex={-1} ref={errorRef}>
            {error}
          </p>
        )}
        <p className="garage-form-note" aria-live="polite">
          {note || (dirty ? "Unsaved changes." : "")}
        </p>
        <button type="submit" className="btn btn-primary garage-block-btn" disabled={busy || (!dirty && Boolean(initial))}>
          {busy ? "Saving…" : initial ? "Save changes" : "Add event"}
        </button>
      </div>
    </form>
  );
}
