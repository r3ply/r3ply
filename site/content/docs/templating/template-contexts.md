+++
template = "doc.html"
title = "r3ply docs: Template Contexts"
+++

# Template Context

The _template context_ is what variables are available to your templates.

## Table of Contents { .text-right .border-b .border-dashed }

- [Base Context](#base-comment-template-context)
- [Email Comment Context](#email-comment-template-context)
- [Examples](#examples)
  - [JSON](#json-example)
  - [TOML](#toml-example)

<div class="mt-8 -mb-4 p-0 text-lg flex justify-center gap-3 dark:text-amber-200">{{ fleuron_fish() }}</div>

## Base Comment Template Context

There's a base template context ([src](/packages/lib/src/comments/process.ts)) that is available to any comment, when templates are being processed ([docs](/todo)). It's TypeScript interface looks as follows:

```ts, name=Base Comment Template Context
/**
 * The basic context that can always be expected to be available when rendering a template.
 */
export interface CommentTemplateContext {
  r3ply: {
    config_version: string
    server: string
    site: string
    signet: string
    issued: string
  }
  author: {
    pseudonym: string
    token: string
  }
  comment: {
    id: string
    ts_rcvd: string
    subject: {
      url: string
      origin: string
      protocol: string
      hostname: string
      path: string
      queryParams?: string
      fragment?: string
    }
    txt: string
    md?: string
    html?: string
  }
}
```

## Email Comment Template Context

For _email comments_ specifically, there's additional context:

```ts
/**
 * This adds context for comments received via email
 */
export interface EmailTemplateContext {
  email: {
    to: string
    subject: string
    date: string
    text: string
    auth: {
      dkim: boolean
      spf: boolean
      dmarc: boolean
      pass: boolean
    }
    from: {
      pseudonym: string
      signet: string
      issued: string
      token: string
    }
  }
}
```

## Examples

Below are examples of the contexts.

### JSON Example

`re simulate email --filter prepare --format json`

```json, name=Email Comment Context (JSON)
{
  "r3ply": {
    "config_version": "0.0.1",
    "server": "cli.r3ply.test",
    "site": "site.local.test",
    "signet": "wWM5hk4DKr1xVRhVq-7aog",
    "issued": "2025-10-16"
  },
  "author": {
    "pseudonym": "020d1e70d6991cae5046b87f23148a37619e522a67f70d177db2a032f9942ecf",
    "token": "dsrsxBx-PCT7apDF08C6SM22_vdqXmw_O8Ogzm74PjU4S8JLCGQsPsrbUK4jJ88eShfXj9ELpZGfJTXEdFdmfNAmp6l6WQCmJ7nPrt1tX5ELf2tt_iXJD4jjC_h29Nht5pBPgqCCykfp6n2Vt90wboFQyV7ypnKvvidLbUWltsAZ3H1XezKKhTsXW_jFd96PCPdCtIbjTnn3wLEn5_A-WW4XEhL9GqPwICEhUPS5U2fGJ71IUBsiGE9hiq89Y4lOWmSmtBwAxO7UYBi6G8uY5vteZ8w1ZY8cnHJfZxCdcL4_z0bWmIJ03-C-KQeQymMmrTyR_wGH2XGq0GgH623xUJb5Vb-Gga6LuuPRlOxO6ie60jUISdHoF6GyJ4F98Qr2hXh2ezhjkiYUNgIJKzbJffsxXK9TputMRLBGzkzqI7zMKcKR5FvfKxFPxddcf_OCaQYMow-n2-a486tX"
  },
  "comment": {
    "id": "11cdc5ac23da4937843c6688b356384c",
    "ts_rcvd": "1761740948",
    "subject": {
      "url": "https://site.local.test/history/top-5-worst-ways-to-lose-in-monkey-island",
      "origin": "https://site.local.test",
      "protocol": "https:",
      "hostname": "site.local.test",
      "path": "/history/top-5-worst-ways-to-lose-in-monkey-island"
    },
    "txt": "I was spending time debating which to use. There are pros and cons for each in my domain. It seems more powerful to combine them then, and for that matter any other languages that have immediate use. Basically I want a F #that is Clojure and Haskell. What are your favorite and most visited sites/forums?",
    "md": "<p>I was spending time debating which to use. There are pros and cons for each in my domain. It seems more powerful to combine them then, and for that matter any other languages that have immediate use. Basically I want a F #that is Clojure and Haskell. What are your favorite and most visited sites/forums?</p>\n",
    "html": "<p>I was spending time debating which to use. There are pros and cons for each in my domain. It seems more powerful to combine them then, and for that matter any other languages that have immediate use. Basically I want a F #that is Clojure and Haskell. What are your favorite and most visited sites/forums?</p>\n"
  },
  "email": {
    "to": "site.local.test@cli.r3ply.test",
    "subject": "https://site.local.test/history/top-5-worst-ways-to-lose-in-monkey-island",
    "date": "2019-05-02T11:58:12+00:00",
    "text": "I was spending time debating which to use. There are pros and cons for each in my domain. It seems more powerful to combine them then, and for that matter any other languages that have immediate use. Basically I want a F #that is Clojure and Haskell. What are your favorite and most visited sites/forums?",
    "auth": {
      "dkim": false,
      "spf": false,
      "dmarc": false,
      "pass": false
    },
    "from": {
      "pseudonym": "020d1e70d6991cae5046b87f23148a37619e522a67f70d177db2a032f9942ecf",
      "signet": "wWM5hk4DKr1xVRhVq-7aog",
      "issued": "2025-10-16",
      "token": "dsrsxBx-PCT7apDF08C6SM22_vdqXmw_O8Ogzm74PjU4S8JLCGQsPsrbUK4jJ88eShfXj9ELpZGfJTXEdFdmfNAmp6l6WQCmJ7nPrt1tX5ELf2tt_iXJD4jjC_h29Nht5pBPgqCCykfp6n2Vt90wboFQyV7ypnKvvidLbUWltsAZ3H1XezKKhTsXW_jFd96PCPdCtIbjTnn3wLEn5_A-WW4XEhL9GqPwICEhUPS5U2fGJ71IUBsiGE9hiq89Y4lOWmSmtBwAxO7UYBi6G8uY5vteZ8w1ZY8cnHJfZxCdcL4_z0bWmIJ03-C-KQeQymMmrTyR_wGH2XGq0GgH623xUJb5Vb-Gga6LuuPRlOxO6ie60jUISdHoF6GyJ4F98Qr2hXh2ezhjkiYUNgIJKzbJffsxXK9TputMRLBGzkzqI7zMKcKR5FvfKxFPxddcf_OCaQYMow-n2-a486tX"
    }
  }
}
```

### TOML Example

`re simulate email --filter prepare --format toml`

```toml, name=Email Template Context (TOML)
[r3ply]
config_version = "0.0.1"
server = "cli.r3ply.test"
site = "site.local.test"
signet = "wWM5hk4DKr1xVRhVq-7aog"
issued = "2025-10-16"

[author]
pseudonym = "020d1e70d6991cae5046b87f23148a37619e522a67f70d177db2a032f9942ecf"
token = "dsrsxBx-PCT7apDF08C6SM22_vdqXmw_O8Ogzm74PjU4S8JLCGQsPsrbUK4jJ88eShfXj9ELpZGfJTXEdFdmfNAmp6l6WQCmJ7nPrt1tX5ELf2tt_iXJD4jjC_h29Nht5pBPgqCCykfp6n2Vt90wboFQyV7ypnKvvidLbUWltsAZ3H1XezKKhTsXW_jFd96PCPdCtIbjTnn3wLEn5_A-WW4XEhL9GqPwICEhUPS5U2fGJ71IUBsiGE9hiq89Y4lOWmSmtBwAxO7UYBi6G8uY5vteZ8w1ZY8cnHJfZxCdcL4_z0bWmIJ03-C-KQeQymMmrTyR_wGH2XGq0GgH623xUJb5Vb-Gga6LuuPRlOxO6ie60jUISdHoF6GyJ4F98Qr2hXh2ezhjkiYUNgIJKzbJffsxXK9TputMRLBGzkzqI7zMKcKR5FvfKxFPxddcf_OCaQYMow-n2-a486tX"

[comment]
id = "11cdc5ac23da4937843c6688b356384c"
ts_rcvd = "1761740948"
txt = "I was spending time debating which to use. There are pros and cons for each in my domain. It seems more powerful to combine them then, and for that matter any other languages that have immediate use. Basically I want a F #that is Clojure and Haskell. What are your favorite and most visited sites/forums?"
md = """
<p>I was spending time debating which to use. There are pros and cons for each in my domain. It seems more powerful to combine them then, and for that matter any other languages that have immediate use. Basically I want a F #that is Clojure and Haskell. What are your favorite and most visited sites/forums?</p>
"""
html = """
<p>I was spending time debating which to use. There are pros and cons for each in my domain. It seems more powerful to combine them then, and for that matter any other languages that have immediate use. Basically I want a F #that is Clojure and Haskell. What are your favorite and most visited sites/forums?</p>
"""

  [comment.subject]
  url = "https://site.local.test/history/top-5-worst-ways-to-lose-in-monkey-island"
  origin = "https://site.local.test"
  protocol = "https:"
  hostname = "site.local.test"
  path = "/history/top-5-worst-ways-to-lose-in-monkey-island"

[email]
to = "site.local.test@cli.r3ply.test"
subject = "https://site.local.test/history/top-5-worst-ways-to-lose-in-monkey-island"
date = "2019-05-02T11:58:12+00:00"
text = "I was spending time debating which to use. There are pros and cons for each in my domain. It seems more powerful to combine them then, and for that matter any other languages that have immediate use. Basically I want a F #that is Clojure and Haskell. What are your favorite and most visited sites/forums?"

  [email.auth]
  dkim = false
  spf = false
  dmarc = false
  pass = false

  [email.from]
  pseudonym = "020d1e70d6991cae5046b87f23148a37619e522a67f70d177db2a032f9942ecf"
  signet = "wWM5hk4DKr1xVRhVq-7aog"
  issued = "2025-10-16"
  token = "dsrsxBx-PCT7apDF08C6SM22_vdqXmw_O8Ogzm74PjU4S8JLCGQsPsrbUK4jJ88eShfXj9ELpZGfJTXEdFdmfNAmp6l6WQCmJ7nPrt1tX5ELf2tt_iXJD4jjC_h29Nht5pBPgqCCykfp6n2Vt90wboFQyV7ypnKvvidLbUWltsAZ3H1XezKKhTsXW_jFd96PCPdCtIbjTnn3wLEn5_A-WW4XEhL9GqPwICEhUPS5U2fGJ71IUBsiGE9hiq89Y4lOWmSmtBwAxO7UYBi6G8uY5vteZ8w1ZY8cnHJfZxCdcL4_z0bWmIJ03-C-KQeQymMmrTyR_wGH2XGq0GgH623xUJb5Vb-Gga6LuuPRlOxO6ie60jUISdHoF6GyJ4F98Qr2hXh2ezhjkiYUNgIJKzbJffsxXK9TputMRLBGzkzqI7zMKcKR5FvfKxFPxddcf_OCaQYMow-n2-a486tX"
```
