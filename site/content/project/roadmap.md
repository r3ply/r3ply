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

## Library

- [ ] Add ability to "replay" comments through different stages of the pipeline as starting points. This could be very helpful if people need to do migrations. E.g. Let's say you've made changes to your comment template, but you need to make sure all the old comments have those changes as well. You should be able to reprocess the old comments and then diff them with version control to check that everything worked as expected.
- [ ] Add support for email attachments (this could be a good path towards allowing sites to implement user icons)
- [ ] Add other comment sources. Perhaps a magic link or even a POST comment source?

## Crates

- [ ] The top-level `__tera_context` object (for templating) is weird and sort of mysterious. There should be a `__r3ply_context` object within it that can be documented. It will be easier to remember plus `__tera_context` could still be useful for other things in the future and it might be bad design to expose the _full_ context and not have a more focused option.

## Moderation

- [ ] Email based moderation (Approve/Add to `block*`/`approve*` lists) from within email

## CLI

- [ ] Rewrite in rust

## App/Infrastructure

- [ ] Email server
