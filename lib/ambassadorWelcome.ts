/**
 * The two Road & Trail Crew welcome emails, ported from the "Welcome Email
 * Template" artifact (keep in sync with it):
 *
 *   Part 1 — sent on approval. Explains the program, asks for the signed
 *            agreement. NO code or tracking link.
 *   Part 2 — sent once the agreement is signed AND the promo code +
 *            tracking link are on the Ambassador record. The code reveal.
 *
 * Sent from our own code via lib/resendEmail.ts (see
 * /api/ambassador-welcome). Replaces the old "paste into Kit" flow.
 */

const LOGO = "https://www.asphaltanddirt.com/images/branding/asphalt-and-dirt-horizontal.png";
const SITE = "https://asphaltanddirt.com";
const MEDIA_KIT_URL = "https://claude.ai/code/artifact/6e4b1b2f-8986-427e-85d8-a18894f79cef";
const CREW_EMAIL = "crew@asphaltanddirt.com";

// tier -> { rate %, tier label } — mirrors the Ambassadors "Expected Rate"
// formula and TIER_RATE in /api/accept-agreement.
const TIER_INFO: Record<string, { rate: string; label: string }> = {
  "Road & Trail Member": { rate: "10%", label: "Tier 1" },
  "Featured Ambassador": { rate: "12%", label: "Tier 2" },
  "Crew Partner": { rate: "15%", label: "Tier 3" },
};

function esc(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function firstNameOf(fullName: string) {
  return (fullName || "").trim().split(/\s+/)[0] || "there";
}

/** Shared shell: preview text, off-white ground, 600px white card with a
 *  black logo header, and the crew footer. `bodyRows` is the `<tr>...`
 *  content between header and footer. */
function shell(previewText: string, bodyRows: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background-color:#f4f4f2;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${esc(previewText)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;">
      <tr>
        <td align="center" style="background-color:#000000;padding:32px 24px;">
          <img src="${LOGO}" width="220" alt="Asphalt &amp; Dirt" style="display:block;width:220px;max-width:100%;height:auto;border:0;">
        </td>
      </tr>
      ${bodyRows}
      <tr>
        <td align="center" style="padding:40px 32px 32px;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#948c81;">&copy; 2026 Asphalt &amp; Dirt &nbsp;&middot;&nbsp; <a href="mailto:${CREW_EMAIL}" style="color:#948c81;">${CREW_EMAIL}</a></p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export interface WelcomeEmail {
  subject: string;
  html: string;
}

// ---------------------------------------------------------------------------
// Part 1 — on approval, no code
// ---------------------------------------------------------------------------

export function buildWelcomePart1(input: { name: string; tier?: string }): WelcomeEmail {
  const first = esc(firstNameOf(input.name));
  const tier = input.tier && TIER_INFO[input.tier] ? input.tier : "Road & Trail Member";
  const { rate, label } = TIER_INFO[tier];

  const bodyRows = `
      <tr>
        <td align="center" style="padding:40px 32px 8px;">
          <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#f86000;">Road &amp; Trail Crew</p>
          <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:32px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;color:#1a1712;">You're In.</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
          <p style="margin:0 0 16px;">Hey ${first},</p>
          <p style="margin:0 0 16px;">Welcome to the A&amp;D Road &amp; Trail Crew. We built this program around people who actually participate in automotive culture — builders, drivers, riders, photographers, organizers, families, creators, and the people who keep showing up.</p>
          <p style="margin:0 0 16px;">You were selected because we believe you bring something real to that mix.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;border:1px solid #ded9d3;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#1a1712;">Your starting tier: ${esc(tier)} — ${label}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#4a453f;">
                <tr><td style="padding:2px 0;">&bull;&nbsp; ${rate} customer discount code</td></tr>
                <tr><td style="padding:2px 0;">&bull;&nbsp; ${rate} commission on eligible tracked net merchandise sales</td></tr>
                <tr><td style="padding:2px 0;">&bull;&nbsp; A welcome merch package, on us — more on that below</td></tr>
                <tr><td style="padding:2px 0;">&bull;&nbsp; Road &amp; Trail Crew badge and digital media kit</td></tr>
                <tr><td style="padding:2px 0;">&bull;&nbsp; Repost and feature opportunities</td></tr>
                <tr><td style="padding:2px 0;">&bull;&nbsp; Early product announcements</td></tr>
                <tr><td style="padding:2px 0;">&bull;&nbsp; Eligibility for future product-seeding campaigns</td></tr>
              </table>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
          <p style="margin:0;">As part of getting you set up, we'll be sending along a small welcome merch package to get you started — no action needed on your end, just watch your inbox/mailbox.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 0;">
          <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#1a1712;">Complete these steps to activate your ambassador code:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.9;color:#4a453f;">
            <tr><td>1.&nbsp; <a href="${SITE}/ambassadors" style="color:#f86000;text-decoration:underline;">Review the program overview</a></td></tr>
            <tr><td>2.&nbsp; <a href="${SITE}/ambassadors/agreement" style="color:#f86000;text-decoration:underline;">Review and accept the Brand Ambassador Agreement</a></td></tr>
            <tr><td>3.&nbsp; Confirm your profile, social handles, and vehicle/build info (same form)</td></tr>
            <tr><td>4.&nbsp; <a href="${MEDIA_KIT_URL}" style="color:#f86000;text-decoration:underline;">Download your Ambassador Media Kit</a></td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f2;border:1px solid #ded9d3;">
            <tr><td style="padding:20px 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#4a453f;">
              <strong style="color:#1a1712;">What happens next:</strong> once we've got your signed agreement back, we'll follow up with your personal discount code and tracking link so you can start sharing and earning.
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 0;">
          <p style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:#1a1712;">Your first campaign: Where Asphalt Meets Dirt</p>
          <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">Introduce yourself, show your vehicle or current build, tell people where you come from in automotive culture, and answer one question: <strong style="color:#1a1712;">what do you want automotive culture to become?</strong></p>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">Street. Trail. Track. Overland. Two wheels. Four wheels. Whatever your corner of the culture looks like — show us. Tag <strong style="color:#f86000;">#AsphaltAndDirtCrew</strong> and <strong style="color:#f86000;">#TeamAsphaltAndDirt</strong> when it fits.</p>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:28px 32px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td align="center" style="background-color:#f86000;">
              <a href="${SITE}/qr" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:#000000;text-decoration:none;">Explore Asphalt &amp; Dirt</a>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
          <p style="margin:0 0 16px;">And remember: we picked you because of what you already bring to the culture. Don't turn your feed into an A&amp;D commercial. Keep building. Keep driving. Keep creating. Bring us into the story naturally.</p>
          <p style="margin:0;font-weight:bold;color:#1a1712;">Real people. Real builds. Street to trail. Welcome to the crew.</p>
          <p style="margin:8px 0 0;color:#1a1712;">&mdash; Asphalt &amp; Dirt</p>
        </td>
      </tr>`;

  return {
    subject: "You're in — welcome to the A&D Road & Trail Crew",
    html: shell("You're in. Welcome to the A&D Road & Trail Crew — here's what happens next.", bodyRows),
  };
}

// ---------------------------------------------------------------------------
// Part 2 — after signed agreement + code, the reveal
// ---------------------------------------------------------------------------

export function buildWelcomePart2(input: {
  name: string;
  code: string;
  trackingLink: string;
}): WelcomeEmail {
  const first = esc(firstNameOf(input.name));
  const code = esc(input.code);
  const link = esc(input.trackingLink);

  const bodyRows = `
      <tr>
        <td align="center" style="padding:40px 32px 8px;">
          <p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;color:#f86000;">Road &amp; Trail Crew</p>
          <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:28px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;color:#1a1712;">You're All Set.</h1>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
          <p style="margin:0 0 16px;">Hey ${first},</p>
          <p style="margin:0 0 16px;">Got your signed agreement — you're fully onboarded. Here's your personal code and tracking link.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:8px 32px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#000000;">
            <tr><td style="padding:20px 24px;">
              <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#bbb1aa;">Your Customer Code</p>
              <p style="margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:900;color:#f86000;">${code}</p>
              <p style="margin:0 0 4px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1.5px;text-transform:uppercase;color:#bbb1aa;">Your Tracking Link</p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;"><a href="${link}" style="color:#f4f4f2;text-decoration:underline;">${link}</a></p>
            </td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
          <p style="margin:0 0 16px;">Share the code for the discount, share the link for the tracking — either one credits your account. Commission is paid on eligible tracked net merch sales.</p>
          <p style="margin:0;">Your welcome merch package (patch, stickers, shirt) ships separately — watch your mailbox.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:32px 32px 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#4a453f;">
          <p style="margin:0;font-weight:bold;color:#1a1712;">Real people. Real builds. Street to trail. Glad to have you.</p>
          <p style="margin:8px 0 0;color:#1a1712;">&mdash; Asphalt &amp; Dirt</p>
        </td>
      </tr>`;

  return {
    subject: "You're all set — your Asphalt & Dirt code and tracking link",
    html: shell("You're all set — here's your Asphalt & Dirt code and tracking link.", bodyRows),
  };
}
