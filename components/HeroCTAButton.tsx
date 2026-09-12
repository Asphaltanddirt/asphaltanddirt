import Link from "next/link";

/** Single-button version of the hero CTA standard — same size/backdrop
 *  treatment as HeroCTAGroup, for heroes that only need one action
 *  (a page link, not a newsletter+FB pair). */
export default function HeroCTAButton({
  href,
  label,
  variant = "orange",
  external = false,
}: {
  href: string;
  label: string;
  variant?: "orange" | "gradient";
  external?: boolean;
}) {
  const className = `btn ${variant === "gradient" ? "btn-gradient" : "btn-primary"}`;
  return (
    <div className="hero-cta-backdrop">
      {external ? (
        <a href={href} target="_blank" rel="noopener" className={className}>
          {label}
        </a>
      ) : (
        <Link href={href} className={className}>
          {label}
        </Link>
      )}
    </div>
  );
}
