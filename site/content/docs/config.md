+++
title = "r3ply docs: Config"
template = "doc.html"
+++

# Configuration

Configuration is an important topic in r3ply, as it's the primary way most people would interact with the system. **This page will first cover fundamentals of r3ply configuration**, before specifying the configuration options for _site configs_ and _r3ply app configs_.

## Table of Contents { .text-right .border-b .border-dashed }

- [Config Fundamentals](#fundamentals)
  - [Versioning of r3ply](#versioning-of-r3ply)
  - [File Types and Locations](#file-types-and-locations)
  - [Config Schemas](#config-schemas)
  - [Variables & Types](#variables-and-types)
- [Site Config](#r3ply-site-config)
  - [`Sites`](#site-config-entry)
  - [`Comments`](#comments-configuration)
  - [`Moderation`](#moderation-configuration)

<div class="mt-8 -mb-4 p-0 text-lg flex justify-center gap-3 dark:text-amber-200">{{ fleuron_fish() }}</div>

## Fundamentals

Your website's config is how you will control most of r3ply's behavior. Here are some details that will help you understand how r3ply expects configs to work in general.

### Versioning of r3ply

r3ply uses semantic versioning and this is enforced by the `version` config key, which is required. All the components of r3ply – the server, config, CLI, etc... – are designed to work with their corresponding major version.

- Small changes such as bug fixes change the patch version number, i.e. `0.0.Z`
- Backwards compatible features change the minor version number, i.e. `0.Y.0`
- Breaking changes update the major version and, i.e. `X.0.0`

(Note: _Your version of r3ply can be specified at the top-level of your site config, e.g. `version = "0.0.1"`_.)

In other words, if you're using a config at version 1.0.1, and a r3ply server is using 1.0.5 or 1.6.2, your config _should_ still work. The same also applies for the CLI tool.

---

{% warning() %}
However, while r3ply is in version `0.y.z` semantic versioning _can_ be broken (_although we will try not to do it too much_). This is so we can get to a stable version as quickly as possible.
{% end %}

### Config File Types & Locations { #file-types-and-locations }

r3ply configs can be written as either TOML or JSON files. The r3ply servers will choose the first file that exists at the following locations, with precedence high to low:

```txt
1. <PROJECT_ROOT>/.well-known/r3ply/config.toml
2. <PROJECT_ROOT>/.well-known/r3ply/config.json
3. <PROJECT_ROOT>/.well-known/r3ply.config.toml
4. <PROJECT_ROOT>/.well-known/r3ply.config.json
5. <PROJECT_ROOT>/r3ply.config.toml
6. <PROJECT_ROOT>/r3ply.config.json
7. <PROJECT_ROOT>/r3ply.toml
8. <PROJECT_ROOT>/r3ply.json
```

`<PROJECT_ROOT>` can, for example, be a domain, or it could also be your project's top-level directory, in the context of using r3ply locally with the CLI.

### Config Schemas { #config-schemas}

r3ply's configs [are written](/todo) as a [JSON Schemas ↗](https://json-schema.org/). They can be [browsed here](/schemas).

One of the benefits of this is you can reference the schema in your configuration, enabling editor support like validation, hints/examples, and auto-complete.

Here's how you do it with JSON configs:

```JSON
{
  "$schema": "https://r3ply.com/schemas/v0.0.1/config/site.v0.0.1.json",
  "version": "0.0.1",
  "site": [{
    "domain": "spenc.es",
    "r3ply": "r3ply.com",
    "signet": "qhQ6YSUvQNLb1lCdw3kDR",
    "issued": "2025-08-22"
  }]
  /* ... */
}
```

And now VSCode will provide detailed editor support:

{% fig(caption="A very subtle typo found in a config") %}
![Screenshot showing vscode catching a very subtle typo in a config](/json-schema-editor-support.png)
{% end %}

The same can be done for TOML configs – _albeit not yet supported as well[^toml-support-for-json-schema]_ – using [tombi](https://tombi-toml.github.io/tombi/docs/installation), and then adding a schema _comment directive_ at the top.

```toml
#:schema https://r3ply.com/schemas/v0.0.1/config/site.v0.0.1.json
version = "0.0.1"

[[site]]
domain = "example.com"
r3ply = "r3ply.com"
signet = "iSQIIBcF7ka2UURJpFDkYw"
issued = 2025-08-26
```

[^toml-support-for-json-schema]: If you're interested in helping to develop better tooling see [contributing](/todo).

### Config Variables `&` Types { #variables-and-types }

A r3ply config variable consists of a _name_ and a _value_, e.g. `version = "0.0.1"`.

The _value_ assigned to a config _name_ can have many types. To help communicate this information r3ply uses variable names that follow a convention.

Skip to subsection: [`foo`](#types-normal), [`foo_{}`](#types-string-template), [`&foo`](#types-file-reference), [`foo*`](#types-glob-pattern), [`$foo`](#types-meta)

---

#### Variables named `foo` { #types-normal }

These are just normal variables. The have the same types that you expect in TOML or JSON, e.g. _string_, _number_, _date_, _list_, etc...

```toml
# string
version = "0.0.1"
# boolean
enabled = true
# date (in JSON these have to be quoted)
issued = 2025-10-24
```

---

#### Variables named `foo_{}` { #types-string-template }

The `_{}` syntax means a template string is expected.

```toml
# here the path of a file is
"file_path_{}" = "content/comments/{{ comment.ts_rcvd }}.md"
"head_branch_{}" = "comment-{{ comment.ts_rcvd }}"
"commit_msg_{}" = """
  Comment submitted:
  Sender: {{ author.pseudonym }}
  Timestamp: {{ comment.ts_rcvd }}
  Subject: {{ comment.subject.url }}"""
```

See the [string templating docs](/todo) for more info.

---

#### Variables named `&foo` { #types-file-reference }

The `&foo` syntax means the value within is referencing a file that holds the _real_ value. Paths are relative to the location of the site's r3ply config.

These variables are often combined with `_{}` ([see above](#types-string-template)) so that complex templates can have their own file. For example `&foo_{}` would read as

> a reference to a file, that within contains a string template.

Here are some examples with comments.

```toml
# `..` and `.` are relative to config path
"&relative_example" = "../foo.bar.baz.txt"
# read like, "the comment template string is in this file"
"&comment_{}" = "./viaEmail/comment.template.html"
```

Each r3ply app knows how to deference these config variables in a way that's specific to their domain. For example, the public internet version of r3ply will interpret these as a URL path and perform a `fetch` request, while the r3ply CLI app `re` will interpret this as a path on the local file system.

In either case the same variable _value_ works in both without having to be changed.

#### Variables named `foo*` { #types-glob-pattern }

The `foo*` syntax means glob patterns can be used. These variables are usually used with lists.

```toml
# i.e. only allow `"production"`
"filter*" = ["production"]
# i.e. allow all paths except those begining with "private"
"paths*" = ["**", "!/private/**"]
```

#### Variables named `$foo` { #types-meta }

The `$foo` syntax means this variable is some kind of meta variable reserved by r3ply and can usually not be changed.

```toml
# These can be safely ignored
"$comment_sources" = ["email"]
```

## Site Config { #r3ply-site-config }

Below is a site config with comments and all the defaults. For convenience there are also separate sections for [`sites`](/todo), [`comments`](/todo), and [`moderation`](/todo).

<!-- prettier-ignore-start -->
```toml
{{ schema_comment(key="version" version="v0.0.1", schema="config/site") }}
version = "0.0.1"
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/site") }}
enabled = true

# site entry for CLI (these are reserved domains)
[[site]]
{{ schema_comment(key="domain" version="v0.0.1", schema="config/signet") }}
domain = "site.local.test"
{{ schema_comment(key="r3ply" version="v0.0.1", schema="config/signet") }}
r3ply = "cli.r3ply.test"
{{ schema_comment(key="signet" version="v0.0.1", schema="config/signet") }}
signet = "cmq0jqG3c2JxKKzDJ6qpXQ"
{{ schema_comment(key="issued" version="v0.0.1", schema="config/signet") }}
issued = "2025-10-24"
{{ schema_comment(key="label" version="v0.0.1", schema="config/signet") }}
label = "CLI"

# "production" example
[[site]]
domain = "spenc.es"
r3ply = "r3ply.com"
signet = "wXyyym86v0pKerq41HiSCA"
issued = 2025-10-24
label = "prod"

# "test" example
[[site]]
domain = "test.spenc.es"
r3ply = "test.r3ply.com"
signet = "mwXjhb543US3KrSkYtHfnQ"
issued = 2025-10-24

{{ schema_comment(version="v0.0.1", schema="config/comments") }}
[comments]
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/comments") }}
enabled = true
{{ schema_comment(key="cache" version="v0.0.1", schema="config/comments") }}
# TODO: some kind of basic, automatic moderation to flag for spam
cache = false
{{ schema_comment(key="md_to_html" version="v0.0.1", schema="config/comments") }}
# TODO: remove this. People can just not use HTML if they don't want it.
md_to_html = true
{{ schema_comment(key="sanitize_html" version="v0.0.1", schema="config/comments") }}
sanitize_html = true
{{ schema_comment(key="allow_tags" version="v0.0.1", schema="config/comments", skip=["default", "examples"]) }}
# Default: (same as what's shown below)
allow_tags = [ "a", "br", "p", "span", "strong", "s", "del", "em", "u", "ul", "ol", "li", "blockquote", "hr", "code", "pre", "table", "tr", "td", "th", "caption", "thead", "tbody", "tfoot", "kbd", "mark", "sub", "small"]
# TODO: remove this. There are better ways to derive this.
"$comment_sources" = [ "email" ]

# comment options that aply to email comments
[comments.email]
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/comments/email") }}
enabled = true
{{ schema_comment(key="filter*" version="v0.0.1", schema="config/comments/email") }}
"filter*" = [ "**" ]
{{ schema_comment(key="email_signature_separator" version="v0.0.1", schema="config/comments/email") }}
email_signature_separator = """

"""
{{ schema_comment(key="attachments" version="v0.0.1", schema="config/comments/email") }}
attachments = false
{{ schema_comment(key="max_size_bytes" version="v0.0.1", schema="config/comments/email") }}
max_size_bytes = 1_048_576
{{ schema_comment(key="block*" version="v0.0.1", schema="config/comments/email") }}
"block*" = [ ]
{{ schema_comment(key="comment_mime" version="v0.0.1", schema="config/comments/email") }}
comment_mime = "text/plain"

[moderation]
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/moderation") }}
enabled = true

[[moderation.local]]
{{ schema_comment(key="file_path_{}" version="v0.0.1", schema="config/moderation/local") }}
"file_path_{}" = "comment_{{ comment.id[:8] }}.json"
enabled = true
"allow*" = [ ]

[[moderation.github]]
{{ schema_comment(key="owner" version="v0.0.1", schema="config/moderation/github") }}
owner = "<YOUR_GITHUB_USERNAME>"
{{ schema_comment(key="repo" version="v0.0.1", schema="config/moderation/github") }}
repo = "<YOUR_PROJECT>"
{{ schema_comment(key="file_path_{}" version="v0.0.1", schema="config/moderation/github") }}
"file_path_{}" = "comment_{{ comment.id[:8] }}.json"
{{ schema_comment(key="base_branch_{}" version="v0.0.1", schema="config/moderation/github") }}
"base_branch_{}" = "main"
{{ schema_comment(key="head_branch_{}" version="v0.0.1", schema="config/moderation/github") }}
"head_branch_{}" = "comment-{{ comment.ts_rcvd }}-{{ comment.id[:8] }}.md"
{{ schema_comment(key="commit_msg_{}" version="v0.0.1", schema="config/moderation/github") }}
"commit_msg_{}" = """
Comment submitted:
Sender: {{ author.pseudonym }}
Timestamp: {{ comment.ts_rcvd }}
Subject: {{ comment.subject.url }}
Comment: > {{ comment.txt | split(pat="
") | join(sep="> ") }}"""
{{ schema_comment(key="pr_title_{}" version="v0.0.1", schema="config/moderation/github") }}
"pr_title_{}" = "New comment ({{ comment.id[:8] }}) on {{ comment.subject.url }} by author `{{ author.pseudonym[:7] }}`"
{{ schema_comment(key="pr_body_{}" version="v0.0.1", schema="config/moderation/github") }}
"pr_body_{}" = ""
{{ schema_comment(key="github_host" version="v0.0.1", schema="config/moderation/github") }}
github_host = "github.com"
enabled = true
"allow*" = [ ]

[[moderation.webhook]]
{{ schema_comment(key="url" version="v0.0.1", schema="config/moderation/webhook") }}
url = "https://TODO"
{{ schema_comment(key="method" version="v0.0.1", schema="config/moderation/webhook") }}
method = "POST"
enabled = true
{{ schema_comment(key="allow*" version="v0.0.1", schema="config/moderation", def="definitions.options", skip=["default"], desc="Email addresses or pseudonyms to bypass moderation with") }}
"allow*" = [ ]
```
<!-- prettier-ignore-end -->

### Site { #site-config-entry }

The `site` config key expects is an array of objects, each as follows:

```toml
[[site]]
domain = "example.com"
r3ply = "r3ply.com"
signet = "iSQIIBcF7ka2UURJpFDkYw"
issued = 2025-08-26
```

- `domain` belongs to the site that's being configured
- `r3ply` is the domain of the r3ply service this `site` entry configures
- `signet` is issued to `domain` on behalf of `r3ply` and is used for cryptography
- `issued` is when the `signet` was issued and is used for rotations

One config file can be used for many sites. In fact this is a common scenario, where you may have one site deployed at one domain, while having another at a staging domain for testing.

To add another site, simply add another `site` entry.

### Comments { #comments-configuration }

The `comments` key is where the behavior for comments is adjusted.

```toml
[comments]
enabled = true
paths = ["/**", "!/private"]
cache = true
md_to_html = true
sanitize_html = true
allow_tags = ["p", "a"]
```

- `enabled` - disable all comments if `false`. Default is `true`.
- `paths` - URL paths to enable comments on (micromatch patterns), e.g. `["/**", "!/private"]` means _"allow comments at all paths except `/private`"_. Default is `['/**']`.
- `cache` - enable comment caching on r3ply serve. Default is `true`.
- `md_to_html` - convert markdown to HTML? Default is `true`.
- `sanitize_html` - sanitize HTML output? Default is `true`
- `allow_tags` - allowed HTML tags (requires `sanitize_html`). See below.

Default for `allow_tags` is:

```js
;[
  'a',
  'br',
  'p',
  'span',
  'strong',
  's',
  'del',
  'em',
  'u',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'code',
  'pre',
  'table',
  'tr',
  'td',
  'th',
  'caption',
  'thead',
  'tbody',
  'tfoot',
  'kbd',
  'mark',
  'sub',
  'small',
]
```

### Email

The `email` key is required for `comments`, and it has its own config.

```toml
[comments.email]
enabled = true
subject = 'url'
comment_separator = '﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍'
attachments = false
max_size_bytes = 1_048_576
block_list = ['e8a20d6*', 'mallory@evil.com', '*@spam.com']
# "comment_{}" = "ignored"
"&comment_{}" = "/comment.template.html"
"comment_{}_mime" = "text/markdown"
```

- `enabled` - disable email comments if false. Default is `true`
- `subject` - subject line handling (for now only `url` is valid). Default is `url`.
- `comment_separator` - used to separate comment body from email signature or instructions. Default is `\n`.
- `attachments` - allow email attachments. Default is `false`.
- `max_size_bytes` - max email size in bytes. Default is 1MB.
- `block_list` - email/ID blocklist. For example, `['e8a20d6*', 'mallory@evil.com', '*@spam.com']`. Default is `[]`.
- `\# comment_{}` - comment template string literal. Commented out because `&comment_{}` overrides it. Default is `undefined`.
- `&comment_{}` - path to a file that contains the template for comments. Default is `undefined`.
- `comment_{}_mime` - specify mime type for comment template. Default is `undefined`.

**Note that if neither `comment_{}` nor `&comment_{}` is defined, then the comment will result as just plain JSON object. See [template preparation](/docs/overview#template-prepared) for more details.**

### Moderation { #moderation-configuration }

The `moderation` key is also required by `comments`. This controls the parameters that r3ply uses when passing comments along for moderation. Currently either `github` or `webhook` moderation are supported.

```toml
[comments.email.moderation]
"pr_title_{}" = "New Comment by {{ author.pseudonym[:8] }}
# "pr_body_{}" = "Received on {{ comment.ts_rcvd }}"
"&pr_body_{}" = "../pr.template.txt"# "&commit_msg_{}" = "/commit.template.txt"type = "github"
"allow_list" = ["18a793ce3d", "*@spenc.es"]
repo = "https://github.com/getzola/zola"
"base_branch_{}" = "main"
"head_branch_{}" = "{{ comment.ts_rcvd }}.md"
"file_path_{}" = "content/comments/{{ comment.ts_rcvd }}.md"
"commit_msg_{}" = "Add comment by {{ author.pseudonym[:8] }}"
```

- `type` - indicates the type of moderation. Either `github` or `webhook` are supported.
- `allow_list` - matches from this list will skip moderation. Uses glob patterns.
- `repo` - gitHub repository, e.g. "https://github.com/asimpletune/spenc.es"
- `"base_branch_{}"` - the base branch. Default is main.
- `"head_branch_{}"` - the head branch. Default is `comment-{{ comment.ts_rcvd }}-{{ comment.id[:8] }}.md`
- `"file_path_{}"` - where the comment will be saved.
- `"commit_msg_{}"` - commit message template (template string).
- `# commit_msg_{}"` - Commit message template (file reference).
- `"pr_title_{}"` - pull request title template (template string).
- `# pr_body_{}"` - pull request body template (template string). Default is `""`.
- `"&pr_body_{}"`- pull request body template (template string).

And here's the webhook config

```toml
[comments.email.moderation]
type = "webhook"
"allow_list" = ["18a793ce3d", "*@spenc.es"]
url = "https://webhook.spenc.es/comment/new/"
```

- `type` - indicates the type of moderation. Either `github` or `webhook` are supported.
- `allow_list` - matches from this list will skip moderation. Uses glob patterns.
- `url` - URL of the webhook where the comment should be delivered.

**Note: new moderation channels need to be added. If you're interested in helping with that please <!-- TODO --> [contact me](/).**

### Notifications

Notifications can also be sent in response to commenters, for example to let them know their comment submission was successful and is under review.

```toml
[comments.email.notify]
commenter = false
notify_commenter_upon_submission = false
"comment_submitted_notif_{}" = "Your comment has been successfully submitted!"
"&comment_submitted_notif_{}" = "./comment.submission.notif.html"
moderator = false
notify_moderator_upon_receipt = false
"comment_received_notif_{}" = "A new comment has been received at your site!"
"&comment_received_notif_{}" = "./comment.received.notif.html"
```

- `commenter` - set to false to disable all notifications to the commenter. Default is false.
- `notify_commenter_upon_submission` - set to false to disable notifying the commenter upon submission of their email comment. Default is false.
- `comment_submitted_notif_{}"` - comment submission notification template (template string).
- `&comment_submitted_notif_{}"` - comment submission notification template (reference to a file).
- `moderator` - set to false to disable all notifications to the site's moderator. Default is false.
- `notify_moderator_upon_receipt` - set to `"none"` to disable notifying the moderator upon receipt of a new email comment. `"all"` will notify the moderator upon every comment submission. `"approval_required"` will notify the moderator only when a comment is waiting for moderation.
- `comment_received_notif_{}"` - new comment notification template (string template)
- `&comment_received_notif_{}"` - new comment notification template (file reference)

## Complete Config

Below are all config keys, commented, with example values filled out. Note that the vast majority of these values have defaults.

<div class="select-all">

```toml
# r3ply configuration - see /docs/config for more
version = "0.0.1"

# each site x r3ply combo has an entry
[[site]]
domain = "example.com"
r3ply = "r3ply.com"
signet = "iSQIIBcF7ka2UURJpFDkYw"
issued = 2025-08-26

# generated by running `re init`
[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "uV9NgkYqTol24KdUo3D4HQ"
issued = 2025-08-27

[comments]
# disable all comments if `false. Default is `true`.
enabled = true
# URL paths to enable comments on (micromatch patterns), e.g. `["/**", "!/private"]` means _"allow comments at all paths except `/private`"_. Default is `['/**']`
paths = ["/**", "!/private"]
# enable comment caching on r3ply serve. Default is `true`
cache = true
# convert markdown to HTML? Default is `true`
md_to_html = true
# sanitize HTML output? Default is `true`
sanitize_html = true
# allowed HTML tags (requires `sanitize_html`). See below.
allow_tags = ["p", "a"]

[comments.email]
# disable email comments if false. Default is `true`
enabled = true
# subject line handling (for now only `url` is valid). Default is `url`
subject = 'url'
# used to separate comment body from email signature or instructions. Default is `\n`.
comment_separator = '﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍'
# allow email attachments. Default is `false`
attachments = false
# max email size in bytes. Default is 1MB
max_size_bytes = 1_048_576
# email/ID blocklist. For example, `['e8a20d6*', 'mallory@evil.com', '*@spam.com']`. Default is `[]`
block_list = ['e8a20d6*', 'mallory@evil.com', '*@spam.com']
#  path to a file that contains the template for comments. Default is `undefined`
"&comment_{}" = "/comment.template.html"
# specify mime type for comment template. Default is `undefined`
"comment_{}_mime" = "text/markdown"

[comments.email.moderation]
# indicates the type of moderation. Either `github` or `webhook` are supported
type = "github"
# matches from this list will skip moderation. Uses glob patterns
"allow_list" = ["18a793ce3d", "*@spenc.es"]
# gitHub repository, e.g. "https://github.com/asimpletune/spenc.es"
repo = "https://github.com/getzola/zola"
# the base branch. Default is main
"base_branch_{}" = "main"
# the head branch. Default is `comment-{{ comment.ts_rcvd }}-{{ comment.id[:8] }}.md`
"head_branch_{}" = "{{ comment.ts_rcvd }}.md"
# where the comment will be saved.
"file_path_{}" = "content/comments/{{ comment.ts_rcvd }}.md"
# commit message template (template string)
"commit_msg_{}" = "Add comment by {{ author.pseudonym[:8] }}"
# pull request body template (template string)
"&pr_body_{}" = "../pr.template.txt"

## webhook moderation shown here commented out
#[comments.email.moderation]
## indicates the type of moderation. Either `github` or `webhook` are supported
#type = "webhook"
## matches from this list will skip moderation. Uses glob patterns
#"allow_list" = ["18a793ce3d", "*@spenc.es"]
## url of where new comments will be posted
#url = "https://example/coment/new"

[comments.email.notify]
# set to false to disable all notifications to the commenter. Default is false.
commenter = false
# set to false to disable notifying the commenter upon submission of their email comment. Default is false
notify_commenter_upon_submission = false
# comment submission notification template (template string)
# comment submission notification template (reference to a file)
"&comment_submitted_notif_{}" = "./comment.submission.notif.html"
# set to false to disable all notifications to the site's moderator. Default is false.
moderator = false
# set to `"none"` to disable notifying the moderator upon receipt of a new email comment. `"all"` will notify the moderator upon every comment submission. `"approval_required"` will notify the moderator only when a comment is waiting for moderation.
notify_moderator_upon_receipt = "none"
# new comment notification template (file reference)
"&comment_received_notif_{}" = "./comment.received.notif.html"
```

</div>
