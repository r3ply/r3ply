# @r3ply/config

This project is for configs to use r3ply. Specifically it deals with the specification of these configs, and their parsing and validation.

## Config

Here's an example of the minimum config (uses all defaults)

```toml
version = "0.0.1"
domain = "your-site.com"
r3ply = ["r3ply.com", "my-test-r3ply-server.net"]

[comments.email.moderation]
type = "github"
repo = "https://github.com/you/yoursite"
"file_path_{}" = "content/comments/{{ comment.id }}.md"
```

Here's an example config, without comments

```toml
version = "0.0.1"
enabled = true
domain = "your-site.com"
r3ply = ["r3ply.com", "my-test-r3ply-server.net"]
[comments]
enabled = true
paths = ['/*', '!/private']
cache = true
md_to_html = true
sanitize_html = true
allow_tags = [
  "a",
  "br",
  "p",
  "span",
  "strong",
  "s",
  "strike",
  "del",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "code",
  "pre",
  "table",
  "tr",
  "td",
  "th",
  "caption",
  "thead",
  "tbody",
  "tfoot",
  "kbd",
  "mark",
  "sub",
  "small",
]

[comments.email]
enabled = true
subject = "path"
attachments = false
max_size_bytes = 10000
block_list = [
  'e8a20d6*',
  'e8a20d690bd22ff73603a70444197562e08a257f86ab49a52f45bf6d4076804a',
  'mallory@evil.com',
  '*@mallory.com',
  '*@spam.{com,net}',
]
template = """
+++
render = false
author = "{{ commentor.id | slice(end=7) }}"
date = {{ email.date }}
slug = "{{ comment.id | slice(end=8) }}"

[taxonomies]
comment = ["{{ comment.id | slice(end=8) }}"]
comments = ["{{ url.path }}"]
commenters = ["{{ commentor.id | slice(end=7) }}"]
threads = ["all"]
replies = ["0", "57808380"]

[extra]
object_path = "{{ url.path }}/"
filename = "{{ ts_rcvd }}_{{ comment.id | slice(end=8) }}-{{ commentor.id | slice(end=7) }}.md"
dt_written = email.date
ts_rcvd = {{ ts_rcvd }}
parent = "0"
comment_id = "{{ comment.id | slice(end=8) }}"
comment_id_full = "{{ comment.id }}"
commenter_id = "{{ commentor.id | slice(end=7) }}"
email_hash = "{{ commentor.id }}"
email_hash_version = "1.0.0"
dkim_pass = {{ email.auth.dkim }}
dmarc_pass = {{ email.auth.dmarc }}
spf_pass = {{ {{ email.details.spf  }}
+++

{{ comment.body_html }}
"""

[comments.email.moderation]
allow_list = ['*@alice.com', 'bob@example.com']
type = "github"
repo = "https://github.com/you/yoursite"
file_path = "/content/comments/{{ comment.id | slice(end=8) }}.md"
commit_msg = """
Comment "{{ comment.body_txt | truncate(length=32) }}" from `{{ commentor.id | slice(end=7) }}`

Date: {{ comment.date }}
Sender:  {{ commentor.id }}
dkim_pass: {{ email.dkim }}
dmarc_pass: {{ email.dmarc }}
spf_pass: {{ email.spf }}
In reply to: {{ url }}
Comment:

> {{ comment.body_txt |  }}
"""
pr_title = """
Comment "{{ comment.body_txt | truncate(length=32) }}" from `{{ commentor.id | slice(end=7) }}`
"""
pr_body = """
| Date:         | ${datetime_str}                                                        |
|:--------------|:-----------------------------------------------------------------------|
| Sender:       | (hashed to `${sha256_sender_8}[…]`)                                  |
| Auth Checks:  | dkim=${dkim_check}, dmarc=${dmarc_check}, spf=${spf_check}             |
| Replying to:  | ${url.href}                                                            |

{{ comment.body_txt | truncate(length=128) }}

## Options:

• 🔮 preview comment [here](${preview_url})
• 🤮 To ban `${sha256_sender_8}[…]` from commenting in the future: [click here (TODO)](http://todo.com)
"""

[comments.email.notify]
commenter = true
comment_submitted_notif = """
Your comment was submitted
"""
moderator = true
comment_received_notif = """
A new comment has been received
"""

[comments.email.extra]
```

And here's the same config but annotated:

```toml
# [Required] set to determine which version of the API to use
version = "0.0.1"
# [Optional, default is true] If false, config is completely ignored.
enabled = true
# [Required] The domain that this site is configuring (config must be served from same domain)
domain = "your-site.com"
# [Optional, default is r3ply.com] The domains this site expects to receive r3plyies from
# [Note 1: this can be useful for testing or transitioning to a new r3ply server]
# [Note 2: glob patterns are allowed here, so you can simply add `*` to accept all r3plies]
# [Note 3: It is not recommended to accept r3plies from servers you don't know]
r3ply = ["r3ply.com", "my-test-r3ply-server.net"]
# [Optional] Configure comments for your site at `domain`
[comments]
# [Optional, default is true] If false, all comments are ignored.
enabled = true
# [Optional, default is `['/*']`] The URL paths to receive comments from
# You can use any glob pattern supported by `micromatch`
# For example `/*` means anything, but also you can use `!/private` to exclude that
paths = ['/*', '!/private']
# [Optional, default is true] Will cache comment data online, so it's available immediately
# The terms of the cache are controlled by the r3ply server that hosts the cache
# For example, the r3ply.com server will cache data for two weeks without an account
cache = true
# [Optional, default is true] Will convert markdown to html using pulldown-cmark
# [Note: if you want to limit the allowed markdown then do that with `allow_tags`]
md_to_html = true
# [Optional, default is true] If false, any html will be allowed
sanitize_html = true
# [Optional] Specify html to allow. Has no effect if `sanitize_html = false`.
allow_tags = [
  "a",
  "br",
  "p",
  "span",
  "strong",
  "s",
  "strike",
  "del",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "code",
  "pre",
  "table",
  "tr",
  "td",
  "th",
  "caption",
  "thead",
  "tbody",
  "tfoot",
  "kbd",
  "mark",
  "sub",
  "small",
]

# [Optional] Configure comments received via email
[comments.email]
# [Optional, default is true] If false, comments via email are ignored.
enabled = true
# [Optional] Designates the subject line of emails are expected to be used.
# [Note 1: currently only `"path"` is allowed. The path can be relative, absolute, or a URL]
# [Note 2: if an email has the full URL, the domain MUST match this config's `domain`]
subject = "path"
# [Optional, default is false] If false, attachments are ignored.
attachments = false
# [Optional, default is 1 MB] Ignored if higher than system allows.
max_size_bytes = 10000
# [Optional, default is `[]`] site-wide block list.
# incoming mail that matches elements in here will be ignored
# Use email ID (hmac made by r3ply of email address) or string of email address
# You can use globbing patterns, otherwise matches must be exact
block_list = [
  'e8a20d6*',
  'e8a20d690bd22ff73603a70444197562e08a257f86ab49a52f45bf6d4076804a',
  'mallory@evil.com',
  '*@mallory.com',
  '*@spam.{com,net}',
]
# [Optional, default is a json literal] A template to transform comment data into a comment
# [Note 1: you can also provide a URL to a file, instead of having the template in the config]
# [Note 2: the file must be served from the same domain as `domain` in this config]
template = """
+++
render = false
author = "{{ commentor.id | slice(end=7) }}"
date = {{ email.date }}
slug = "{{ comment.id | slice(end=8) }}"

[taxonomies]
comment = ["{{ comment.id | slice(end=8) }}"]
comments = ["{{ url.path }}"]
commenters = ["{{ commentor.id | slice(end=7) }}"]
threads = ["all"]
replies = ["0", "57808380"]

[extra]
object_path = "{{ url.path }}/"
filename = "{{ ts_rcvd }}_{{ comment.id | slice(end=8) }}-{{ commentor.id | slice(end=7) }}.md"
dt_written = email.date
ts_rcvd = {{ ts_rcvd }}
parent = "0"
comment_id = "{{ comment.id | slice(end=8) }}"
comment_id_full = "{{ comment.id }}"
commenter_id = "{{ commentor.id | slice(end=7) }}"
email_hash = "{{ commentor.id }}"
email_hash_version = "1.0.0"
dkim_pass = {{ email.auth.dkim }}
dmarc_pass = {{ email.auth.dmarc }}
spf_pass = {{ {{ email.details.spf  }}
+++

{{ comment.body_html }}
"""

# [Required] Specify how comments should be moderated once they're ready for review
# [Note: Open a PR if you want to new `moderation` types]
[comments.email.moderation]
# [Optional, default is `[]`] matches to allow_list will be approved, if the processor
# Matches in the block_list are made before the allow_list
# Therefore globs like `*` will not override whatever is in the block_list
allow_list = ['*@alice.com', 'bob@example.com']
# [Required] (for now) the only options are "github" and "webhook"
# `github` can open PRs automatically with new comments
# For the allow_list to work you will need to give access to the r3ply GitHub bot (TODO: link)
type = "github"
# [Required] If you're using `r3ply-github-bot` then you must specify the URL of the repo
repo = "https://github.com/you/yoursite"
# [Required] If you're using the `r3ply-github-bot` then specify the file path in the repo
# Templating is allowed here. The variables available are the same as the `template` field
"file_path_{}" = "/content/comments/{{ comment.id | slice(end=8) }}.md"
# [Optional, see (TODO: link) for default]
"commit_msg_{}" = """
Comment "{{ comment.body_txt | truncate(length=32) }}" from `{{ commentor.id | slice(end=7) }}`

Date: {{ comment.date }}
Sender:  {{ commentor.id }}
dkim_pass: {{ email.dkim }}
dmarc_pass: {{ email.dmarc }}
spf_pass: {{ email.spf }}
In reply to: {{ url }}
Comment:

> {{ comment.body_txt |  }}
"""
# [Optional, see (TODO: link) for default]
"pr_title_{}" = """
Comment "{{ comment.body_txt | truncate(length=32) }}" from `{{ commentor.id | slice(end=7) }}`
"""
# [Optional, see (TODO: link) for default]
"pr_body_{}" = """
| Date:         | ${datetime_str}                                                        |
|:--------------|:-----------------------------------------------------------------------|
| Sender:       | (hashed to `${sha256_sender_8}[…]`)                                    |
| Auth Checks:  | dkim=${dkim_check}, dmarc=${dmarc_check}, spf=${spf_check}             |
| Replying to:  | ${url.href}                                                            |

{{ comment.body_txt | truncate(length=128) }}

## Options:

• 🔮 preview comment [here](${preview_url})
• 🤮 To ban `${sha256_sender_8}[…]` from commenting in the future: [click here (TODO)](http://todo.com)
"""

# [Optional]
[comments.email.notify]
# [Optional, default is true] Set to false to disable all notifications to the commenter
commenter = true
# [Optional, default is true] Set to false to disable notifying the commenter upon submission of their email comment"
notify_commenter_upon_submission = true
# [Optional, see (TODO: link) for example]
"comment_submitted_notif_{{}}" = """
Your comment was submitted
"""
# [Optional, default is true] If false, no email notification sent to moderator
moderator = true
# [Optional, see (TODO: link) for example]
"comment_received_notif_{{}}" = """
A new comment has been received
"""

# [Optional] Namespace open to the user to add extra config values for their own use
[comments.email.extra]
```

If you run your own r3ply system, you will almost certainly want to configure the system.

<!-- prettier-ignore -->
```toml
# [Required] this is used to determine what version of the schema to use (and the version of r3ply)
version = "0.0.1"
# [Required] this is the domain that is hosting the r3ply system, e.g. where emails are sent to
domain = "r3ply.com"
# [Optional, default is true] If false, system will skip any requests it receives
enabled = true
# [Optional, default is `["*"]`] Glob pattern of sites to forward comments to
sites = ["*"]
# [Required (at least one)] the email address(es) for the system-wide administration
# [Note: users can email admin@<domain> and r3ply will forward these emails to this list]
[[admin]]
name = "Guybrush Threepwood"
email = "guybrush@example.com"
# [Optional] Configure parameters related to receiving comments via email
[email]
# [Optional, default is true] If false, all emails are ignored.
# [⚠️: this affects sites using this r3ply instance, e.g. will also not receive comments if disabled.]
enabled = true
# [Optional, default is 5 MB] Ignored if higher than system allows.
# [Note: the min(system.max_size_bytes, site.max_size_bytes) will be the final max_size_bytes]
max_size_bytes = 5,242,880
# [Optional, default is false] If false, replies to comments from site moderators are ignored
# [⚠️: this affects sites using this r3ply instance, e.g. they can't reply "APPROVE" to comments.]
# [Note: site moderation emails MUST have dkim, dmarc, and spf enabled for moderation to work]
moderation = true
# [Optional, default is true] If false attachments are ignored
# [⚠️: this affects sites using this r3ply instance, e.g. will have their attachment settings ignored.]
attachments = true
# [Optional, default is `[]`] system-wide block list.
# Incoming mail that matches elements in here will be ignored
# Use email ID (hmac made by r3ply of email address) or string of email address
# You can use globbing patterns, otherwise matches must be exact
block_list = ['*@spam.{com,net}']
```

## Build/Test/Run

How to do stuff:

```
# run the tests once
npm test

# run the tests continuously
npm run test:watch

# Generates the code to compile. Use if you need to debug that step.
npm run build:generate

# Compiles the generated code into a module for export.
npm run build:compile

# Shortcut for generating and compiling in one step
npm run build
```

## Structure

The main work is in the config files themselves. There is only one under [`/src`](./src/r3ply.siteconfig.schema.0.0.1.ts) for now. In that file is:

- the schema definition
- the code for making a type-safe parser (uses code generation)
- string templating to do the same but writing that to a file (no code generation)

Then there is a [`generate.ts`](./generate.ts) file that writes the templated string from the config file to an actual file for compilation. The compilation step then takes that file and uses it to produce a module that can be imported in other projects. The test code in turn imports this to verify that it works as expected.
