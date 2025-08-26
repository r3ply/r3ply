+++
+++

# r3ply - Comments simple as email.

r3ply is an open source project that allows websites to receive comments via email.

## Getting Started

{% make_config() %}

1. Enter your website's domain and press 'generate' to produce a `signet`. Then host the config at `/.well-known/r3ply/config.toml` from the same domain.

{% end %}

2. On your website, generate `mailto:` links on the pages where you'd like to receive comments, by pre-populating the `to` and `subject` fields.
3. Comments addressed to [<YOUR_DOMAIN>@<r3ply.com>](mailto:CHANGE_ME@r3ply.com) and referencing the subject (a URL) will arrive per the `moderation` section of the config, e.g. GitHub.

There is also r3ply CLI tool called `re` that is useful for local development. Use it to simulate a comment arriving to your site, and iterate on your config with confidence.

## Table of Contents

<!-- TOC -->

- [Getting Started](#getting-started)
- [Receiving Comments](#receiving-comments)
- [Configuration](#configuration)
  - [Moderation](#moderation)
- [CLI](#cli)
<!-- /TOC -->

## Getting Started

To use `r3ply` to receive comments on your website you only have to add a r3ply config file. It is also recommended that you moderate comments when they come in.

Here is an overview of the flow of data:

1. User sends an email addressed to your site, e.g. `spenc.es@r3ply.com`.
2. The email arrives at the email handler from your config, e.g. `r3ply.com`
3. Then the email is processed into a comment and sent to your moderation

The details of what happens along the way depends on your configuration, but that is the general flow. Read on to get more specific information.

## Receiving Comments

There are a few things to be aware of when receiving comments.

**First, specify a r3ply server in your config**. For example, using `r3ply.com` is fine, but you can also choose different ones, or even run your own.

**Also, use [`mailto`](https://en.wikipedia.org/wiki/Mailto) links on you website to create an email template for a visitor to leave a comment. E.g.**

<!-- !["mailto link example"](./docs/mailto-comment-intake.png) -->

_(the [CLI](#cli) tool can help you with generating mailto links)_

That way, sending a comment is as easy for your site's visitors as clicking a button.

**Finally _where_ the comments will actually go depends on the `moderation` part of your config.** For static sites on github the easiest is approach is to just use `github` moderation. This means comments will be arrive as a pull request in the repo you've specified in the config.

## Configuration

The following locations are checked (in priority order):

1. `https://<your-site>/.well-known/r3ply/config.{toml,json}`
1. `https://<your-site>/.well-known/r3ply.config.{toml,json}`
1. `https://<your-site>/r3ply.config.{toml,json}`

### Moderation

## CLI

```
# print usage
re

# see cmds for working with r3ply config
re config

# validate r3ply config (use --config <path> for a specific config)
re config validate

# simulate receiving an email (--from, --subject, etc... can change the email)
re comments simulate-email
```
