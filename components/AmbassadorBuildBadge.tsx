// The Road & Trail Crew emblem, shown on builds submitted by active
// ambassadors. `placement` just picks a CSS hook — "thumb" overlays the
// listing image, "hero" / "card" sit inline near a heading.
//
// Interim art: components/../public/img/ambassadors/road-trail-crew-badge.png
// is the current Gear Crew badge draft. Swap that file (same path, same
// square aspect) when the finalized badge art lands — no code change needed.
export default function AmbassadorBuildBadge({
  placement = "thumb",
}: {
  placement?: "thumb" | "hero" | "card";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/img/ambassadors/road-trail-crew-badge.png"
      alt="Asphalt & Dirt Road & Trail Crew — official ambassador build"
      className={`ambassador-build-badge is-${placement}`}
      width={64}
      height={64}
    />
  );
}
