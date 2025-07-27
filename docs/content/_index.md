+++
+++

# r3ply

Commenting as simple as email.

Just add `./well-known/r3ply/config.toml` to your site, and receive comments via email at [`your-site.com@r3ply.com`](mailto:your-site.com@r3ply.com). <!-- TODO: add a subject in mailto link -->

```toml
version = "0.0.1"
domain = "your-site.com"
r3ply = ["r3ply.com"]

[comments.email.moderation]
type = "github"
repo = "https://github.com/you/yoursite"
file_path = "/content/comments/{{ comment.id }}.md"
```

High level overview:
* comments via email by default with support for other mediums
* receive comments at your own domain when you self-host
* email addresses are automatically redacted for privacy




