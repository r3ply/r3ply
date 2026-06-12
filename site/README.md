# r3ply site and docs

`/docs/content` contains the documentation as a [Zola](https://getzola.org/) static site, with tailwind 4.1.x for styling.

## Install/Build/Run

The site depends on Zola v0.20.0.

```bash
# install dependencies
pnpm install
# initialize submodules
# currently just comments
pnpm initialize
# build site
# use `BUILD_OPTS` to specify options
pnpm build
# continuously build and serve (in memory)
# Listens at 127.0.0.1:7759 by default
# Use `SERVE_OPTS` to specify options
pnpm serve
```

See the site's [package.json](./package.json) for more.

## Comments

Comments are located in [`content/comments`](./content/comments/) but maintained as separate repo – for better isolation – and pulled into this repository as a [git submodule ↗](https://git-scm.com/book/en/v2/Git-Tools-Submodules). The site pulls in the HEAD of the master branch upon initialization.

To pull in new comments, cd into [`content/comments`](./content/comments/) and `git pull`. Similarly, a broken comment can be debugged by syncing with the remote and checking out its branch.

### Comment Cache

Commands for simulating the comment cache locally:

```bash
# All must be run from within the `site` directory

# Start comment cache
# Listens at 127.0.0.1:2274
re cache serve

# Clears out entire cache
re cache clean
```

To write comments to the cache run `re simulate email --subject "<PATH>"`.

The local cache stores comments as files in [`.r3ply/static/cache/comments/pending/`](.r3ply/static/cache/comments/pending/). [^1]

[^1]: currently they use a `.html` extension, because that was the easiest way to match [the API](./content/docs/api.md), but the static server sets their content type header to json. If you know of a better or easier way to solve this then please file an issue.

## Variables

### Zola `extra` Variables

The [Zola config](./config.toml) has variables that can be specified by the user and will then be made available at build/serve time. Below is an example of them, although the specific values may change and it's best to consult the actual file.

```toml
# Put all your custom variables here
[extra]
r3ply_version = "0.0.1"
r3ply_api_domain = "r3ply.com"
comments_email = 'r3ply site & docs <r3ply.com@r3ply.com>'
mail_body_instructions = """

﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍
1. Write you comment above this ☝️ line
2. When you're ready just hit send 📤
3. Do NOT edit the email subject ⚠️

NOTE: Your email address will remain private

A subset of markdown can be used
(no images, headings, or script tags)

(Email signatures below 👇 will be ignored)
﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉
"""

[extra.prod]
site_domain = "r3ply.com"
cache_server = "https://r3ply.com"

[extra.local]
site_domain = "site.local.test"
cache_server = "http://127.0.0.1:2274"
```

### Environment Variables

**`BUILD_OPTS`**

Specify build options to be used with `pnpm build`.

**`SERVE_OPTS`**

Specify serve options to be used with `pnpm serve`.

**`CF_PAGES`**

If `CF_PAGES=1` it indicates that the site is being run in production. This can be used locally as well to debug a problem that only appears in production, for example if pending comments render fine with the local cache but break somehow when served by the production cache.

This environment variable is used to switch other variables set in the [Zola config](./config.toml).

