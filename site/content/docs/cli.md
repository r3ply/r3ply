+++
title = "`re` - the r3ply CLI"
template = "doc.html"
+++

# `re` - the r3ply CLI

The r3ply CLI tool `re` is useful for developing your site to integrate comments, and to test/debug changes, such as edits to your r3ply config.

{% toc() %}
## Table of Contents

- [Installation](#install)
- [Initializing a reply Project](#init)
- [The `generate` cmd](#generate)
  - [Generating a Config](#generate-config)
  - [Generating `mailto` Links](#generate-mailto)
  - [Generating Signets ](#generate-signet)
  - [Generating Emails](#generate-email)
{% end %}

{{ fleuron_fish() }}

## Installation { #install }

```bash
# for global install, use with just `re`
npm install -g @r3ply/cli
re --help
```

Keep in mind the need to maintain compatibility between your `re` version and your project's r3ply config. See [config](@/docs/config.md#versioning-of-r3ply) for more about config versioning.

If you plan on scripting your use of r3ply then it's recommended to include it as a part of your project's dependencies:

```bash
# for per-project setups, use with `npx re`
npm install -D @r3ply/cli
npx re --help
```

When installed like this r3ply can only be used with `npx re` and the specific version will be fixed.

## Initializing a r3ply Project { #init }

```bash,name=re init usage statement
# re init --help

Usage: re init [options]

initialize a new r3ply project (at current directory)

Options:
  --date <YYYY-MM-DD>  set date of CLI issued signet (default: "2025-11-03")
  --force              overwrite an existing r3ply project (default: false)
  --rotate-keys        regenerate anonymization and encryption keys (default: false)
  -h, --help           display help for command
```

`re` needs to know what is the top-level of your project in order to do the rest of its job. To do this run `re init` at the root of your project.

You should see something similar (but not exactly the same) as the following output:

```md
Initialized empty r3ply project at /Users/spence/Desktop/deleteme

Add the following site entry to your config:

[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "voyLvBfeRJ5W5ELcoJtf7A"
issued = "2025-11-03"
label = "CLI"

Help: You can generate a config one with `re generate config` if you don't already have one.
```

## The `generate` Cmd { #generate }

```bash,name=re generate usage statement
# re generate --help

Usage: re generate [options] [command]

generate useful text

Options:
  -h, --help               display help for command

Commands:
  config [options]         generate a config
  mailto [options] [body]  generate a one-off `mailto:` link
  signet [options]         get a signet issued
  email [options] [input]  generate a comment as an email, based on your config
  help [command]           display help for command
```

### Generating a Config { #generate-config }

```bash,name=re generate config usage statement
# re generate config --help

Usage: re generate config [options]

generate a config

Options:
  --site <domain>                          site domain the signet is issued to (default: "site.local.test")
  --r3ply <r3ply domain>                   domain of issuing r3ply server (default: "cli.r3ply.test")
  --date <YYYY-MM-DD>                      date signet was issued (default: "2025-11-03")
  --label <string>                         name for this signet, e.g. "production", "test" (default: "CLI")
  --moderation <github | webhook | local>  moderation method (default: "local")
  --full                                   Generate config with defaults set for all values (default: false)
  -h, --help                               display help for command
```

Generate a r3ply config with `re config generate`:

```toml
version = "0.0.1"
enabled = true

[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "voyLvBfeRJ5W5ELcoJtf7A"
issued = "2025-11-03"
label = "CLI"

[moderation]
enabled = true
github = [ ]
webhook = [ ]

  [[moderation.local]]
  "file_path_{}" = "comment_{{ comment.id[:8] }}.json"
  enabled = true
  "allow*" = [ ]
```

You can also generate configuration for your moderation channels by adding `--moderation`.

### Generating `mailto` Links { #generate-mailto }

```bash,name=re generate mailto usage statement
# re generate mailto --help

Usage: re generate mailto [options] [body]

generate a one-off `mailto:` link

Options:
  --to <email>        to header of email (default: [])
  --subject <string>  subject header of email
  --cc <email>        cc header of email (default: [])
  --bcc <email>       bcc header of email (default: [])
  -h, --help          display help for command

```

The r3ply CLI can help you generate mailto links with `re generate mailto`. You can pass it a body argument or pipe in STDIN. For example:

```bash
# Here I pipe in the contents of `hello.txt` and provide a subject and to field.
$ cat hello.txt | re generate mailto --subject "/hello/" --to "example.com@r3ply.com"

# Generates the following output:
mailto:?to=example.com%40r3ply.com&?subject=%2Fhello%2F&?body=Hello%2C%20world!%0D%0A
```

### Generating Signets { #generate-signet }

```bash,name=re generate signet usage statement
# re generate signet --help

Usage: re generate signet [options]

get a signet issued

Options:
  --site <domain>         domain the signet is issued to (default:
                          "site.local.test")
  --r3ply <r3ply domain>  domain of issuing r3ply server (default:
                          "cli.r3ply.test")
  --date <YYYY-MM-DD>     date signet was issued (default: "2025-11-03")
  --label <string>        name for this signet, e.g. "production", "test"
                          (default: "CLI")
  -h, --help              display help for command
```

{% info(type="tip") %}
For more information on _signets_ please see the relevant [overview](@/docs/overview.md) and [site config](@/docs/config.md#r3ply-site-config) docs.
{% end%}

### Generating Emails { #generate-email }

```bash,name=re generate email usage statement
# re generate email --help

Usage: re generate email [options] [input]

generate a comment as an email, based on your config

Arguments:
  input                  Input text (can also accept pipe)

Options:
  --message-id <id>      override Message-ID header
  --date <date>          override Date header
  --from <address>       override From header
  --to <address>         override To header
  --subject <url>        override email subject
  --subject-path <path>  override just path of subject
  --body <text>          override email body
  -h, --help             display help for command
```

You can pipe in body text, but the CLI will also generate text for any fields that are missing.

For example, `re generate email` will produce:

```email
Message-ID: <c00123e2-4bf2-43dc-a07b-2395cc4e0eb6@drinkgrog.io>
From: "Betsy Ravenwood" <Betsy.Ravenwood@drinkgrog.io>
To: <site.local.test@cli.r3ply.test>
Subject: https://site.local.test/secrets/fettucini-brothers-circus
Date: Tue, 17 May 2016 23:49:42 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: 7bit

In addition, this computer has only one working USB port, so I cannot insert devices without disconnecting the keyword. How can I prepare this interview?
```

{% info(type="tip", emoji="🙏🏼") %}
**Help wanted!** The text that was used to train this came from HN comments. They're fine but they're repetitive (and not very funny).

If you'd like to help with this, please [contact us](@/project/contact.md) or see the [contributing docs](@/project/contributing.md) (_We were thinking to train the text on vintage adventure video games._).
{% end %}

## Validating Configs { #config-validate }

Use `re validate config` to validate configs. If nothing is printed then the output is valid. Otherwise you should all problematic keys and some basic info about what's wrong. For example:

```
config failed validation:

[
  {
    "keywordLocation": "#/properties/comments/$ref/properties/md_to_html/type",
    "instanceLocation": "#/comments/md_to_html"
  }
]
```

Here `"keywordLocation": "#/.../md_to_html/type",` is telling you that the `type` for the key `md_to_html` is wrong _(the `type` in this case should be a boolean)_.

## Simulating Comments { #simulate }

`re` can help you simulate a comment with the `simulate` subcommand.

```
re simulate email
```

**The output represents a complete trace of an email through the r3ply system. See [filter/silencing output](#simulate-filter) for more on this.**

### Silencing/Filtering Output { #simulate-filter }

The `--quite` and `--filter` options allow you to respectively silence or isolate certain output. These options work well with arguments that correspond to the various 'stages' of an email's journey through r3ply to become a comment.

- `email` - the initial email itself
- `config` - r3ply fetches the appropriate site and system configs
  - `config=system` - refine the config filter to just the system's config
  - `config=site` - refine the config filter to just the sites's config
- `prescreen` - prescreen checks are performed
- `receive` - the email is received and assigned metadata (an id and timestamp)
- `deliverable` - deliverability of email is checked against the configs
- `prepare` - the email is parsed and becomes a template context
- `comment` - the template context is used and the comment is formed
- `moderate` - the comment along with its moderation arguments are prepared
  - `moderate=request` - refine the `moderate` filter to just the request
  - `moderate=response` - refine the `moderate` filter to just the response
- `notify` - notifications are prepared per the config
  - `notify=commenter` - just notification prepared for the commenter
  - `notify=site` - just the notification prepared for the site maintainer

Using these you can filter output. For example if you wanted to only see the initial email and the resulting comment then you could run:

```txt
# only show output of the `email` and `comment` stages
re simulate email --filter email,comment
```

Alternatively you could silence everything _but_ the `email` and `comment` stages

```txt
# silence only the `email` and `comment` stages
re simulate email --quiet email,comment
```

Three important corner cases are:

- if `--quiet` and `--filter` are used together, `--quiet` will take precedence
- if `--quiet` is used without arguments then all output is silenced
- if `--filter` is used without arguments than all output is allowed

### Writing Output { #write-simulation-output }

You can save the output of a comment simulation by redirecting `STDOUT` to a file. The `--no-heading` option will remove the `=== Example ===` heading above each stage in the comment simulation pipeline. Here's an example of how you would save an email comment as a file:

```bash
re simulate comment --filter email > comment_output.html --no-heading
```
