+++
title = "r3ply docs: Getting Started"
template = "doc.html"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

# Getting Started

In this tutorial we're going to walkthrough using r3ply from start to finish with an example. We will be installing the `re` CLI tool, generating a config, simulating a comment, and then discussing next steps. Follow the the steps below from within your project's top-level directory.

{% toc() %}
- [Installation & Setup](#installation-and-setup)
- [Generating a Config](#generating-a-config)
- [Simulating a Comment](#simulating-a-comment)
- [What's Inside a Comment](#inside-a-comment)
- [Summary & Next Steps](#next-steps)
- [Integrating Comments](#integrating-comments)
{% end %}

{{ fleuron_fish() }}

## Installation & Setup { #installation-and-setup }

For this tutorial you will need to install the r3ply CLI tool called `re`.

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

{% info(type="warning") %}
If you do see output from `re config validate` then you will need to fix it before you move on.
{% end %}

## Simulating a Comment

```bash
re simulate email --moderate
```

You should see a large amount of text representing each stage of the comment processing pipeline. The [docs](@/docs/overview.md#the-email-comment-pipeline) cover output more in-depth, but it's basically the entire email to comment pipeline broken into stages.

{% info(type="tip") %}
`re simulate email` generates a pretty huge amount of text. Normally it will be filtered. The [CLI docs](@/docs/cli.md#simulate-filtering-output) cover how to do that.
{% end %}

The `--moderate` flag told `re` to to send the comment for moderation. Towards the bottom of the output you should see something similar to this (but not exactly the same):

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
  relative_path = "content/comments/49aa56d3.json"
  # `comment` variable elided, see comment output from earlier steps in docs
  comment = '[elided... see "Comment: Processed" above]'

################################
# Ticket portion of moderation #
################################

# `ticket.local` is the response to a request for local moderation.
[ticket.local]
absolute_path = "/Users/demo/Developer/r3ply/site/content/comments/49aa56d3.json"
```
<!-- prettier-ignore-end -->

At the bottom we see the `absolute_path` the comment was written to. You can change this path by editing your config (`file_path_{}` under `[[moderation.local]]`).

## What's Inside a Comment { #inside-a-comment }

Now that we can simulate the receiving comments based on a real configuration, we need to understand what's inside a comment object. Open the file that was at the `absolute_path` from the last step. You can also expand the one that was used during the making of this tutorial.

<details class="group">
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
    "pseudonym": "30e991c8dd7ef21de607f346d063d68033338049778be8aee61410c8a96a4d13",
    "token": "qQ3KhRG_ZTbBOBZ9vFWk2MSWhHeWJ8ZBSKXbwwyRdp6auUPlq0MavGiVo0q0P2QWQzf-S7a4KrFioEmyag_6EbxHeXXsZzxElT85e68Hb4Be5p75BdClBeVOCqqHONjRB6R9KxXcjW4V313HVTBHG8iH0H4IwJ0iYoPov_b3Tk-OULtHrNS1rpzdP_1s2atMqm02qhPvWDneC2D-dwXdC0YBMoRvonBI40UPBKT5g_ukpf_GI9T3r8Q-Is_9kjPM8hJ2AQ9vKRME3a3qxH6-139UtCVjgdNhvb5S1qyUWy7afZvv0RZNFS8qLJwy63czZR1rGvT8Jx9fvfrKt-zYYjt8BnggopaWqecSTfqzfPCHHZ-SFhvbhzvUPpnmmrsafSRHR2k0-77lI9LKT9jWiBd5bGykNtS-OO4ggRjKd7iii4ofqM7WywQxQVlylmbkSt4hxq1s7Rdn8KV9"
  },
  "comment": {
    "id": "49aa56d3ab184f67a4643437d0837aef",
    "ts_rcvd": "1762680510",
    "subject": {
      "url": "https://site.local.test/docs/getting-started/",
      "origin": "https://site.local.test",
      "protocol": "https:",
      "hostname": "site.local.test",
      "path": "/docs/getting-started/"
    },
    "txt": "If you think about it... commenting systems have been a sort of [great filter](https://en.wikipedia.org/wiki/Great_Filter) for websites, since at least the 1990s.\r\n",
    "md": "<p>If you think about it... commenting systems have been a sort of <a href=\"https://en.wikipedia.org/wiki/Great_Filter\">great filter</a> for websites, since at least the 1990s.</p>\n",
    "html": "<p>If you think about it... commenting systems have been a sort of <a href=\"https://en.wikipedia.org/wiki/Great_Filter\" rel=\"noopener noreferrer\">great filter</a> for websites, since at least the 1990s.</p>\n"
  },
  "email": {
    "to": "site.local.test@cli.r3ply.test",
    "subject": "/docs/getting-started/",
    "date": "2025-11-09T09:28:30+00:00",
    "text": "If you think about it... commenting systems have been a sort of [great filter](https://en.wikipedia.org/wiki/Great_Filter) for websites, since at least the 1990s.\r\n",
    "auth": {
      "dkim": false,
      "spf": false,
      "dmarc": false,
      "pass": false
    },
    "from": {
      "pseudonym": "acae7e02620773047964ab4e7e6af86278d93582f3e6bd67640936f7e51229c3",
      "signet": "wWM5hk4DKr1xVRhVq-7aog",
      "issued": "2025-10-16",
      "token": "qQ3KhRG_ZTbBOBZ9vFWk2MSWhHeWJ8ZBSKXbwwyRdp6auUPlq0MavGiVo0q0P2QWQzf-S7a4KrFioEmyag_6EbxHeXXsZzxElT85e68Hb4Be5p75BdClBeVOCqqHONjRB6R9KxXcjW4V313HVTBHG8iH0H4IwJ0iYoPov_b3Tk-OULtHrNS1rpzdP_1s2atMqm02qhPvWDneC2D-dwXdC0YBMoRvonBI40UPBKT5g_ukpf_GI9T3r8Q-Is_9kjPM8hJ2AQ9vKRME3a3qxH6-139UtCVjgdNhvb5S1qyUWy7afZvv0RZNFS8qLJwy63czZR1rGvT8Jx9fvfrKt-zYYjt8BnggopaWqecSTfqzfPCHHZ-SFhvbhzvUPpnmmrsafSRHR2k0-77lI9LKT9jWiBd5bGykNtS-OO4ggRjKd7iii4ofqM7WywQxQVlylmbkSt4hxq1s7Rdn8KV9"
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
    "pseudonym": "30e991c8dd7ef21de607f346d063d68033338049778be8aee61410c8a96a4d13",
    "token": "..."
  }
  ...
```

Here we see details about the comment's author. Their email address has been anonymized to a stable `pseudonym` that can be used like an ID. There's also a long `token` which isn't shown fully here (You can read more about these in the [docs](@/docs/overview.md#privacy), but it isn't necessary right now).

```json, name=comment payload
  ...
  "comment": {
    "id": "49aa56d3ab184f67a4643437d0837aef",
    "ts_rcvd": "1762680510",
    "subject": {
      "url": "https://site.local.test/docs/getting-started/",
      "origin": "https://site.local.test",
      "protocol": "https:",
      "hostname": "site.local.test",
      "path": "/docs/getting-started/"
    },
    "txt": "If you think about it... commenting systems have been a sort of [great filter](https://en.wikipedia.org/wiki/Great_Filter) for websites, since at least the 1990s.\r\n",
    "md": "<p>If you think about it... commenting systems have been a sort of <a href=\"https://en.wikipedia.org/wiki/Great_Filter\">great filter</a> for websites, since at least the 1990s.</p>\n",
    "html": "<p>If you think about it... commenting systems have been a sort of <a href=\"https://en.wikipedia.org/wiki/Great_Filter\" rel=\"noopener noreferrer\">great filter</a> for websites, since at least the 1990s.</p>\n"
  },
  ...
```

Here's the actual `comment` object. There're three nearly identical versions of the comment body: `txt`, `md`, and `html`. This is because r3ply supports text written as markdown, as well as converting that markdown to HTML, but it will also strip out malicious html tags. You can configure this further within `[comment.sanitize_html]` ([docs](@/docs/config.md#comments-configuration)).

{% info(type="warning") %}
It is strongly advised to only use the `.html` content when you render your comments. Out of the three, only `.html` is sanitized. Otherwise it's possible malicious comments could be crafted.
{% end %}

There's also the `subject` field of the `comment` object, which tells us the URL of what the comment was in response to. Using this you should be able to identify the page the comment belongs on.

## Integrating Comments { #integrating-comments }

To build comments into your site you just treat them like you would do any other content. Since everyone's websites are built differently, specific advice can't be given, however r3ply allows you to customize how comments are structured using a templating language ([docs](@/docs/templating.md)). Therefore you have a few options at your disposal.

1. You can just save comments as plain json files and build your site from those
2. Or you can customize it in a way that works with how you would like them to be built into your site.

{% info(type="tip") %}
It's recommended to store the original JSON somewhere in your comment, even if you do template it. This is in case you ever need to migrate old comments to a new look.

The variable `__tera_context` is how you access the whole object.
{% end %}

Let's look at a quick example though, using the comment [from above](#inside-a-comment). We could render that comment as HTML as follows:

```html, name=html example of comment
<article data-comment-id="48ec61da69b743cda2d6747efe6dca80">
  <header>
    <time datetime="2025-11-08T14:58:08+00:00">11 November, 2025</time>
    <span> - </span>
    <strong>30e991c8</strong> 🗣️
  </header>
  <section>
    <blockquote>
      <p>If you think about it... commenting systems have been a sort of <a href="https://en.wikipedia.org/wiki/Great_Filter" rel="noopener noreferrer">great filter</a> for websites, since at least the 1990s.</p>
    </blockquote>
  </section>
  <hr>
  <nav>
    <a href="/docs/getting-started/">View related post</a>
    <a href="/commenters/30e991c8/">More posts by user</a>
  </nav>
</article>
```

And that same comment above would render like this (with a little added styling):

<div class="p-4 rounded-lg dark:bg-gray-800/50 bg-blue-200/50">
  <article class="bg-teal-500 dark:bg-teal-600 rounded-lg p-4 md:p-6" data-comment-id="b69922e4da6e45cf9cd75cc3b878fc5c">
    <header class="text-black text-xl">
      <time datetime="2025-11-09T09:28:30+00:00" class="text-blue-800 dark:text-blue-700 font-serif">11 November, 2025</time><span class="text-black"> - </span><strong class="text-gray-900 font-mono">30e991c8</strong> 🗣️
    </header>
    <section>
      <blockquote class="border-red-400 text-black!">
        <p>If you think about it... commenting systems have been a sort of <a class="text-gray-600! dark:text-slate-700!" href="https://en.wikipedia.org/wiki/Great_Filter" rel="noopener noreferrer">great filter</a> for websites, since at least the 1990s.</p>
      </blockquote>
    </section>
    <hr class="my-6! md:my-8! border-teal-600! dark:border-violet-500!">
    <nav class="flex justify-end items-center divide-x divide-teal-800 dark:divide-violet-300">
      <a class="px-2 text-violet-500 dark:text-teal-400!"
        href="/docs/getting-started/">
        View related post
      </a>
      <a class="px-2 text-violet-500 dark:text-teal-400!" href="/commenters/30e991c8/">More posts by user</a>
    </nav>
  </article>
</div>

To get something like the above example you can add the `comment_{}` variable (under `[comments.email]`):

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

{% info(type="tip") %}
If your `comment_{}` gets too long then you can put it in a separate file and reference that file with `&comment_{}` ([docs](@/docs/config.md#variables-and_types)).
{% end %}

There is much more you can do with building your comment section using templating. To get some ideas check out the [demo](@/demo.md) section.

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

{% info(type="tip") %}
To use GitHub moderation with a private repo, you have to give the [r3ply GitHub bot](https://github.com/apps/r3ply) permission to access your repo.
{% end %}

With GitHub moderation you should see incoming comments like this:

{% fig(caption="The GitHub bot helps keep your commit history clean.", dark="/screenshots/github-moderation_dark.png", add_class="pb-4 md:p-4 rounded-lg prose-figcaption:-mt-2 bg-blue-100/50 dark:bg-slate-950/50") %}
![Screenshot of a comment waiting for GitHub Moderation](/screenshots/github-moderation_light.png)
{% end %}

The details (PR title, commit message, etc...) are all customizable, as are many things and features in r3ply.

Read the [config](@/docs/config.md) and [CLI](@/docs/cli.md) docs to take full advantage of all the features.

{{ fleuron_fish() }}

{{ next_prev(prev_path="/docs/" prev_text="Docs Home" next_path="/docs/overview/" next_text="r3ply Overview") }}