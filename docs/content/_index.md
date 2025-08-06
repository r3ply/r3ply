+++
+++

# r3ply

Commenting as simple as email.

Just add `./well-known/r3ply/config.toml` to your site, and receive comments via email at [`your-site.com@r3ply.com`](mailto:your-site.com@r3ply.com). <!-- TODO: add a subject in mailto link -->

```toml
version = "0.0.1"
domain = "<YOUR_SITE>.com"
r3ply = ["r3ply.com"]

[comments.email.moderation]
type = "github"
repo = "https://github.com/you/<YOUR_REPO>"
"file_path_{}" = "/content/comments/{{ comment.id }}.md"
```

## Features

- Designed especially for static sites but works with any backend
- Comments via email out of the box with support for other channels
- Moderation is included, e.g. GitHub PR or through other means
- Self-hosting is also possible but r3ply.com is available right away
- Privacy first: email addresses are redacted
- There's a CLI to help with development

Read the [getting started](#getting-started) to jump right in, or view individual topics for more detailed info.

## Table of Contents

<!-- TOC -->

- [Features](#features)
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

!["mailto link example"](./docs/mailto-comment-intake.png)

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
