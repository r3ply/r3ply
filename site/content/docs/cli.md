+++
title = "`re` - the r3ply CLI"
template = "doc.html"
+++

# `re` - the r3ply CLI

The r3ply CLI tool `re` is useful for developing your site to integrate comments and test/debug config changes, among other things.

## Installation { #install }

Install r3ply for a project as follows:

```sh
# for per-project setups, use with `npx re`
npm install -D @r3ply/cli
npx re --help
```

**When installed like this r3ply can only be used with `npx re` but the version information will remain apart of your project's dependencies.**

Optionally you can do a global install:

```sh
# for global install, use with just `re`
npm install -g @r3ply/cli
re --help
```

Although keep in mind to keep compatibility between your `re` version and your project's r3ply config. See [config](/docs/config#versioning-of-r3ply) for more about config versioning.

## Initializing a r3ply Project { #init }

`re` needs to know what is the top-level of your project in order to do the rest of its job. To do this run `re init` at the top-level of your project.

After running this command you should see the following output:

```txt
Initialized empty r3ply project at /Users/spence/Developer/r3ply/site

Add the following site entry to your config:

[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "YBvbKupP12wehwkUNkIPtQ"
issued = 2025-08-28
```

**Note: if you run `re init` with the `--config <path>` option, a config will be generated at `<path>`.**

You should then update your config – if you have one – with this `[[site]]` entry. Otherwise, you can also <!-- TODO -->[generate a standalone config](/).

## Validating Configs { #config-validate }

Use `re validate config` to validate configs. If nothing is printed then the output is valid. Otherwise you should all problematic keys and some basic info about what's wrong. For example:

```txt
config failed validation:

[
  {
    "keywordLocation": "#/properties/comments/$ref/properties/md_to_html/type",
    "instanceLocation": "#/comments/md_to_html"
  }
]
```

Here `"keywordLocation": "#/.../md_to_html/type",` is telling you that the `type` for the key `md_to_html` is wrong _(the `type` in this case should be a boolean)_.

_**(Note: if you're interested in improving the error messaging for the CLI, please <!-- TODO -->[contact me](/))**_

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
