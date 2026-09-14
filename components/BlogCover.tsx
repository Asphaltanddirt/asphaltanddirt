/**
 * Blog hero art is a designed thumbnail with headline text near its edges, and
 * posts come in different shapes (16:9, 3:2). A plain object-fit:cover crop in
 * a 16:10 card slices the text off. Same approach as EventCover: the whole image,
 * centered, over a blurred copy of itself that fills whatever frame it's in.
 */
export default function BlogCover({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="event-cover">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden="true" className="event-cover-backdrop" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="event-cover-img" />
    </div>
  );
}
