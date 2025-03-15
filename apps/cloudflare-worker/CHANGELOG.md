# Changelog

## Next

## 0.0.1 (2025-03-15)

- refactor to monorepo

---

_Legacy Changelog (before monorepo)_

Programming note: During the development of [`Next` (Legacy)](#next-legacy), the need became clear to repurpose that work into separating the primary functionality from the Cloudflare worker ecosystem altogether. A monorepo structure was chosen, and the changelog version was reset.

## Next (Legacy)

- Change email parsing to work locally, for improved testability

## 1.0.2 (2024-12-17) (Legacy)

- use a DB to track state throughout the process, along with backing up the payload sent to the webhook and notifications received from the webhook
- add [persistent logs](https://blog.cloudflare.com/builder-day-2024-announcements/#logs-for-every-worker) for Cloudflare Workers
- update Wrangler to version 3.93.0
- add proper bindings for getting parsed email results back (from mail-parser based cf worker)

## 1.0.1 (2024-08-20) (Legacy)

- add improve header 'folding'
- fix reply threading for Outlook
- fix reply threading for the others

## 1.0.0 (2024-08-16) (Legacy)

- broke apart reply into smaller pieces and delegated responsibility of preparing comments to a webhook that each customer registers
- established an API between the webhook and r3ply, but in terms of request (the email comment data) and response (content of notifications to email back)

## 0.0.1 (2023-12-11) (Legacy)

- small bug fixes have been made since then and the changelog is now beginning
- r3ply has been deployed for a few days now, and seen real traffic
