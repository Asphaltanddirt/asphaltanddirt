import type { Guest } from "@/lib/episodes";
import { SocialIcon } from "@/lib/socialIcons";

const PERSON_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.9 3.1-7 7-7s7 3.1 7 7" />
  </svg>
);

export default function GuestRow({ guest }: { guest: Guest }) {
  return (
    <div className="guest-row">
      <div className="guest-row-photo">
        {guest.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={guest.photo} alt={guest.name} />
        ) : (
          PERSON_ICON
        )}
      </div>
      <div>
        <h3 className="mb-0">{guest.name}</h3>
        {guest.bio && <p className="guest-row-bio">{guest.bio}</p>}
      </div>
      {guest.socialLinks?.length ? (
        <div className="social-row">
          {guest.socialLinks.map((s) => (
            <a key={s.platform + s.url} href={s.url} target="_blank" rel="noopener" aria-label={`${guest.name} on ${s.platform}`}>
              <SocialIcon platform={s.platform} />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
