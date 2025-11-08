+++
title = "r3ply docs: Getting Started"
template = "doc.html"

[extra.comments]
enabled = true
+++

# Getting Started

In this tutorial we're going to walkthrough using r3ply from start to finish with an example. We will be installing the `re` CLI tool, generating a config, simulating a comment, and then discussing next steps. Follow the the steps below from within your project's top-level directory.

{% toc() %}
- [Installation/Setup](#installation-and-setup)
- [Generating a Config](#generating-a-config)
- [Simulating a Comment](#simulating-a-comment)
- [What's Inside a Comment](#inside-a-comment)
- [Summary & Next Steps](#next-steps)
{% end %}

{{ fleuron_fish() }}

## Installation & Setup { #installation-and-setup }

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

```bash
Initialized empty r3ply project at /Users/demo/Developer/r3ply/site

Add the following site entry to your config:

[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "6Be8MUKnqpXZ73MDbX2u2g"
issued = "2025-11-08"
label = "CLI"

Help: You can generate a config with `re generate config` if you have not already.
```

This is a _site entry_, and in r3ply there's one site entry per **domain x r3ply** pair.

In this case, the **domain** is `"site.local.test"` and **r3ply** is `"cli.r3ply.test"`. These values are special cases used by the r3ply CLI.

The `signet` is a special cryptographic envelope ([docs](@/docs/overview.md#sites-signets)) that signifies that unique **domain x r3ply** pair. In this case, the signet is issued by the r3ply CLI to your local project (as indicated by `label`).

Great, now our r3ply project is initialized. Don't worry about saving the initialization output above. We will see it again in the next step.

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
signet = "6Be8MUKnqpXZ73MDbX2u2g"
issued = "2025-11-08"
label = "CLI"

[comments.email]
enabled = true

[moderation]
enabled = true
github = [ ]
webhook = [ ]

  [[moderation.local]]
  "file_path_{}" = "comment_{{ comment.id[:8] }}.json"
  enabled = true
  "allow*" = [ ]
```
<!-- prettier-ignore-end -->

(_If you look closely you can see that the `[[site]]` entry here is identical to the one from the `re init` command we ran earlier_)

Copy the above output to a file named `config.toml`, and save the file in a place where it can be accessed from your website. r3ply will look at the following paths in this order:

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

```bash
re simulate email --moderate
```

You should see a large amount of text representing each stage of the comment processing pipeline. The [docs](/todo) cover output more in-depth, but it's basically the entire email to comment pipeline broken into stages.

{% info(type="tip") %}

The CLI docs also cover how to [silence and filter](@/docs/cli.md#simulate-filtering-output) this output. Check it out later.

{% end %}

The `--moderate` flag told `re` to simulate email to comment pipeline, _and then_ to send that comment for moderation. Towards the bottom of the output you should see something similar to this (but not exactly the same):

<!-- prettier-ignore-start -->
```toml, linenos, hl_lines=23-24, name=moderation results
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
absolute_path = "/Users/demo/Developer/r3ply/site/content/comments/b69922e4.json"
```
<!-- prettier-ignore-end -->

At the bottom we see the `absolute_path` the comment was written to. You can change this path by editing your config (`file_path_{}` under `[[moderation.local]]`).

## What's Inside a Comment { #inside-a-comment }

Now that we can simulate the receiving comments based on a real configuration, we need to understand what's inside a comment object. Open the file that was at the `absolute_path` from the last step. You can also expand the one that was used during the making of this tutorial.

<details class="group" id="full-comment-example">
  <summary class="bg-violet-300 border-2 border-black dark:border-blue-400 rounded-lg py-3 px-2 w-48 hover:cursor-pointer font-extrabold text-gray-800 ml-auto">
    <span class="group-open:hidden">Expand to See File</span>
    <span class="hidden group-open:inline">Close File Details</span>
  </summary>

```json, linenos, name=comment from last step
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

Let's look more closely at individual items to get a better understanding.

```json, name=site x r3ply metadata
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

This is just metadata about concerning the site, r3ply server, etc... that serviced this comment.

Next let's look at `author`:

```json, name=author information
  ...
  "author": {
    "pseudonym": "2ec68974e2f82...",
    "token": "..."
  },
  ...
```

Here we see details about the comment's author. Their email address has been anonymized to a stable `pseudonym` that can be used like an ID. There's also a long `token` which isn't shown fully here (You can read more about these in the [docs](/todo), but it isn't necessary right now).

```json, name=comment payload
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

Here's the actual `comment` object. There're three nearly identical versions of the comment body: `txt`, `md`, and `html`. This is because r3ply supports text written as markdown, as well as converting that markdown to HTML, but it will also strip out malicious html tags. You can configure this further within the `[comment]` object ([docs](@/docs/config.md#comments-configuration)).

There's also the `subject` field of the `comment` object, which tells us the URL of what the comment was in response to. Using this you should be able to identify the page the comment belongs on.

## Integrating Comments in Your Site

To take the comments and build them into your site you just treat them like you would do any other content. Since everyone's websites are built differently, specific advice can't be given, however r3ply allows you to customize how comments look using a templating language. Therefore you have a few options at your disposal. The choice is yours.

1. You can just save comments as plain json files and build your site from those
2. or you can customize it in a way that works with how you would like them to be built into your site.

Let's look at a quick example though, using the comment [from above](./#full-comment-example). We could render that comment as HTML as follows:

```html, name=html example of comment
<article data-comment-id="48ec61da69b743cda2d6747efe6dca80">
  <header>
    <time datetime="2025-11-08T14:58:08+00:00">26 August, 2025</time>
    <span> - </span>
    <strong>5b4f46b</strong> 🗣️
  </header>
  <section>
    <blockquote>
      <p>I would appreciate the advice. Top 10 reasons or even top 5 reasons. What are your favorite tech and non-tech podcasts?</p>
    </blockquote>
  </section>
  <hr>
  <nav>
    <a href="/reviews/guybrushs-best-comebacks">View related post</a>
    <a href="/commenters/5b4f46b5/">More posts by user</a>
  </nav>
</article>

```

And that same comment above would render like this (with a little added styling):

<article class="bg-teal-600 p-4 md:p-6 rounded-lg" data-comment-id="b69922e4da6e45cf9cd75cc3b878fc5c">
  <header class="text-black text-xl">
    <time datetime="2018-08-26T07:24:01+00:00" class="text-blue-700 font-serif">August 26, 2018</time><span class="text-black"> - </span><strong class="text-gray-900 font-mono">2ec6897</strong> 🗣️
  </header>
  <section>
    <blockquote class="border-red-400 text-black!">
      Is it possible to run a startup successfully without Investor/funding? Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?
      <p>And if yes, are there any conceivable reasons for a startup to be a bank startup?</p>
    </blockquote>
  </section>
  <hr class="m-0 p-0">
  <nav class="flex justify-end items-center divide-x divide-red-400">
    <a class="px-2 text-yellow-500!"
       href="/reviews/toughest-fights-in-monkey-island/">
      View related post
    </a>
    <a class="px-2 text-yellow-500!" href="/commenters/2ec6897/">More posts by user</a>
  </nav>
</article>

To get something like the above example you can add the `comment_{}` variable (under `[comments]`):

<!-- prettier-ignore-start -->
```toml, linenos, name=updated config with templating, hl_lines=13-31
version = "0.0.1"
enabled = true

[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "6Be8MUKnqpXZ73MDbX2u2g"
issued = "2025-11-08"
label = "CLI"

[comments.email]
enabled = true
"comment_{}" = """
<article data-comment-id="{{ comment.id }}">
  <header>
    <time datetime="{{ email.date }}">{{ email.date | date(format="%d %B, %Y") }}</time>
    <span> - </span>
    <strong>{{ author.pseudonym[:7] }}</strong> 🗣️
  </header>
  <section>
    <blockquote>
      {{ comment.html }}
    </blockquote>
  </section>
  <hr>
  <nav>
    <a href="{{ comment.subject.path }}">View related post</a>
    <a href="/commenters/{{ author.pseudonym[:8] }}/">More posts by user</a>
  </nav>
</article>
"""

[moderation]
enabled = true
github = [ ]
webhook = [ ]

  [[moderation.local]]
  "file_path_{}" = "comment_{{ comment.id[:8] }}.json"
  enabled = true
  "allow*" = [ ]
```
<!-- prettier-ignore-end -->

To get more ideas on what's possible, check out the [demo](@/demo.md) section of the website.

## Summary & Next Steps { #next-steps }

You should now able to simulate comments via email with `re simulate email`, and render them using your site's build pipeline.

The development process from here is going to be just iterating on the steps above, using the `re` CLI tool, until you come up with something that you like. There's a lot of helpful functionality waiting to be discovered in the [config](@/docs/config.md) and [CLI](@/docs/cli.md) sections of the docs.

---

When you're ready, you can deploy your site online to receive comments publicly, via email.

To do that you're going to need to add a new site entry for your site's public domain:

{{ make_signet() }}

Next, you'll want to add another moderation channel to your r3ply config. In this tutorial we only covered the `local` moderation channel. For example you can add GitHub moderation like so:

```toml
# E.g. add moderation by GitHub PR
[[moderation.github]]
owner = "<ACCOUNT>"
repo = "<REPO>"
"file_path_{}" = "content/comments/{{ comment.id[:8] }}.md"
```

Finally, read the [config](/todo) and [CLI](/todo) docs to take full advantage of r3ply.

{{ fleuron_fish() }}

{{ next_prev(prev_path="/docs/" prev_text="Docs Home" next_path="/docs/overview/" next_text="r3ply Overview") }}