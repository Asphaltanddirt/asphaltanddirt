# Event promo countdown: Airtable fields to create before merging

The site token can't create fields or tables. Create these by hand first. Every
read is guarded (a missing field reads as blank), and the RSVP form still saves
if its three new fields are missing. The promo generator and the attendee-track
emails do nothing useful until their fields exist.

## Analytics base (appREJzEYhkFTY8k5 (A&D Social Ops; was the Analytics base appzbX0Mz3rXtc1GN until 2026-09-25)): table `Social Posts`

| Field | Type | Choices / notes |
|---|---|---|
| `Promo Beat` | Single select | `save-the-date`, `whos-in`, `details`, `last-clip`, `last-call` |
| `Creative` | Single select | `real_action_video`, `real_still`, `host_talking`, `designed_card`, `recap_clip` |
| `Variant` | Single select | `A`, `B` (A = real footage, B = designed card; only on whos-in and last-clip) |
| `Event Facts` | Long text | JSON snapshot `{date, time, place}` the fresh-facts check compares against. `place` is a hash, not the meetup text |

Existing fields that get new choices (written with `typecast`, so they appear
on first write, but you can add them up front):

| Field | New choices |
|---|---|
| `Auto Status` | `Needs update` |
| `Topic` | `Event promo` |
| `Platform` | `Instagram Story` |
| `Asset` | `Story` |

Existing fields reused as-is: `Event` (slug), `Slot Key` (dedupe, `promo|<slug>|<date>|<beat>|<platform>`), `Notes` (media suggestions from the Media Library).

## Events base: table `RSVPs`

| Field | Type | Choices / notes |
|---|---|---|
| `Source` | Single line text | The `?src=` code: `tiktok`, `instagram`, `igstory`, `facebook`, `fbgroup`, `x`, `threads`, or anything else short |
| `Variant` | Single select | `A`, `B` |
| `Heard About` | Single select | `TikTok`, `Instagram`, `Facebook`, `X`, `Threads`, `YouTube`, `Newsletter`, `Friend`, `Other` |
| `Plan Email Sent` | Date (with time, ISO) | Stamped before the D−3 plan email is sent. If missing, the email is not sent |
| `Reminder Sent` | Date (with time, ISO) | Stamped before the D−1 reminder is sent (events without Tailgate). If missing, not sent |
| `Released At` | Date (with time, ISO) | Set when someone taps "Release my spot" (Status also goes to `Cancelled`) |

## Events base: table `Events`

| Field | Type | Notes |
|---|---|---|
| `FB Going` | Number (integer) | Facebook Event "Going" count, typed in by hand. The Garage event page shows it next to site RSVPs |

## New cron

`/api/cron/event-promo`, daily at 11:10 UTC (added to `vercel.json`).
