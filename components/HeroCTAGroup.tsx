import SubscribeButton from "./SubscribeButton";
import { socialLinks } from "@/lib/social";

/** Two-button hero CTA — newsletter + FB group side by side, framed in a
 *  soft gradient backdrop so it separates from the hero photo/copy behind
 *  it. Replaces the plain single "I Want In" link most hero sections used
 *  after the subscription-center rework flattened things out. */
export default function HeroCTAGroup({
  source,
  returnTo,
  subscribeLabel = "The Dirt Line",
}: {
  source: string;
  returnTo?: string;
  subscribeLabel?: string;
}) {
  return (
    <div className="hero-cta-backdrop">
      <div className="hero-cta-group">
        <SubscribeButton source={source} label={subscribeLabel} returnTo={returnTo} className="btn btn-primary" />
        <a href={socialLinks.facebookGroup} target="_blank" rel="noopener" className="btn btn-gradient">
          Join The FB Group
        </a>
      </div>
    </div>
  );
}
