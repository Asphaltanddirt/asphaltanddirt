# Email overhaul — status & plan

_Kit's free plan dropped automations/sequences → the whole email stack
moved to **Resend (send) + Airtable (list, source of truth)**, driven from
this app's own code. One Resend account will serve every future brand
(A&D + personal brands + a school PPO); ~$0 now → Resend Pro $20/mo flat
once past ~3 brands or >100 sends/day._

**Phases 1–3 are all done and deployed. The Kit account is deleted.**
`CRON_SECRET` is set in Vercel; both crons run. The coming-soon gate stays
up until launch — that's the only thing gating live sends.

Full project context lives in the iCloud folder `START-HERE.md` (not in
this repo). This file is the repo-side pointer so a session working only
from the code can pick up.

---

## Phase 1 — Newsletter distribution ✅ DONE (deployed)

- `lib/newsletterSubscribers.ts` — Airtable Newsletter base
  `appuaFFyGs91ZJ6Rr`, table `Subscribers`, is the source of truth.
  `addSubscriber` / `listActiveRecipients` / `unsubscribeByToken` /
  `listWelcomeCandidates` / `stampWelcomeStep`. (The 13 Kit subscribers
  were migrated in with Brand + Unsubscribe Token before the Kit account
  was deleted.)
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
- [x] `NEWSLETTER_MAILING_ADDRESS` set in Vercel.
- [ ] Live sends wait on the coming-soon gate coming down — newsletter
  links point at `asphaltanddirt.com`.

---

## Phase 2 — Ambassador emails ✅ DONE (deployed, tested end-to-end on prod)

Two-part Road & Trail Crew welcome sequence, sent from our code. Ambassadors
base `appXheLlmY0Grspla`, table `Ambassadors` (`tbl8XwmNOBz48hvia`).

- `lib/ambassadorWelcome.ts` — `buildWelcomePart1({name, tier})` and
  `buildWelcomePart2({name, code, trackingLink})`. Ported verbatim from the
  Welcome Email Template artifact. Tier-aware (10/12/15%), hashtags now
  `#AsphaltAndDirtCrew` + `#TeamAsphaltAndDirt`, links point at
  `/ambassadors` + `/ambassadors/agreement`. Media Kit link still the
  artifact URL (the "real download" swap is a separate deferred task).
- `lib/ambassadorWelcomeSend.ts` — `sendAmbassadorWelcome(record, part)`
  (send + stamp, idempotent), `findAmbassador({recordId|email})`,
  `processPendingWelcomes()` (sweep the Send Welcome 1/2 checkboxes).
  Part 2 is skipped (never sent early) unless Agreement Signed + Promo
  Code + Tracking Link are all set.
- `lib/resendEmail.ts` — `sendEmail()` single-send helper (from
  `crew@asphaltanddirt.com`, override via `CREW_FROM_EMAIL`).
- `POST /api/ambassador-welcome` — Bearer `ADMIN_API_SECRET` (or `?key=`).
  Body `{recordId|email, part: 1|2, test: bool}`. Manual / programmatic
  trigger.
- `GET|POST /api/cron/ambassador-welcome` — Vercel cron (`vercel.json`,
  every 15 min) → `processPendingWelcomes()`. Auth: `CRON_SECRET` (Vercel
  sends it) or `ADMIN_API_SECRET`. This is how the Send Welcome 1/2
  checkboxes work — Airtable automations can't call our API.
- `/api/accept-agreement` — now auto-sends Part 2 when Promo Code +
  Tracking Link are already staged at signing; the team-email checklist
  is updated off Kit ("tick Send Welcome 2" instead).

New Ambassadors fields: `Tracking Link` (url), `Send Welcome 1`,
`Welcome 1 Sent` + `Welcome 1 Sent Date`, `Send Welcome 2`,
`Welcome 2 Sent` + `Welcome 2 Sent Date`.

**Flow:**
- Approve an applicant → "Auto-create Ambassador on Accept" makes the
  record → staff ticks **Send Welcome 1** → within 15 min the cron sends
  Part 1.
- Ambassador signs at `/ambassadors/agreement` → team creates the
  Fourthwall code, fills **Promo Code** + **Tracking Link** (+ Promotion
  ID / Commission Rate / Start Date) → ticks **Send Welcome 2** → cron
  sends the code reveal. (Or: if the code + link are already on the
  record when they sign, Part 2 goes out automatically right then.)

### Phase 2 loose ends
- [x] `CRON_SECRET` set in Vercel.
- [ ] **`/ambassadors/*` is still behind the coming-soon gate.** The
  welcome-email links (`/ambassadors`, `/ambassadors/agreement`) land on
  the coming-soon page until either the gate drops or `/ambassadors` is
  added to `EXEMPT_PREFIXES` in `middleware.ts` (I tried; the edit needs
  your call — it would expose those noindex pages on the live domain).
- [ ] Optionally: an Airtable automation on record-created that ticks
  `Send Welcome 1` automatically (so approval → Part 1 with zero clicks).
  Airtable's "Send request" action could also call
  `/api/ambassador-welcome` directly and skip the cron — MCP can't build
  either, so it's a manual Airtable-UI setup if you want it.
- [ ] Update the Welcome Email Template artifact + Crew Docs welcome
  section to say "sent automatically from the site" (iCloud side).
- [ ] Media Kit link → real file download (shared with the Phase 1
  artifact email-pass item).

---

## Phase 3 — 5-email welcome drip ✅ DONE (deployed, tested end-to-end on prod)

Ports the Kit "Welcome" sequence (id `2873722`). Content copied from Kit,
`asphaltanddirt.vercel.app` links swapped to `asphaltanddirt.com`, FB
group link updated to the current one.

- `lib/newsletterWelcome.ts` — the 5 emails + `WELCOME_SCHEDULE` (day
  offsets `[0, 2, 5, 8, 11]` from Subscribed Date, matching Kit's
  cumulative delays). Each has its "WELCOME N/5" banner
  (`public/img/newsletter/welcome-N.jpg`, from the originals in the iCloud
  `welcom newsletter photos/` folder). A&D-specific; a sibling brand adds
  its own module + schedule.
- `lib/newsletterWelcomeSend.ts` — `sendWelcomeStep(sub, n)` and
  `processWelcomeSequence()` (one step per subscriber per run, `DAILY_CAP`
  80).
- `Subscribers` table: `Welcome Step` (0 = none, 1–5), `Last Welcome Sent`.
  The 13 migrated subscribers were backfilled to `5` so the cron leaves
  them alone.
- `/api/subscribe` sends email 1 inline on a new/reactivated signup
  (best-effort — cron catches it if the send fails).
- `GET|POST /api/cron/newsletter-welcome` — Vercel cron daily at 12:00 UTC
  (`vercel.json`). Auth: `CRON_SECRET` or `ADMIN_API_SECRET`.

### Phase 3 loose ends
- [x] `CRON_SECRET` set in Vercel; both crons registered and running.
- [x] Kit account deleted — nothing more to migrate or deactivate.
- [ ] Welcome-email links point at `asphaltanddirt.com` — still gated.

## Phase 4 — Team host-profile collection form (TODO, not email)

A temp page/form to collect Jose / Anthony / Dan / Jack profile data for
the Team page.
