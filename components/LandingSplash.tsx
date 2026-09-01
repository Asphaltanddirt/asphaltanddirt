import Link from "next/link";
import EmailCaptureForm from "./EmailCaptureForm";
import { socialLinks, podcastLinks } from "@/lib/social";

/**
 * Shared full-bleed one-pager used by both the domain "coming soon" gate
 * (app/coming-soon) and the permanent QR-code landing page (app/qr). Content
 * differs per caller via props; the visual frame and CTA blocks stay consistent.
 */
export default function LandingSplash({
  eyebrow,
  heading,
  description,
  source,
  enterSiteHref,
  enterSiteLabel = "Enter The Full Site",
}: {
  eyebrow: string;
  heading: string;
  description: string;
  /** Tags the newsletter signup for segmentation — see EmailCaptureForm. */
  source: string;
  /** When set, shows a primary CTA into the full site above the newsletter form. */
  enterSiteHref?: string;
  enterSiteLabel?: string;
}) {
  return (
    <section className="splash">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/img/home/hero.jpg" className="splash-bg" alt="" />
      <div className="splash-scrim" />
      <div className="container splash-inner">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/branding/asphalt-and-dirt-stacked.png"
          alt="Asphalt & Dirt"
          className="splash-logo"
        />
        <div className="eyebrow accent">{eyebrow}</div>
        <h1 className="mt-2">{heading}</h1>
        <p className="lead splash-lead">{description}</p>

        {enterSiteHref && (
          <Link href={enterSiteHref} className="btn btn-primary splash-enter-btn">
            {enterSiteLabel}
          </Link>
        )}

        <div className="splash-newsletter">
          <EmailCaptureForm source={source} buttonText="Subscribe" />
        </div>

        <div className="splash-listen">
          <span className="splash-listen-label">Listen Now</span>
          <div className="splash-listen-links">
            <a href={podcastLinks.spotify} target="_blank" rel="noopener">Spotify</a>
            <a href={podcastLinks.apple} target="_blank" rel="noopener">Apple Podcasts</a>
            <a href={podcastLinks.youtube} target="_blank" rel="noopener">YouTube</a>
          </div>
        </div>

        <div className="social-row splash-social">
          <a href={socialLinks.facebook} target="_blank" rel="noopener" aria-label="Facebook">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 8.5h2.5V5H14c-2 0-3.5 1.5-3.5 3.5V11H8v3.5h2.5V21h3.5v-6.5h2.5l.5-3.5h-3V9c0-.5.3-.5.5-.5z" /></svg>
          </a>
          <a href={socialLinks.instagram} target="_blank" rel="noopener" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" /></svg>
          </a>
          <a href={socialLinks.tiktok} target="_blank" rel="noopener" aria-label="TikTok">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3v11.5a3 3 0 1 1-2.4-2.9M13 3c.4 2.4 2 4 4.5 4.3" /></svg>
          </a>
          <a href={socialLinks.youtube} target="_blank" rel="noopener" aria-label="YouTube">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="3" /><path d="M10.5 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" /></svg>
          </a>
          <a href={socialLinks.x} target="_blank" rel="noopener" aria-label="X">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l16 16M20 4 4 20" /></svg>
          </a>
        </div>

        <a href={socialLinks.facebookGroup} target="_blank" rel="noopener" className="btn btn-outline btn-sm splash-fb-group">
          Join The Facebook Group
        </a>

        <span className="splash-footer-note">© 2026 Asphalt &amp; Dirt. All Rights Reserved.</span>
      </div>
    </section>
  );
}
