+++
title = "r3ply docs: Getting Started"
template = "doc.html"

[extra.comments]
enabled = true
+++

# Getting Started

In this tutorial we're going to walkthrough using r3ply from start to finish with an example. We will be installing the `re` CLI tool, generating a config, simulating a comment, and then discussing next steps. Follow the the steps below from within your project's top-level directory.

## Table of Contents { .text-right .border-b .border-dashed }

- [Installation/Setup](#installation-setup)
- [Generating a Config](#generating-a-config)
- [Simulating a Comment](#simulating-a-comment)
- [What's Inside a Comment](#what-s-inside-a-comment)
- [Summary & Next Steps](#next-steps)
- [Comments](./#comments)

<div class="mt-8 -mb-4 p-0 text-lg flex justify-center gap-3 dark:text-amber-200">{{ fleuron_fish() }}</div>

## Installation & Setup

For this tutorial we will need to install the r3ply CLI tool called `re`.

```bash
# use npm -D @r3ply/cli for per project installations
npm -g @r3ply/cli
re --help
```

You should see the usage statement print.

Next initialize a new r3ply project at the top-level directory of your project.

```bash
re init
```

You should see output similar to this (but not exactly the same):

```
Initialized empty r3ply project at /Users/spence/Developer/r3ply/site

Add the following site entry to your config:

[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "Pym_RNyK78Em16_hiYUEMQ"
issued = "2025-10-22"
label = "CLI"
```

This is a _site entry_ and in r3ply there's one site entry per **domain x r3ply** pair. In this case, the `domain` is `"site.local.test"` and `r3ply` is `"cli.r3ply.test"`, which are special cases that are reserved for use with the r3ply CLI. The `signet` is a special cryptographic envelope that signifies that **domain x r3ply** pair mentioned earlier. In this case, the signet is issued by the r3ply CLI to your local project.

Great, now our r3ply project is initialized. Don't worry about saving the initialization output above. We will see it again next when we generate a config.

## Generating a Config

Now let's generate a config so we can use r3ply.

```bash
re generate config
```

You should see output similar to this:

<!-- prettier-ignore-start -->
```toml
version = "0.0.1"
enabled = true

[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "Pym_RNyK78Em16_hiYUEMQ"
issued = "2025-10-22"
label = "CLI"

[moderation]
enabled = true
github = []
webhook = []

[[moderation.local]]
"file_path_{}" = "comment_{{ comment.id[:8] }}.json"
enabled = true
"allow*" = []
```
<!-- prettier-ignore-end -->

(_If you look closely you can see that the `[[site]]` entry here is identical to the one from the `re init` command we ran earlier_)

Now copy the above output and add it to a file named `config.toml` and save the file in a place where it can be accessed from your website. r3ply will look at the following paths in this order:

```
# Priority from highest to lowest:

https://${domain}/.well-known/r3ply/config.toml
https://${domain}/.well-known/r3ply.config.toml
https://${domain}/r3ply.config.toml
https://${domain}/r3ply.toml
```

(_The r3ply website itself stores the config at `static/.well-known/r3ply/config.toml` and can be reached online at [https://r3ply.com/.well-known/r3ply/config.toml](https://r3ply.com/.well-known/r3ply/config.toml)._)

Finally, let's set the path of your config as the default config path:

```bash
re config set-default <your-config-path>
```

We can run `re config validate` to verify that our config is well formed. If there's no output then you're ready to proceed to the next section and begin simulating email comments.

## Simulating a Comment

Now it's time to get setup for simulating an email comment.

```bash
re simulate email
```

You should see a bunch of text and at the very bottom something that looks like this:

<!-- prettier-ignore-start -->
```toml
# === Comment: Prescreening Results ===

# Prescreening failed checks:

comments_configured = [ "No comments configuration found" ]
```
<!-- prettier-ignore-end -->

This means that we will have to add a comment and email section to our config. Open your r3ply config from the prior step and add the following configuration between the `[[site]]` and `[[moderation]]` entries:

```toml
[comments.email]
```

Here we added an empty `comments` object, with a nested `email` object. This is because r3ply provides defaults for most configuration items, but only if their top-level objects exist.

Now re-run the `re simulate email` from earlier. You should see a bunch of text representing each stage of the comment processing pipeline. You can [see the docs](/todo) for more info about how to read and understand this output, as well as how to [silence and filter](/todo) it. But for now we have one last thing to do: writing our comment as a file.

To actually have simulated email be written as a file we will need to add the `--moderate` flag to the same command. What this tells `re` to do is to simulate and email _and_ to moderate it. So go ahead and run the updated command:

```bash
re simulate email --moderate
```

Towards the bottom of the output you should see something similar to this (but not exactly the same):

<!-- prettier-ignore-start -->
```toml, linenos, hide_lines=16, hl_lines=23-24, name=moderation results
# === Moderation: Local[0] ===

#################################
# Request portion of moderation #
#################################

# `bypass` asks to skip moderation altogether. For local moderation it has no effect.
[request]
type = "local"
bypass = false

  # `relative_path` is relative to project root.
  [request.args]
  relative_path = "content/comments/b69922e4.json"
  # `comment` variable elided, see comment output from earlier steps in docs
  comment = '[elided... see "Comment: Processed" above]'

################################
# Ticket portion of moderation #
################################

# `ticket.local` is the response to a request for local moderation.
[ticket.local]
absolute_path = "/Users/spence/Developer/r3ply/site/content/comments/b69922e4.json"
```
<!-- prettier-ignore-end -->

At the bottom we see the `absolute_path` the comment was written to! You can change this path by editing your config. In the next step we'll take a closer look at that comment.

## What's Inside a Comment

Now that we can simulate the receiving comments based on a real configuration, we need to understand what's inside a comment object. Open the file that was at the `absolute_path` from the last step. You can also expand the one that was used during the making of this tutorial.

<details class="group">
  <summary class="bg-violet-300 border-2 border-black dark:border-blue-400 rounded-lg py-3 px-2 w-48 hover:cursor-pointer font-extrabold text-gray-800 ml-auto">
    <span class="group-open:hidden">Expand to See File</span>
    <span class="hidden group-open:inline">Close File Details</span>
  </summary>

```json
{
  "r3ply": {
    "config_version": "0.0.1",
    "server": "cli.r3ply.test",
    "site": "site.local.test",
    "signet": "wWM5hk4DKr1xVRhVq-7aog",
    "issued": "2025-10-16"
  },
  "author": {
    "pseudonym": "2ec68974e2f82e9bd891a351eefe4bbeefe2670b745c861df31c975e54c207c1",
    "token": "kktE_W_Nlh95kjQpAbbcDkpOPtTjh8SRJNAdulGWav5Nv0zJNUABG91PMIeTo8K6PyMXkHp8iJsxuR-Qg0rFwKLk3LmZt0NTJ1SNUOLL8-0k0Ik-bNSBWCnH_lRCkWFc7LRpTfPNurZ7ncifRVFGbqgKrFoLhvwGSujQivorr9tNKq_r7C2aTyb-ECmTWJdgWVHaD4lwetqv0tU-tueGkBlbTHWlAR6JUX2UwOrQrTSgzx6Ft3-hb4Q9esLhlN1ffUK43Ov0E8dhGReH-Uy1fj2k_EzyOwLLfZ771mkfC4dMsjPl0jMZTSjDQqP-tK3hiA5xJsC6Aa00S04ZFVXBIZVNHEgds4AbcfUhpZqwOfBLfCXey4scQBW5DZFGkF3Km3_gaBJUYKTaYoYLN71Xd5rjELcpahwzvxUurUoNYQn-D6zt_U-Fbt4SeoA9370ivV1U0HeY6w-5YWrk"
  },
  "comment": {
    "id": "b69922e4da6e45cf9cd75cc3b878fc5c",
    "ts_rcvd": "1761144137",
    "subject": {
      "url": "https://site.local.test/reviews/toughest-fights-in-monkey-island",
      "origin": "https://site.local.test",
      "protocol": "https:",
      "hostname": "site.local.test",
      "path": "/reviews/toughest-fights-in-monkey-island"
    },
    "txt": "Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?",
    "md": "<p>Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?</p>\n",
    "html": "<p>Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?</p>\n"
  },
  "email": {
    "to": "site.local.test@cli.r3ply.test",
    "subject": "https://site.local.test/reviews/toughest-fights-in-monkey-island",
    "date": "2018-08-26T07:24:01+00:00",
    "text": "Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?",
    "auth": {
      "dkim": false,
      "spf": false,
      "dmarc": false,
      "pass": false
    },
    "from": {
      "pseudonym": "2ec68974e2f82e9bd891a351eefe4bbeefe2670b745c861df31c975e54c207c1",
      "signet": "wWM5hk4DKr1xVRhVq-7aog",
      "issued": "2025-10-16",
      "token": "kktE_W_Nlh95kjQpAbbcDkpOPtTjh8SRJNAdulGWav5Nv0zJNUABG91PMIeTo8K6PyMXkHp8iJsxuR-Qg0rFwKLk3LmZt0NTJ1SNUOLL8-0k0Ik-bNSBWCnH_lRCkWFc7LRpTfPNurZ7ncifRVFGbqgKrFoLhvwGSujQivorr9tNKq_r7C2aTyb-ECmTWJdgWVHaD4lwetqv0tU-tueGkBlbTHWlAR6JUX2UwOrQrTSgzx6Ft3-hb4Q9esLhlN1ffUK43Ov0E8dhGReH-Uy1fj2k_EzyOwLLfZ771mkfC4dMsjPl0jMZTSjDQqP-tK3hiA5xJsC6Aa00S04ZFVXBIZVNHEgds4AbcfUhpZqwOfBLfCXey4scQBW5DZFGkF3Km3_gaBJUYKTaYoYLN71Xd5rjELcpahwzvxUurUoNYQn-D6zt_U-Fbt4SeoA9370ivV1U0HeY6w-5YWrk"
    }
  }
}
```

</details>

That was a lot! Let's look more closely at individual items to get a better understanding.

```json
  ...
  "r3ply": {
    "config_version": "0.0.1",
    "server": "cli.r3ply.test",
    "site": "site.local.test",
    "signet": "wWM5hk4DKr1xVRhVq-7aog",
    "issued": "2025-10-16"
  },
  ...
```

This is just metadata about concerning the site, r3ply server, etc... that serviced this comment. Next let's look at `author`:

```json
  ...
  "author": {
    "pseudonym": "2ec68974e2f82...",
    "token": "..."
  },
  ...
```

Here we see details about the comment's author. Their email address has been anonymized to a stable `pseudonym` that can be used like an ID. There's also a long `token` which is an opaque, encrypted token of their real email address. Only the original r3ply server can decrypt it. It's there for future-proofing r3ply so that if changes need to be made, the original, cleartext email address won't be lost.

```json
  ...
  "comment": {
    "id": "b69922e4da6e45cf9cd75cc3b878fc5c",
    "ts_rcvd": "1761144137",
    "subject": {
      "url": "https://site.local.test/reviews/toughest-fights-in-monkey-island",
      "origin": "https://site.local.test",
      "protocol": "https:",
      "hostname": "site.local.test",
      "path": "/reviews/toughest-fights-in-monkey-island"
    },
    "txt": "Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?",
    "md": "<p>Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?</p>\n",
    "html": "<p>Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?</p>\n"
  },
  ...
```

Here's the actual `comment` object. There're three nearly identical versions of the comment body: `txt`, `md`, and `html`. This is because r3ply supports text written as markdown, as well as converting that markdown to HTML, but it will also strip out malicious html tags. You can configure this further within the `[comment]` object ([docs](/todo)).

There's also the `subject` field of the `comment` object, which tells us the URL of what the comment was in response to. Using this you should be able to identify the page the comment belongs on.

## Summary & Next Steps { #next-steps }

Great, you are now able to simulate comments via email with `re simulate email`, which should work exactly the same as real email comments when your changes go online. You can now use these test comments to develop your site to incorporate comments throughout its pages:

- Using the `subject` field you can identify where a comment belongs.
- Then the `author` field allows you to attach a stable identifier to the comment's authorship.
- Finally the `html` field gives you a sanitized output that is safe to display on your website.

In the future, when you make changes to your website, you can check that new comments will continue to work by testing your changes with this tool.

---

There's a lot more that you can do in r3ply than what was shown here in this tutorial. Tweaking your config can make r3ply an incredibly powerful tool.

Add a new site entry for your site's public domain ([docs](/todo)):

{{ make_signet() }}

Next, add another moderation channel to your r3ply config ([docs](/todo)).

```toml
# E.g. add moderation by GitHub PR
[[moderation.github]]
owner = "<ACCOUNT>"
repo = "<REPO>"
"file_path_{}" = "content/comments/{{ comment.id[:8] }}.md"
```

Finally, read the [config](/todo) and [CLI](/todo) docs to take full advantage of r3ply.

<div class="mt-8 -mb-4 p-0 text-lg flex justify-center gap-3 dark:text-emerald-400">{{ fleuron_fish() }}</div>

{{ next_prev(prev_path="/docs" prev_text="Docs Home" next_path="/docs/overview" next_text="r3ply Overview") }}