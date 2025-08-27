+++
title = "r3ply Config"
template = "doc.html"
+++

# Configuration

Configuration is a big topic, so we'll cover the broad ideas that always apply first, before shifting gears to the the in's and out's of the various config values themselves.

## Basics

Your website's configuration is how you will control most of r3ply's behavior. Here are some details that will help you understand the high level.

### TOML/JSON Files at Well Known Locations { #toml-or-json }

r3ply configs can be written in either TOML or JSON. The r3ply servers will choose the first file that exists at the following locations, with precedence high to low:

```txt
1. https://<DOMAIN>/.well-known/r3ply/config.toml
2. https://<DOMAIN>/.well-known/r3ply/config.json
3. https://<DOMAIN>/.well-known/r3ply.config.toml
4. https://<DOMAIN>/.well-known/r3ply.config.json
5. https://<DOMAIN>/r3ply.config.toml
6. https://<DOMAIN>/r3ply.config.json
7. https://<DOMAIN>/r3ply.toml
8. https://<DOMAIN>/r3ply.json
```

### JSON Schema

The config code itself is written as a [JSON Schema](https://json-schema.org/). One of the benefits of this is you can put a 'schema directive' in your configuration, which will enable editor support, like validation, hints/examples, and auto-complete.

Here's how you do it in JSON:

```JSON
{
  "$schema": "http://r3ply.com/schema/v0.0.x/site.config.json",
  "version": "0.0.1",
  "site": [{
    "domain": "spenc.es",
    "r3ply": "r3ply.com",
    "signet": "qhQ6YSUvQNLb1lCdw3kDR",
    "issued": "2025-08-22"
  }]
  /* ... continued ... */
```

And now VSCode will provide detailed editor support.

![Screenshot showing vscode catching a very subtle typo in a config](/json-schema-editor-support.png)

Additionally the same can be done in TOML, although the tooling is not as robust in this department yet, by adding a `#:schema <URL_TO_SCHEMA>` comment at the top.

```toml
#:schema http://localhost:1111/schema/v0.0.x/site.config.json

# r3ply configuration - see /docs for more
version = "0.0.1"

# each site x r3ply combo has an entry
[[site]]
domain = "example.com"
r3ply = "r3ply.com"
signet = "iSQIIBcF7ka2UURJpFDkYw"
issued = 2025-08-26
```

Note: if you're interested in developing better tooling for this please <!-- TODO -->[contact me](/)

### Template Strings vs Files

## Comments

### Templates

### Moderation

### Notifications
