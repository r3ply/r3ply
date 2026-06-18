# @r3ply/schema

JSON schemas and their parsers/validators to use with the r3ply commenting system, e.g. with site configuration, etc...

They can be referenced directly to help validate your config in real time:

```json
{
  "$schema": "https://r3ply.com/schemas/v0.0.1/config/site.v0.0.1.json",
  "site": [
    /* ... */
  ]
}
```

```toml
#:schema https://r3ply.com/schemas/v0.0.1/config/site.v0.0.1.json

[[site]]
# ...
```

Or you can import them directly, e.g. `import { R3plySiteConfig } from '@r3ply/schema'`

---

> The r3ply commenting system allows websites to receive comments via email. It works well with static sites as well as dynamic sites. For more information please visit [r3ply.com](https://r3ply.com).

## Build/Test/Run

How to do stuff:

```sh
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

## Config

There are a few naming conventions regarding the config's keys that are useful to know about:

- keys ending in `_{}` indicate a string template, e.g. `comment_{}` means a comment template goes here.
- keys beginning in `&` indicate a reference to another file, e.g. `&comment_{}` means a reference to a file that is a comment template.
- keys ending in `*` indicate that glob patterns (micromatch) are used here, e.g. `filter*` means you can use glob patterns.
- keys beginning in `$` indicate some kind of metadata, e.g. `$comment_sources` is describing the structure its a part, specifically what parts of it are comment sources.
