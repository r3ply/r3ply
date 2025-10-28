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

```name = tree structure of r3ply site, linenos, hl_lines=5-7 14-17 19-21, hide_lines=23-1000
.
├── config.toml # Zola config
├── content # Where markdown files are stored in Zola
│   ├── _index.md
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
    ├── index.html
    └── shortcodes
        ├── fig.html
        ├── fleuron_fish.html
        ├── info.html
        ├── make_signet.html
        ├── next_prev.html
        └── schema_comment.html
```

Great, that's the file structure. Our site's r3ply config will start out as follows:

```toml
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
