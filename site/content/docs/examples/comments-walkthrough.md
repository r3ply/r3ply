+++
template = "doc.html"
title = "r3ply docs: Comments Walkthrough"
+++

# Comments Walkthrough

In this tutorial **we're going to do a complete walkthrough of adding comments to a site** using r3ply... by building r3ply's demo comment section.

It will assume you have some familiarity already with the basics, but links will be provided anyways in case you need a refresher. Let's get started!

## Starting Out

Let's establish a starting point. The r3ply website uses the [Zola](https://getzola.org) static site generator, therefore you may have to adapt some of the ideas here to your own use case. Still, the concepts are the same: comments should be treated like any kind of content. It needs to become HTML eventually.

Here's a simplified tree view of the r3ply website with comments:

```name = tree structure of r3ply site, linenos, hl_lines=5-7 14-17 19-21, hide_lines=23-26
.
├── config.toml # Zola config
├── content # Where markdown files are stored in Zola
│   ├── _index.md # <-- where the comment demo lives
│   ├── comments # This is where our comment files will live
│   │   ├── README.md
|   |   └── # Each comment will be a file in this directory
│   └── docs
│       └── # ... elided (not relevant to the tutorial)
├── css
│   └── input.css
├── media
├── README.md
├── static
│   ├── .well-known
│   │   └── r3ply
│   │       └── config.toml # Location of our site's r3ply config
│   └── # ... elided (not relevant to the tutorial)
└── templates # Where we will process the comment (as content) into HTML
    ├── macros
    │   └── comment.html # <-- TODO: our work will go here
    ├── # ... elided (not relevant to the tutorial)
    ├── includes
    │   ├── side-nav-toggle.html
    │   ├── side-nav.html
    │   └── top-nav.html
    ├── index.html # <-- the template of the homepage
    └── shortcodes
        ├── fig.html
        └── # ... elided (not relevant to the tutorial)
```

Great, that's the file structure. Our site's r3ply config will start out as follows:

```toml, name=static/.well-known/r3ply/config.toml (v1)
version = "0.0.1"
enabled = true

[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "wWM5hk4DKr1xVRhVq-7aog"
issued = "2025-10-16"
label = "CLI"

[comments.email]
# With no `comment_{}` set, the default is just
# JSON consisting of the full comment context

[[moderation.local]]
"file_path_{}" = "content/comments/{{ comment.id[:8] }}.json"
```

(💡: _if you don't recognize the `file_path{}` syntax see [Config > Variables & Types](@/docs/config.md#variables-and-types)_)

---

The plan will be to:

1. Get comments appearing on the screen.
2. Template the comments to the HTML we want.
3. Integrate the template with the comment cache.

## Step 1: Getting Comments to Appear

Let's start by getting some comment files in their directory. If you recall from the [starting out](#starting-out) section, our comments will live in `content/comments`.

We can use the following command to generate comments quickly.

```hl_lines=5
# simulate an email comment: (see /docs/cli for a refresher)
# `--subject "/"` comment subject is homepage (where demo lives)
# `--moderate` enable moderation (only "local" moderation is enabled)
# `--filter moderation` filter output to just the moderation step
re simulate email --subject "/" --moderate --filter moderation
```

And we should get output similar – but not exactly the same – as follows:

```toml, name=simulate email comment (only moderation output), linenos, hl_lines=14, hide_lines=18-1000
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
  relative_path = "content/comments/0d495c4e.json"
  comment = "[elided... see above (or add `comment` to --filter`)]"

# Remaining code elided...
################################
# Ticket portion of moderation #
################################

# `ticket.local` is the response to a request for local moderation.
[ticket.local]
absolute_path = "/Users/spence/Developer/r3ply/site/content/comments/0d495c4e.json"


# === Moderation: Other ===

# moderation channels in your config that were ignored by the CLI (they're unsupported)
ignored = [ "enabled", "webhook" ]

# unexpected moderation results that haven't been fully implemented
not_implemented = [ ]
```

So now we can take a look at the comment that was written at that path:

<details class="group">
  <summary class="bg-violet-300 border-2 border-black dark:border-blue-400 rounded-lg py-3 px-2 w-48 hover:cursor-pointer font-extrabold text-gray-800 ml-auto">
    <span class="group-open:hidden">Expand to See File</span>
    <span class="hidden group-open:inline">Close File Details</span>
  </summary>

```json, name=content/comments/0d495c4e.json, linenos
{
  "r3ply": {
    "config_version": "0.0.1",
    "server": "cli.r3ply.test",
    "site": "site.local.test",
    "signet": "wWM5hk4DKr1xVRhVq-7aog",
    "issued": "2025-10-16"
  },
  "author": {
    "pseudonym": "6e5e0fd1bd141bd4243e2ef83774f418a52129a175971f376ffed493b3420d9d",
    "token": "A0QhGuTXLfvhW4UT4SNLXFWcVbXLfWYZbMeKj0H4a76mNqIYefk96uR2i5s0iZi3fncTgQqSPKoy_5mybBFCgn8bd8c-KDIImjVPImKaj4FZbhalTZu2crqaFct2lIpoLo96-1FdXXg9lfg_rDy-WpOW75euhd6PAF5ZUoE9sQziof19PF9ZKlRIJgfDz8Y2DI5_ppq2tsKZCfni3gPMmiEvv5NxYEGf5Ojs5u_0o6EmXm8p9QST3QsM7nTmGCSmiWTTP6wUgN37Dp5ecph24jVN8cH6n1-eSHv-S7Zu8Bq011njixkQ7nv3q9qlJZgyrjlWovZfTLwBpxI5d3Tj4bPDKA_w3pdpHoxZSltpllxswJ4jpF0WvdKtt8UhYoDa7fvk45mF4TANAg0BzgrHSTyNhZkl6qapIgfcOF4K-lz_ILWcFAbAOAsBkD2Eh2owpPw7nvnLHc5uM_w6"
  },
  "comment": {
    "id": "0d495c4ef01241f280a25802566d4cb0",
    "ts_rcvd": "1761647918",
    "subject": {
      "url": "https://site.local.test/",
      "origin": "https://site.local.test",
      "protocol": "https:",
      "hostname": "site.local.test",
      "path": "/"
    },
    "txt": "In addition, this computer has only one working USB port, so I cannot insert devices without disconnecting the keyword. How can I prepare this interview?",
    "md": "<p>In addition, this computer has only one working USB port, so I cannot insert devices without disconnecting the keyword. How can I prepare this interview?</p>\n",
    "html": "<p>In addition, this computer has only one working USB port, so I cannot insert devices without disconnecting the keyword. How can I prepare this interview?</p>\n"
  },
  "email": {
    "to": "site.local.test@cli.r3ply.test",
    "subject": "/",
    "date": "2023-04-23T15:30:32+00:00",
    "text": "In addition, this computer has only one working USB port, so I cannot insert devices without disconnecting the keyword. How can I prepare this interview?",
    "auth": {
      "dkim": false,
      "spf": false,
      "dmarc": false,
      "pass": false
    },
    "from": {
      "pseudonym": "6e5e0fd1bd141bd4243e2ef83774f418a52129a175971f376ffed493b3420d9d",
      "signet": "wWM5hk4DKr1xVRhVq-7aog",
      "issued": "2025-10-16",
      "token": "A0QhGuTXLfvhW4UT4SNLXFWcVbXLfWYZbMeKj0H4a76mNqIYefk96uR2i5s0iZi3fncTgQqSPKoy_5mybBFCgn8bd8c-KDIImjVPImKaj4FZbhalTZu2crqaFct2lIpoLo96-1FdXXg9lfg_rDy-WpOW75euhd6PAF5ZUoE9sQziof19PF9ZKlRIJgfDz8Y2DI5_ppq2tsKZCfni3gPMmiEvv5NxYEGf5Ojs5u_0o6EmXm8p9QST3QsM7nTmGCSmiWTTP6wUgN37Dp5ecph24jVN8cH6n1-eSHv-S7Zu8Bq011njixkQ7nv3q9qlJZgyrjlWovZfTLwBpxI5d3Tj4bPDKA_w3pdpHoxZSltpllxswJ4jpF0WvdKtt8UhYoDa7fvk45mF4TANAg0BzgrHSTyNhZkl6qapIgfcOF4K-lz_ILWcFAbAOAsBkD2Eh2owpPw7nvnLHc5uM_w6"
    }
  }
}
```

</details>

Now that we have a way of generating comments and adding them to our `content/comments/` directory, we have to display them on the page they belong to. If we refer back to the plan from earlier:

> 1. Get comments appearing on the screen.

So let's figure that out now. One way might be to just load all the files in `content/comments` and then filter them by the `comment.subject.path` for our page. One way to do this in Zola is to make the `content/comments` directory a "section" ([zola docs ↗](https://www.getzola.org/documentation/content/section/)).

If we do this then Zola will automatically construct an object for that comment section – with an `assets` field – that we can access from within our templates. To make `content/comments/` a Zola section, we just need to add a bare markdown file like this.

```md, name=content/comments/_index.md
+++
# ensures that this section isn't rendered (i.e. apart of our sitemap)
render = false
+++
```

Now we can try printing some comments to the screen by editing the `template/index.html` template, where the demo will live.

```html, name=template/index.html, linenos, hide_lines=5-15 19-23, hl_lines=25-40
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- lines elided -->
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ section.title | default(value=config.title) }}</title>
  <link rel="stylesheet" href="style.css">
  <meta name="color-scheme" content="dark light">
  <link rel="icon" type="image/png" href="/favicon/favicon-96x96.png" sizes="96x96" />
  <link rel="icon" type="image/svg+xml" href="/favicon/favicon.svg" />
  <link rel="shortcut icon" href="/favicon/favicon.ico" />
  <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
  <meta name="apple-mobile-web-app-title" content="r3ply" />
  <link rel="manifest" href="/favicon/site.webmanifest" />
</head>
<body class="bg-green-50 dark:bg-slate-950 bg-[url(/patterns/bank-note.svg)] dark:bg-[url(/patterns/bank-note_dark.svg)]">
  <!-- lines elided -->
  {% include "includes/top-nav.html" %}
  <main class="py-6">
    <article class="overflow-x-clip px-4 md:px-0 mx-auto prose prose-neutral prose-pink dark:prose-invert prose-li:marker:text-black dark:prose-li:marker:text-neutral-300 prose-hr:border-black dark:prose-hr:border-gray-400">
      {{ section.content | safe }}
    </article>
  </main>
  {# Prepare comments to be used #}
  {% set comment_section = get_section(path="comments/_index.md") %}
  {% set comments = [] %}
  {% for file_path in comment_section.assets %}
    {% set json = load_data(path=file_path) %}
    {# Only add comments whose path matches the page that's being rendered #}
    {% if json.comment.subject.path == current_path %}
      {% set_global comments = comments | concat(with=json) %}
    {% endif %}
  {% endfor %}
  {# Simple way of printing the commments to the screen #}
  <ul>
    {% for c in comments %}
    <li>{{ c.comment.html | safe }}</li>
    {% endfor %}
  </ul>
</body>
</html>
```

Now if we look at the homepage we can see that comments have been added.

{% fig(caption="Not the prettiest, but we've completed step 1.", add_class="-mt-8 prose-figcaption:-mt-12") %}
![Result after following step 1](/screenshots/walkthrough-to-create-demo_after-step1.webp)
{% end %}

You can test that this working by trying to simulate a comment at a different path with `re simulate email --subject "/foo" --moderate`.

---

## Step 2: Getting the HTML We Want

