import EmailCaptureForm from "./EmailCaptureForm";

export default function Footer({ bgImage }: { bgImage?: string }) {
  return (
    <>
      <section className="newsletter-band">
        {bgImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={bgImage} className="newsletter-bg" alt="" />
        )}
        <div className="container newsletter-inner">
          <div className="newsletter-copy">
            <h3>Stay In The Dirt</h3>
            <p>Get updates on new builds, episodes, events, merch drops, and more.</p>
          </div>
          <EmailCaptureForm source="footer" buttonText="Subscribe" />
          <div className="social-row">
            <a href="#" aria-label="Facebook">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 8.5h2.5V5H14c-2 0-3.5 1.5-3.5 3.5V11H8v3.5h2.5V21h3.5v-6.5h2.5l.5-3.5h-3V9c0-.5.3-.5.5-.5z" /></svg>
            </a>
            <a href="#" aria-label="Instagram">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" /></svg>
            </a>
            <a href="#" aria-label="TikTok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 3v11.5a3 3 0 1 1-2.4-2.9M13 3c.4 2.4 2 4 4.5 4.3" /></svg>
            </a>
            <a href="#" aria-label="YouTube">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="3" /><path d="M10.5 9.5v5l4.5-2.5z" fill="currentColor" stroke="none" /></svg>
            </a>
            <a href="#" aria-label="X">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l16 16M20 4 4 20" /></svg>
            </a>
          </div>
        </div>
      </section>
      <footer className="site-footer">
        <div className="container footer-row">
          <span>© 2026 Asphalt &amp; Dirt. All Rights Reserved.</span>
          <span className="footer-tagline">Where horsepower meets mud.</span>
          <div className="footer-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
            <a href="#">Contact</a>
          </div>
        </div>
      </footer>
    </>
  );
}
