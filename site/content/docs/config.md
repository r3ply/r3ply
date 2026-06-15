+++
title = "r3ply docs: Config"
template = "doc.html"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

# Configuration

Configuration is an important topic in r3ply, as it's the primary way most people would interact with the system. **This page will first cover fundamentals of r3ply configuration**, before specifying the configuration options for _site configs_ and _r3ply app configs_.


{% toc() %}
- [Config Fundamentals](#fundamentals)
  - [Versioning of r3ply](#versioning-of-r3ply)
  - [File Types and Locations](#file-types-and-locations)
  - [Config Schemas](#config-schemas)
  - [Variables & Types](#variables-and-types)
- [Site Config](#r3ply-site-config)
  - [`Site`](#site-config-entry)
  - [`Comments`](#comments-configuration)
  - [`Moderation`](#moderation-configuration)
- [System Config](#r3ply-system-config)
{% end %}

{{ fleuron_fish() }}

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

{% info(type="warning") %}
However, while r3ply is in version `0.y.z` semantic versioning _can_ be broken (_although we will try not to do it too much_). This is so we can get to a stable version as quickly as possible.
{% end %}

### Config File Types & Locations { #file-types-and-locations }

r3ply configs can be written as either TOML or JSON files. The r3ply servers will choose the first file that exists at the following locations, with precedence high to low:

```
# Priority from highest to lowest:

<PROJECT_ROOT>/.well-known/r3ply/config.toml
<PROJECT_ROOT>/.well-known/r3ply/config.json
<PROJECT_ROOT>/.well-known/r3ply.config.toml
<PROJECT_ROOT>/.well-known/r3ply.config.json
<PROJECT_ROOT>/r3ply.config.toml
<PROJECT_ROOT>/r3ply.config.json
<PROJECT_ROOT>/r3ply.toml
<PROJECT_ROOT>/r3ply.json
```

`<PROJECT_ROOT>` can, for example, be a domain, or it could also be your project's top-level directory, in the context of using r3ply locally with the CLI.

### Config Schemas { #config-schemas}

r3ply's configs are written as a [JSON Schemas (json-schema.org ↗)](https://json-schema.org/). They can be [browsed here](@/docs/schemas.md).

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

[^toml-support-for-json-schema]: If you're interested in helping to develop better tooling see [contributing](@/project/contributing.md).

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

See the [templating docs](@/docs/templating.md) for more info.

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

Below is an example of the full site config, using every default and with every value set. For convenience there are also separate sections with more discussion for [`site`](#site-config-entry), [`comments`](#comments-configuration), and [`moderation`](#moderation-configuration).

{% scrolling_snippet() %}

<!-- prettier-ignore-start -->
```toml, linenos, name=r3ply site config.toml, hl_lines=1-8
# ALL SITE CONFIG VARIABLES SET + DEFAULTS

{{ schema_comment(version="v0.0.1", schema="config/site", skip=["default", "examples"]) }}

# Should be accessible from a known location
# E.g. `/.well-known/r3ply/config.toml`
# See #file-types-and-locations for more

{{ schema_comment(key="version", version="v0.0.1", schema="config/site", skip=["default", "examples"]) }}
version = "0.0.1"
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/site") }}
enabled = true

{{ schema_comment(version="v0.0.1", schema="config/signet", skip=["examples"]) }}
[[site]]
{{ schema_comment(key="domain" version="v0.0.1", schema="config/signet") }}
domain = "spenc.es"
{{ schema_comment(key="r3ply" version="v0.0.1", schema="config/signet") }}
r3ply = "r3ply.com"
{{ schema_comment(key="signet" version="v0.0.1", schema="config/signet") }}
signet = "wXyyym86v0pKerq41HiSCA"
{{ schema_comment(key="issued" version="v0.0.1", schema="config/signet") }}
issued = 2025-10-24
{{ schema_comment(key="label" version="v0.0.1", schema="config/signet") }}
label = "prod"

# A "staging" example using test domains
[[site]]
domain = "test.spenc.es"
r3ply = "test.r3ply.com"
signet = "mwXjhb543US3KrSkYtHfnQ"
issued = 2025-10-24
label = "staging"

# The CLI also requires its own site entry
[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "cmq0jqG3c2JxKKzDJ6qpXQ"
issued = 2025-10-24
label = "CLI"

{{ schema_comment(version="v0.0.1", schema="config/comments") }}
[comments]
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/comments") }}
enabled = true
{{ schema_comment(key="paths*" version="v0.0.1", schema="config/comments") }}
"paths*" = ["/demo/", "/docs/**/", "/project/**/"]
{{ schema_comment(key="cache" version="v0.0.1", schema="config/comments") }}
cache = false
{{ schema_comment(key="md_to_html" version="v0.0.1", schema="config/comments") }}
md_to_html = true
{{ schema_comment(key="sanitize_html" version="v0.0.1", schema="config/comments") }}
sanitize_html = true
{{ schema_comment(key="allow_tags" version="v0.0.1", schema="config/comments", skip=["default", "examples"]) }}
# Default: (same as what's shown below)
allow_tags = [ "a", "br", "p", "span", "strong", "s", "del", "em", "u", "ul", "ol", "li", "blockquote", "hr", "code", "pre", "table", "tr", "td", "th", "caption", "thead", "tbody", "tfoot", "kbd", "mark", "sub", "small"]
# TODO: remove this. There are better ways to derive this.
"$comment_sources" = [ "email" ]

{{ schema_comment(version="v0.0.1", schema="config/comments/email") }}
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

{{ schema_comment(version="v0.0.1", schema="config/moderation") }}
[moderation]
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/moderation") }}
enabled = true

{{ schema_comment(version="v0.0.1", schema="config/moderation/local") }}
[[moderation.local]]
{{ schema_comment(key="file_path_{}" version="v0.0.1", schema="config/moderation/local") }}
"file_path_{}" = "comment_{{ comment.id[:8] }}.json"
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
enabled = true
{{ schema_comment(key="allow*" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
"allow*" = [ ]

{{ schema_comment(version="v0.0.1", schema="config/moderation/github") }}
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
{{ schema_comment(key="commit_msg_{}" version="v0.0.1", schema="config/moderation/github", skip=["default"]) }}
# Default: (same as what's shown below)
"commit_msg_{}" = """
Comment submitted:
Sender: {{ author.pseudonym }}
Timestamp: {{ comment.ts_rcvd }}
Subject: {{ comment.subject.url }}
Comment: > {{ comment.txt | split(pat="
") | join(sep="> ") }}"""
{{ schema_comment(key="pr_title_{}" version="v0.0.1", schema="config/moderation/github", skip=["default"]) }}
# Default: (same as what's shown below)
"pr_title_{}" = "New comment ({{ comment.id[:8] }}) on {{ comment.subject.url }} by author `{{ author.pseudonym[:7] }}`"
{{ schema_comment(key="pr_body_{}" version="v0.0.1", schema="config/moderation/github", skip=["default"]) }}
# Default: (same as what's shown below)
"pr_body_{}" = ""
{{ schema_comment(key="github_host" version="v0.0.1", schema="config/moderation/github") }}
github_host = "github.com"
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
enabled = true
{{ schema_comment(key="allow*" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
"allow*" = [ ]

{{ schema_comment(version="v0.0.1", schema="config/moderation/webhook") }}
[[moderation.webhook]]
{{ schema_comment(key="url" version="v0.0.1", schema="config/moderation/webhook") }}
url = "https://TODO"
{{ schema_comment(key="method" version="v0.0.1", schema="config/moderation/webhook") }}
method = "POST"
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
enabled = true
{{ schema_comment(key="allow*" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
"allow*" = [ ]
```
<!-- prettier-ignore-end -->

{% end %}

---

### Site { #site-config-entry }

The `site` config key expects an array of objects. Each site entry object is as follows:

{% scrolling_snippet() %}
<!-- prettier-ignore-start -->
```toml
{{ schema_comment(version="v0.0.1", schema="config/signet", skip=["examples"]) }}
[[site]]
{{ schema_comment(key="domain" version="v0.0.1", schema="config/signet") }}
domain = "spenc.es"
{{ schema_comment(key="r3ply" version="v0.0.1", schema="config/signet") }}
r3ply = "r3ply.com"
{{ schema_comment(key="signet" version="v0.0.1", schema="config/signet") }}
signet = "wXyyym86v0pKerq41HiSCA"
{{ schema_comment(key="issued" version="v0.0.1", schema="config/signet") }}
issued = 2025-10-24
{{ schema_comment(key="label" version="v0.0.1", schema="config/signet") }}
label = "prod"
```
<!-- prettier-ignore-end -->
{% end %}

One config file can be used by many sites. This is a fairly common scenario when you want to stage changes. You may have one site deployed at one domain, while having another site deployed to a staging domain for testing.

{% scrolling_snippet() %}
<!-- prettier-ignore-start -->
```toml
[[site]]
# In this example I would be deploying some new changes to a staged domain.
domain = "test.spenc.es"
# I might also be testing changes with a new version of r3ply.
r3ply = "test.r3ply.com"
signet = "mwXjhb543US3KrSkYtHfnQ"
issued = 2025-10-24
# Giving a `site` entry a label allows you to filter them downstream. See the `filter*` config variable.
label = "staging"
```
<!-- prettier-ignore-end -->
{% end %}

Additional filtering can be done further downstream in the r3ply pipeline by using the site entry's `label`. See `filter*` for more details.

---

### Comments { #comments-configuration }

The `comments` key is where the behavior for comments is adjusted. Here are the top-level comment config variables.

{% scrolling_snippet() %}
<!-- prettier-ignore-start -->
```toml
{{ schema_comment(version="v0.0.1", schema="config/comments") }}
[comments]
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/comments") }}
enabled = true
{{ schema_comment(key="paths*" version="v0.0.1", schema="config/comments") }}
"paths*" = ["/demo/", "/docs/**/", "/project/**/"]
{{ schema_comment(key="cache" version="v0.0.1", schema="config/comments") }}
cache = false
{{ schema_comment(key="md_to_html" version="v0.0.1", schema="config/comments") }}
md_to_html = true
{{ schema_comment(key="sanitize_html" version="v0.0.1", schema="config/comments") }}
sanitize_html = true
{{ schema_comment(key="allow_tags" version="v0.0.1", schema="config/comments", skip=["default", "examples"]) }}
# Default: (same as what's shown below)
allow_tags = [ "a", "br", "p", "span", "strong", "s", "del", "em", "u", "ul", "ol", "li", "blockquote", "hr", "code", "pre", "table", "tr", "td", "th", "caption", "thead", "tbody", "tfoot", "kbd", "mark", "sub", "small"]
# TODO: remove this. There are better ways to derive this.
"$comment_sources" = [ "email" ]
```
<!-- prettier-ignore-end -->
{% end %}

{% info(type="warning") %}
It is strongly advised **NOT** to disable `sanitize_html`.
{% end %}

There are also individual _comment sources_ that have their own config key, albeit with `comments.email` currently being the first and only one.

#### Email Comments

{% scrolling_snippet() %}
<!-- prettier-ignore-start -->
```toml
{{ schema_comment(version="v0.0.1", schema="config/comments/email") }}
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
```
<!-- prettier-ignore-end -->
{% end %}

---

### Moderation { #moderation-configuration }

Moderation is what happens to a comment after it has been received and processed according to a site's config. What follows are the top-level moderation config options.

{% scrolling_snippet() %}
<!-- prettier-ignore-start -->
```toml
{{ schema_comment(version="v0.0.1", schema="config/moderation") }}
[moderation]
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/moderation") }}
enabled = true
```
<!-- prettier-ignore-end -->
{% end %}

Additionally, there are individual moderation channels that have their own sub-configs.

#### Local Moderation

{% scrolling_snippet() %}
<!-- prettier-ignore-start -->
```toml
{{ schema_comment(version="v0.0.1", schema="config/moderation/local") }}
[[moderation.local]]
{{ schema_comment(key="file_path_{}" version="v0.0.1", schema="config/moderation/local") }}
"file_path_{}" = "comment_{{ comment.id[:8] }}.json"
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
enabled = true
{{ schema_comment(key="allow*" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
"allow*" = [ ]
```
<!-- prettier-ignore-end -->
{% end %}

#### GitHub Moderation

{% scrolling_snippet() %}
<!-- prettier-ignore-start -->
```toml
{{ schema_comment(version="v0.0.1", schema="config/moderation/github") }}
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
{{ schema_comment(key="commit_msg_{}" version="v0.0.1", schema="config/moderation/github", skip=["default"]) }}
# Default: (same as what's shown below)
"commit_msg_{}" = """Comment submitted:\n
  - Sender: {{ author.pseudonym }}
  - Timestamp: {{ comment.ts_rcvd }}
  - Subject: {{ comment.subject.url }}
\n> {{ comment.txt | split(pat="\r\n") | join(sep="\n> ") }}"""
{{ schema_comment(key="pr_title_{}" version="v0.0.1", schema="config/moderation/github", skip=["default"]) }}
# Default: (same as what's shown below)
"pr_title_{}" = "New comment ({{ comment.id[:8] }}) on {{ comment.subject.url }} by author `{{ author.pseudonym[:7] }}`"
{{ schema_comment(key="pr_body_{}" version="v0.0.1", schema="config/moderation/github", skip=["default"]) }}
# Default: (same as what's shown below)
"pr_body_{}" = ""
{{ schema_comment(key="github_host" version="v0.0.1", schema="config/moderation/github") }}
github_host = "github.com"
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
enabled = true
{{ schema_comment(key="allow*" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
"allow*" = [ ]
```
<!-- prettier-ignore-end -->
{% end %}

#### Webhook Moderation

{% scrolling_snippet() %}
<!-- prettier-ignore-start -->
```toml
{{ schema_comment(version="v0.0.1", schema="config/moderation/webhook") }}
[[moderation.webhook]]
{{ schema_comment(key="url" version="v0.0.1", schema="config/moderation/webhook") }}
url = "https://TODO"
{{ schema_comment(key="method" version="v0.0.1", schema="config/moderation/webhook") }}
method = "POST"
{{ schema_comment(key="enabled" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
enabled = true
{{ schema_comment(key="allow*" version="v0.0.1", schema="config/moderation", def="definitions.options") }}
"allow*" = [ ]
```
<!-- prettier-ignore-end -->
{% end %}

## System Config { #r3ply-system-config }

Below is an example of the full r3ply system config, using every default and with every value set.

{% scrolling_snippet() %}
<!-- prettier-ignore-start -->
```toml
{{ schema_comment(version="v0.0.1", schema="config/r3ply") }}

{{ schema_comment(key="version", version="v0.0.1", schema="config/r3ply") }}
version = "0.0.1"
{{ schema_comment(key="domains", version="v0.0.1", schema="config/r3ply") }}
domains = [ "r3ply.com" ]
{{ schema_comment(key="enabled", version="v0.0.1", schema="config/r3ply") }}
enabled = true
{{ schema_comment(key="sites*", version="v0.0.1", schema="config/r3ply") }}
# Default: undefined
# "sites*" = undefined

{{ schema_comment(key="admin", version="v0.0.1", schema="config/r3ply") }}
[[admin]]
name = "Spence"
email = "hello@spenc.es"

{{ schema_comment(key="email", version="v0.0.1", schema="config/r3ply", skip=["description", "default"]) }}
[email]
{{ schema_comment(key="email.enabled", version="v0.0.1", schema="config/r3ply") }}
enabled = true
{{ schema_comment(key="email.attachments", version="v0.0.1", schema="config/r3ply") }}
attachments = false
{{ schema_comment(key="email.max_size_bytes", version="v0.0.1", schema="config/r3ply") }}
max_size_bytes = 5_242_880
```
<!-- prettier-ignore-end -->
{% end %}

{{ fleuron_fish() }}

{{ next_prev(prev_path="/docs/overview/", prev_text="r3ply Overview", next_path="/docs/templating/", next_text="Templating") }}
