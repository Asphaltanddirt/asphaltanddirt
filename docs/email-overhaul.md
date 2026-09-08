# Email overhaul — status & plan

_Kit's free plan dropped automations/sequences → the whole email stack is
moving to **Resend (send) + Airtable (list, source of truth)**, driven from
this app's own code. One Resend account will serve every future brand
(A&D + personal brands + a school PPO); ~$0 now → Resend Pro $20/mo flat
once past ~3 brands or >100 sends/day._

Full project context lives in the iCloud folder `START-HERE.md` (not in
this repo). This file is the repo-side pointer so a session working only
from the code can pick up.

---

## Phase 1 — Newsletter distribution ✅ DONE (deployed)

- `lib/newsletterSubscribers.ts` — Airtable Newsletter base
  `appuaFFyGs91ZJ6Rr`, table `Subscribers`, is the source of truth.
  `addSubscriber` / `listActiveRecipients` / `unsubscribeByToken`.
  `syncNewsletterSubscribers` is now a one-time Kit→Airtable migration
  only (already run — 13 subs migrated, all have Brand + Unsubscribe
  Token).
- `lib/newsletter.ts` — provider-agnostic builders `buildBlogAnnouncement`
  and `buildWeeklyDigest`, plus `wrapNewsletterEmail` (CAN-SPAM footer +
  per-recipient unsubscribe).
- `lib/newsletterSend.ts` — `sendNewsletter(content, "test" | "live")`
  via Resend batch. `test` → one copy to `NEWSLETTER_TEST_EMAIL`. `live`
  → per-subscriber; refuses without `NEWSLETTER_MAILING_ADDRESS` or over
  a 90/day cap.
- Routes: `POST /api/admin/send-blog-email`, `POST /api/admin/send-weekly-digest`
  (both `?mode=test` default / `?mode=live`), `GET /api/admin/preview-weekly-digest?key=<ADMIN_API_SECRET>`.
  `/api/newsletter/unsubscribe` (GET confirm + POST one-click, RFC 8058).
- `/api/subscribe` writes Airtable only. Kit is out of the loop.

### Phase 1 loose ends
- [ ] Set `NEWSLETTER_MAILING_ADDRESS` in **Vercel** project env
  (`265 Belgrove Dr, Kearny, NJ 07032` for now). Only blocks `mode=live`.
  It's already in `.env.local`.
- [ ] Live sends also wait on the coming-soon gate coming down — the
  newsletter links point at `asphaltanddirt.com`.
- [ ] Optionally set `NEWSLETTER_TEST_EMAIL` in Vercel (falls back to
  `AMBASSADOR_APPLICATIONS_TO_EMAIL`).

---

## Phase 2 — Ambassador emails (NEXT — approved)

Goal: the two-part ambassador welcome sequence, sent from our code, so it
no longer depends on a Kit sequence. See the "Welcome Email Template"
artifact + the Road & Trail Crew Docs welcome section for the copy
(iCloud folder). Ambassadors base: `appXheLlmY0Grspla`, Ambassadors
table.

**Part 1 — on approval, NO code.** Welcome, what happens next (video
interview + agreement), link to `https://asphaltanddirt.com/ambassadors/agreement`,
media kit link. Tier pulled from the record.

**Part 2 — after signed agreement + code created.** Their promo code +
tracking link + commission rate, how payouts work, the "add your build"
link, hashtags (`#AsphaltAndDirtCrew` `#TeamAsphaltAndDirt`), community
group. `Agreement Signed` is the gate; the team must have filled
`Promo Code` on the record first.

### Build steps
1. New `lib/ambassadorWelcome.ts` — `buildAmbassadorWelcome(record, part)`
   → `{ subject, html }`. Reuse `wrapNewsletterEmail`'s look or a
   dedicated crew wrapper. Resend send helper (single email, not batch).
2. New `POST /api/ambassador-welcome` — admin-auth (Bearer
   `ADMIN_API_SECRET`) **or** an Airtable automation secret header.
   Params: `recordId` (or `email`) + `part` (`1` | `2`). Looks up the
   Ambassador record, sends, stamps `Welcome N Sent` + `Welcome N Sent Date`,
   idempotent (skip if already stamped). Part 2 errors if `Promo Code`
   is empty.
3. Airtable Ambassadors table — add fields: `Welcome 1 Sent` (checkbox),
   `Welcome 1 Sent Date` (date), `Welcome 2 Sent` (checkbox),
   `Welcome 2 Sent Date` (date). Optionally `Send Welcome 1` /
   `Send Welcome 2` trigger checkboxes.
4. Airtable automations (R&T Crew base):
   - Part 1: on Ambassador record created (or `Send Welcome 1` checked)
     → webhook `POST /api/ambassador-welcome` `{recordId, part:1}`.
   - Part 2: on `Send Welcome 2` checked → same, `part:2`.
   - Do NOT touch `wflqmMcJhK4OXPwFU` ("Auto-create Ambassador on
     Accept") — load-bearing.
5. Fold an optional immediate Part 2 into `/api/accept-agreement`: if
   `Promo Code` is already on the record when the agreement is signed,
   send Part 2 right then instead of waiting for the manual trigger.
6. Remove the "Send Welcome Email Part 2 from Kit" line from the
   `/api/accept-agreement` onboarding-checklist email; replace with the
   new trigger.
7. Update the Welcome Email Template artifact + Crew Docs to match
   (iCloud side).

---

## Phase 3 — 5-email welcome drip for new newsletter subscribers (TODO)

Kit sequence, now homeless. Airtable (`Welcome Step` number +
`Last Welcome Sent` date on `Subscribers`) + a daily Vercel cron
(`/api/cron/newsletter-drip`) sending "email N at day X" via Resend.
Build the drip content in `lib/newsletter.ts`. This is the reusable
multi-brand piece — keep it brand-parameterised.

## Phase 4 — Team host-profile collection form (TODO, not email)

A temp page/form to collect Jose / Anthony / Dan / Jack profile data for
the Team page.
