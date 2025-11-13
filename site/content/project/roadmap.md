+++
template = "base.html"
title = "r3ply Roadmap"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

# Roadmap

## Schemas & Config

- [ ] Add `notify` top-level variables - allow notification channels to be added and configured, e.g. slack message or email
- [ ] Secret storage Allow users to store encrypted secrets in their config, e.g. protect webhook endpoint
- [ ] Stabilize config API for existing features

## Crates

- [ ] The top-level `__tera_context` object (for templating) is weird and sort of mysterious. There should be a `__r3ply_context` object within it that can be documented. It will be easier to remember plus `__tera_context` could still be useful for other things in the future and it might be bad design to expose the _full_ context and not have a more focused option.

## Library

- [ ] Add ability to "replay" comments through different stages of the pipeline as starting points. This could be very helpful if people need to do migrations. E.g. Let's say you've made changes to your comment template, but you need to make sure all the old comments have those changes as well. You should be able to reprocess the old comments and then diff them with version control to check that everything worked as expected.
- [ ] Add support for email attachments (this could be a good path towards allowing sites to implement user icons)
- [ ] Add other comment sources. Perhaps a magic link or even a POST comment source?

## Commenting Sources

- [ ] POST + Magic Link?
- [ ] ActivityPub?
- [ ] AT Protocol?
- [ ] Text??
- [ ] Each commenting source's shared config should be broken out in the config's schema (see how moderation is done for inspiration)

## CLI

- [ ] For `re simulate email` make sure that only valid `Subject` lines are generated. To do this will require the intersection of the site's sitemap.xml and the site's `[comments.path*]` config variable.
- [ ] Add synonyms for the stage names to be used by the `--filter`/`--quiet` options. For example, currently `comment` is used instead of `processed` but it should technically permit both.
- [ ] Rewrite in rust

## r3ply Apps & Infrastructure

- [ ] Email server

## Moderation Channels

- [ ] Email based moderation (Approve/Add to `block*`/`approve*` lists) from within email
- [ ] Add the cache as a moderation channel?

### GitHub Moderation

-  [ ] Add support for public repos via a fork + new PR flow in the GitHub bot.

### Webhook

-  [ ] Better testing.

## Notification Channels

- [ ] Build library support
- [ ] Email notifications to site

## Site/Docs

- [ ] Add search
- [ ] Tutorial section: for example, how to allow people to support aliases (will also be good for when attachments are supported)

{{ fleuron_fish() }}

{{ next_prev(prev_path="/project/about/", prev_text="About r3ply", next_path="/project/contributing/", next_text="Contributing") }}