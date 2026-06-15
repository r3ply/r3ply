+++
title = "`re` - the r3ply CLI"
template = "doc.html"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

# `re` - the r3ply CLI

The r3ply CLI tool `re` is useful for developing your site to integrate comments, and to test/debug changes, such as edits to your r3ply config.

{% toc() %}
- [Installation](#install)
- [Initializing a reply Project](#init)
- [Working with Configs](#config)
  - [Validating a config](#config-validate)
  - [Setting a Default Config](#config-set-default)
- [The `generate` cmd](#generate)
  - [Generating a Config](#generate-config)
  - [Generating `mailto` Links](#generate-mailto)
  - [Generating Signets ](#generate-signet)
  - [Generating Emails](#generate-email)
- [The `simulate` cmd](#simulate)
  - [Simulating Email Comments](#simulate-email)
  - [Filtering Output](#simulate-filtering-output)
    - [Email Comment Stages](#simulate-email-stages)
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

## Working with Configs { #config }

```bash,name=re config usage statement
# re config --help

Usage: re config [options] [command]

r3ply config commands

Options:
  -h, --help          display help for command

Commands:
  validate            validate your r3ply configuration
  set-default <path>  the default config path r3ply will use
  help [command]      display help for command
```

### Validating Configs { #config-validate }

```bash,name=re config validate usage statement
# re config validate --help

Usage: re config validate [options]

validate your r3ply configuration

Options:
  -h, --help  display help for command
```

If nothing is printed then the output is valid. Otherwise you should all problematic keys and some basic info about what's wrong. For example:

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

### Setting Default Config Path { #config-set-default }

```bash,name=re config set-default usage statement
# re config set-default --help
Usage: re config set-default [options] <path>

the default config path r3ply will use

Options:
  -h, --help  display help for command
```

If there are multiple configs r3ply will need a `--config` option to tell it which to use. With `re config set-default` you can tell it the path of the config you want it to use by default.

## The `generate` command { #generate }

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
  --site <domain>              site domain (default: "site.local.test")
  --r3ply <r3ply domain>       r3ply domain (default: "cli.r3ply.test")
  --date <YYYY-MM-DD>          date signet issued (default: "2025-11-08")
  --label <string>             e.g. "prod", "test" (default: "CLI")
  --comments <comment-source>  options are: email (default: "email")
  --moderation <channel>       See below (default: "local")
  --verbose                    include more defaults explicitly (default: false)
  -h, --help                   display help for command

Moderation <channel> options: <github | webhook | local>
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
  --site <domain>         site domain (default: "site.local.test")
  --r3ply <r3ply domain>  r3ply domain (default: "cli.r3ply.test")
  --date <YYYY-MM-DD>     date issued (default: "2025-11-08")
  --label <string>        e.g. "prod", "test" (default: "CLI")
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

## The `simulate` command { #simulate }

```bash,name=re simulate usage statement
# re simulate --help

Usage: re simulate [options] [command]

simulate receiving a comment using your r3ply config

Options:
  -h, --help               display help for command

Commands:
  email [options] [input]
  help [command]           display help for command
```

### Simulating Email Comments { #simulate-email }

One of `re`'s most useful features is the ability to simulate email comments.

```bash,name=re simulate email usage statement
# re simulate email --help

Usage: re simulate email [options] [input]

Arguments:
  input                    Input text (can also accept pipe)

Options:
  --moderate               Moderate comment (local-only) (default: false)
  --dry-run                Print output only (default: false)
  --message-id <id>        Message-ID header
  --date <date>            Date header (default: "now (UTC)")
  --from <address>         From header
  --to <address>           To header
  --subject <url | path>   Email subject
  --body <text>            Email body
  --no-heading             Hide headings for each stage of simulation
  -q, --quiet [stage...]   silence output at `stages` (or all output if stages is blank).
  -f, --filter [stage...]  filter output at `stages` (or all output if stages is blank).
  -h, --help               display help for command

Filtering/Silencing:
  <stage> = <email | config | prescreen | receive | deliverable | prepare | comment | moderation | notify>
  For substages add `=` after the stage name. Options are config=<site | system>, moderation=<github | webhook | local>
  If a substage is an array you can append an underscore + index to specify which element, e.g. moderation=local_0

Examples:
  $ cat hello.txt | re simulate email --filter comment
  $ re simulate email --subject /demo/ --silence prescreen,receive,deliverable
  $ re simulate email --moderate --dry-run --body "testing" --filter comment,moderation=local_0
```

Add `--moderate` to simulate moderation. Only local moderation will actually take effect on your file system. Use `--dry-run` to use moderation but without any effects taking place.

Additionally, the usual options for emails are available.

### Filtering Output { #simulate-filtering-output }

When simulating comments, it's very useful to filter or silence certain stages. For this purpose you can use `--filter` to opt-in to the stages you want to see, or `--quiet` to opt-out of the stages you want to see.

If no stages are provides then `--filter` and `--quiet` will assume all stages. Multiple stages can be provided.

```bash
re simulate email --filter prepare,comment
```

Additionally, some stages have substages that can be further narrowed down.

```bash
re simulate email --moderate --dry-run --filter config=site,moderation=local
```

If a stage is acted upon as an array, then you can append an underscore to filter a specific element.

```bash
re simulate email --moderate --dry-run --filter moderation=local_1
```

#### Email Comment Stages { #simulate-email-stages }

These are the stages that can be [filtered/silenced](#simulate-filtering-output):

| stage       | substages                 | Is Array? |
|-------------|---------------------------|-----------|
| email       |                           |     ❌    |
| config      | site, system              |     ❌    |
| prescreen   |                           |     ❌    |
| receive     |                           |     ❌    |
| deliverable |                           |     ❌    |
| prepare     |                           |     ❌    |
| comment     |                           |     ❌    |
| moderation  | local, github, moderation |     ✅    |

{{ fleuron_fish() }}

{{ next_prev(prev_path="/docs/templating/", prev_text="Templating", next_path="/docs/schemas/", next_text="r3ply Schemas") }}
