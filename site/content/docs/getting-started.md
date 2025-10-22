+++
title = "r3ply docs: Getting Started"
template = "doc.html"
+++

# Getting Started

In this tutorial we're going to walkthrough using r3ply from start to finish with an example. We will be installing the `re` CLI tool, generating a config, simulating a comment, and then discussing next steps. Follow the the steps below from within your project's directory.

## Table of Contents { .text-right .border-b .border-dashed }

- [Installation/Setup](#installation-setup)
- [Generating a Config](#generating-a-config)
- [Simulating a Comment](#simulating-a-comment)
- [Next Steps](#next-steps)

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

(_If you look closely you can see that the `[[site]]` entry here is identical to the one from the `re init` command we ran earlier_)

Now copy the above output and add it to a file named `config.toml` and save the file in a place where it can be accessed from your website. r3ply will look at the following paths in this order:

1. https://${domain}/.well-known/r3ply/config.toml
1. https://${domain}/.well-known/r3ply.config.toml
1. https://${domain}/r3ply.config.toml
1. https://${domain}/r3ply.toml

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

```
=== Comment: Prescreening Results ===

Prescreening failed checks:

comments_configured = [ "No comments configuration found" ]
```

This means that we will have to add a comment and email section to our config. Open your r3ply config from the prior step and add the following configuration between the `[[site]]` and `[[moderation]]` entries:

```toml
[comments.email]
```

Now re-run the `re simulate email` from earlier. You should see a bunch of text representing the each stage of the comment processing pipeline. You can [see the docs](/todo) for more info about how to read and understand this output, as well as how to silence and filter it. But for now we have one last thing to do: writing our comment as a file.

To actually have simulated email be written as a file we will need to add the `--moderate` flag to the same command. What this tells `re` to do is to simulate and email _and_ to moderate it. So go ahead and run the updated command:

```bash
re simulate email --moderate
```

Towards the bottom of the output you should see something similar to this (but not exactly the same):

```
=== Moderation: Local[0] ===

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
  comment = '[elided... see "Comment: Processed" above]'

################################
# Ticket portion of moderation #
################################

# `ticket.local` is the response to a request for local moderation.
[ticket.local]
absolute_path = "/Users/spence/Developer/r3ply/site/content/comments/b69922e4.json"
```

At the bottom we see the path the comment was written to! You can change this path by editing your config.

You are now able to simulate comments via email. You can now develop your site to incorporate these comments throughout its pages. When you make changes to your website, you can check that new comments will continue to work by testing your changes with this tool.

There's a lot more that you can do in r3ply than what was shown here in this tutorial. Go to the next section to get some suggestions on what things to read about next.

---

## Next Steps

Add a new site entry for your site's public domain ([docs](/todo)):

{{ make_signet(placeholder="Enter your website's domain") }}

Add another moderation channel to your config ([docs](/todo))

```toml
[[moderation.github]]
owner = "<ACCOUNT>"
repo = "<REPO>"
"file_path_{}" = "content/comments/{{ comment.id[:8] }}.md"
```

Read the [config docs](/todo) to take full advantage of r3ply.

<div class="mt-8 -mb-4 p-0 text-lg flex justify-center gap-3 dark:text-emerald-400">{{ fleuron_fish() }}</div>

{{ next_prev(prev_path="/docs" prev_text="Docs Home" next_path="/docs/overview" next_text="r3ply Overview") }}
