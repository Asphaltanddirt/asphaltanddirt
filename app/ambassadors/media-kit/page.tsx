import type { Metadata } from "next";
import Link from "next/link";
import CrewResourceLinks from "@/components/CrewResourceLinks";
import { socialLinks } from "@/lib/social";

export const metadata: Metadata = {
  title: "Road & Trail Crew Media Kit",
  description: "Logos, the Road & Trail Crew badge, brand colors, hashtags, story stickers and announcement posts for Asphalt & Dirt ambassadors.",
  robots: { index: false, follow: false },
};

type Asset = { src: string; file: string; title: string; note: string; alt: string; square?: boolean };

const LOGOS: Asset[] = [
  { src: "/images/branding/asphalt-and-dirt-horizontal.png", file: "asphalt-and-dirt-logo-horizontal.png", title: "Horizontal logo", note: "Wide placements: headers, banners, video overlays", alt: "Asphalt & Dirt horizontal logo" },
  { src: "/images/branding/asphalt-and-dirt-stacked.png", file: "asphalt-and-dirt-logo-stacked.png", title: "Stacked logo", note: "Square or compact placements: avatars, small badges", alt: "Asphalt & Dirt stacked logo" },
];

const BADGE: Asset = { src: "/img/ambassadors/road-trail-crew-badge.png", file: "road-and-trail-crew-badge.png", title: "Crew badge", note: "1254×1254, transparent background. Use it in your bio, link page, or anywhere you want to show you're part of the crew.", alt: "Road & Trail Crew badge", square: true };

const STICKERS: Asset[] = [
  { src: "/img/ambassadors/media-kit/sticker-now-repping-badge.png", file: "now-repping-badge-sticker.png", title: "Badge lockup", note: "The crew badge with “Now Repping”, centered on any photo", alt: "Now Repping — Road & Trail Crew badge sticker", square: true },
  { src: "/img/ambassadors/media-kit/sticker-now-repping-strip.png", file: "now-repping-strip-sticker.png", title: "Bottom strip", note: "Sits along the lower third of a vertical story", alt: "Now Repping bottom strip sticker", square: true },
];

const POSTS: Asset[] = [
  { src: "/img/ambassadors/media-kit/announcement-post.png", file: "road-and-trail-crew-announcement.png", title: "Type + mark", note: "Post as-is", alt: "I'm part of the Road & Trail Crew announcement", square: true },
  { src: "/img/ambassadors/media-kit/announcement-photo-frame.png", file: "road-and-trail-crew-announcement-photo-frame.png", title: "Photo frame", note: "Drop your own rig or portrait into the window before posting", alt: "I'm part of the Road & Trail Crew announcement with a photo frame", square: true },
];

const COLORS = [
  { name: "A&D Black", hex: "#000000" },
  { name: "Charcoal", hex: "#1A1A1A" },
  { name: "A&D Orange", hex: "#F86000" },
  { name: "Off-White", hex: "#F4F4F2" },
  { name: "A&D Gray", hex: "#BBB1AA" },
];

const HANDLES = [
  { platform: "Instagram", handle: "@Asphaltanddirtpodcast" },
  { platform: "TikTok", handle: "@Asphaltanddirtpodcast" },
  { platform: "YouTube", handle: "@Asphaltanddirtpodcast" },
  { platform: "X", handle: "@AsphaltandDirt_" },
  { platform: "Facebook", handle: "@TeamAsphaltanddirt" },
];

function AssetCard({ asset }: { asset: Asset }) {
  return (
    <div className="card media-kit-asset">
      <div className={asset.square ? "media-kit-preview is-square" : "media-kit-preview"}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={asset.src} alt={asset.alt} loading="lazy" />
      </div>
      <h3>{asset.title}</h3>
      <p>{asset.note}</p>
      <a className="btn btn-outline btn-sm media-kit-download" href={asset.src} download={asset.file}>
        Download PNG
      </a>
    </div>
  );
}

export default function MediaKitPage() {
  return (
    <section className="section-pt-tight section-pb-tight">
      <div className="container">
        <Link href="/ambassadors" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 18 5 12l6-6M5 12h14" /></svg>
          Back To Road &amp; Trail Crew
        </Link>
        <div className="eyebrow accent mt-3">Road &amp; Trail Crew</div>
        <h1 className="mt-2">Ambassador Media Kit</h1>
        <p className="lead mt-2" style={{ maxWidth: "62ch" }}>
          Everything you need to represent Asphalt &amp; Dirt online: logos, your crew badge, brand
          colors, hashtags, and ready-to-post graphics. Tap Download on anything you need. On a phone,
          you can also press and hold an image to save it to Photos.
        </p>
        <CrewResourceLinks current="/ambassadors/media-kit" />

        <h2 className="media-kit-h2">Logos</h2>
        <p className="media-kit-sub">Use them as they are. Don&apos;t stretch, recolor or change the logo.</p>
        <div className="grid grid-2 mt-3">
          {LOGOS.map((asset) => <AssetCard key={asset.file} asset={asset} />)}
        </div>

        <h2 className="media-kit-h2">Road &amp; Trail Crew Badge</h2>
        <p className="media-kit-sub">Your official ambassador mark.</p>
        <div className="grid grid-2 mt-3">
          <AssetCard asset={BADGE} />
        </div>

        <h2 className="media-kit-h2">Brand Colors</h2>
        <p className="media-kit-sub">If you&apos;re designing your own graphics and want them to feel on-brand. Headlines: Barlow Condensed (Black or ExtraBold). Body text: Inter.</p>
        <div className="media-kit-colors mt-3">
          {COLORS.map((color) => (
            <div key={color.hex} className="media-kit-color">
              <span className="media-kit-swatch" style={{ background: color.hex }} aria-hidden="true" />
              <strong>{color.name}</strong>
              <code>{color.hex}</code>
            </div>
          ))}
        </div>

        <h2 className="media-kit-h2">Hashtags &amp; Handles</h2>
        <p className="media-kit-sub">Tag us so we can see and share your content. Lead with #AsphaltAndDirtCrew on your ambassador posts; #TeamAsphaltAndDirt reaches the wider A&amp;D community.</p>
        <div className="grid grid-2 mt-3">
          <div className="card media-kit-list">
            <h3>Hashtags</h3>
            <ul>
              <li>#AsphaltAndDirtCrew</li>
              <li>#TeamAsphaltAndDirt</li>
              <li>#AsphaltAndDirt</li>
            </ul>
          </div>
          <div className="card media-kit-list">
            <h3>Handles</h3>
            <ul>
              {HANDLES.map((h) => (
                <li key={h.platform}>
                  <span>{h.platform}</span> {h.handle}
                </li>
              ))}
              <li>
                <span>Facebook Group</span>{" "}
                <a href={socialLinks.facebookGroup} target="_blank" rel="noopener">A&amp;D Road &amp; Trail Crew group</a>
              </li>
            </ul>
          </div>
        </div>

        <h2 className="media-kit-h2">Story Stickers</h2>
        <p className="media-kit-sub">Drop one over your own photo or video in an Instagram or TikTok story. Transparent PNG, 1080×1080.</p>
        <div className="grid grid-2 mt-3">
          {STICKERS.map((asset) => <AssetCard key={asset.file} asset={asset} />)}
        </div>

        <h2 className="media-kit-h2">Announcement Post</h2>
        <p className="media-kit-sub">Post one to announce you&apos;ve joined the crew. 1080×1080.</p>
        <div className="grid grid-2 mt-3">
          {POSTS.map((asset) => <AssetCard key={asset.file} asset={asset} />)}
        </div>

        <p className="media-kit-h2 text-center">
          <strong>A&amp;D Road &amp; Trail Crew.</strong> Real people. Real builds. Street to trail.
        </p>
      </div>
    </section>
  );
}
