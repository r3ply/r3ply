+++
template = "base.html"
title = "r3ply Roadmap"
+++

# Roadmap

## Config

- [x] Add `site`, `comments`, `moderation` top-level variables
- [ ] Add `notify` top-level variables - allow notification channels to be added and configured, e.g. slack message or email
- [ ] Secret storage Allow users to store encrypted secrets in their config, e.g. protect webhook endpoint
- [ ] Stabilize config API for existing features

## Comments

- [ ] Add support for email attachments (this could be a good path towards allowing sites to implement user icons)
- [ ] Add other comment sources. Perhaps a magic link or even a POST comment source?

## Moderation

- [ ] Email based moderation (Approve/Add to `block*`/`approve*` lists) from within email

## CLI

- [ ] Rewrite in rust

## App/Infrastructure

- [ ] Email server
