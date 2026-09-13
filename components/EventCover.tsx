const FALLBACK_IMAGE = { src: "/img/community/pine-barrens.jpg", alt: "Jeeps on a Pine Barrens trail ride" };

/**
 * Event cover art is usually a flyer — portrait, square, whatever the
 * designer made — so a plain object-fit:cover crop chops the date or title
 * off. This shows the whole image, centered, over a blurred copy of itself
 * that fills whatever frame the parent gives it (card, list thumb, hero).
 */
export default function EventCover({ photoUrl, title }: { photoUrl?: string | null; title: string }) {
  const src = photoUrl || FALLBACK_IMAGE.src;
  const alt = photoUrl ? title : FALLBACK_IMAGE.alt;
  return (
    <div className="event-cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" className="event-cover-backdrop" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="event-cover-img" />
    </div>
  );
}
