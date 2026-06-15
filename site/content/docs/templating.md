+++
template = "doc.html"
title = "r3ply docs: Templating"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

# Templating

Templating allows you to control how your comment files are structured using an easy text based language. This page discusses the syntax of this templating language, as well as documents the templating context that's available to your templates.

{% toc() %}
- [Templating Language & Syntax](#templating-language-syntax)
  - [Basics](#language-basics)
    - [Expressions](#expressions)
    - [Comments](#language-comments)
    - [Statements](#statements)
    - [Literals](#literals)
  - [Assigning Variables](#assigning-variables)
    - [Assignment with Open/Close Tags](#assignment-with-open-close-tags)
    - [Assigning Objects](#assigning-objects)
  - [Accessing Variables](#accessing-variables)
    - [Slicing](#slicing)
    - [Options Chaining](#options-chaining)
  - [Control Structures](#control-structures)
    - [Loops](#loops)
    - [Ternary Expressions](#ternary-expressions)
  - [Filters](#filters)
- [Template Context](#template-context)
  - [Base Context](#base-comment-template-context)
  - [Email Comment Context](#email-comment-template-context)
  - [Examples](#example-template-contexts)
    - [JSON](#json-example)
    - [TOML](#toml-example)
{% end %}

{{ fleuron_fish() }}

## Templating Language & Syntax { #templating-language-syntax }

This project uses a version of the tera programming language that is still under development. Much of the language is similar to the original [tera ↗](https://keats.github.io/tera/docs/), while much is improved.

### Basics { #language-basics }

#### Expressions

Double curly braces (e.g. `{{ }}`) contain _expressions_. This means there's output, which is written to the screen.

```jinja
Greetings, {{ name }}!
```

#### Comments { #language-comments }

Comments are in single braces + a hash sign (e.g. `{# #}`). Everything within them is ignored by the templating engine. They do take up whitespace though.

#### Statements

Statements are within single curly braces that have percent signs (e.g. `{% %}`). A statement has an effect but it's not written to the screen. A statement can be on one line or it can have an an open and closing tag and a body.

```jinja
{# Example of a single line statement #}
{% set name = "bob" %}

{# Example of a statement with a "body" #}
{% set greeting %}
Greetings, {{ name }}!
{% endset %}
```

#### Whitespace Control

You can use minus signs in combination with either an [expression](#expressions), [comment](#language-comments), or [statement](#statements) to remove white space.

```jinja
# e.g. Hello,bob !
Hello, {{- name }} !

# e.g. Hello, bob!
Hello, {{ name -}} !

# e.g. Hello,bob!
Hello, {{- name -}} !
```

Minus on the left removes whitespace before, and whitespace on the right removes whitespace safter.

### Literals

You can have booleans, strings, integers, floats, arrays, or objects.

```jinja
# Booleans
{{ true }}
# Strings
{{ "Happy" }}{{ ' birthday' }}{{ ` to you` }}
# Integers
{{ 42 }}
# Floats
{{ 3.14 }}
# Arrays
[1, "abc", 3.14, false]
# Objects
{{ { "name": "bob" } }}
```

### Assigning Variables

```jinja
{% set a = 1 %}
{% set a = (b + 1) | round %}
{% set a = 'hi' %}
{% set a = [1, true, 'hello'] %}
{% set a = [1, true, [1,2]] %}
{% set_global a = 1 %}
```

#### Assignment with Open/Close Tags

`set` now has an open/close tag, which can even apply filters before assignment.

```jinja
{% set body | upper %}
I may not always love you
But long as there are
Stars above you
{% endset %}
```

Variable assignment can use templating inside of it:

```jinja
{% set name = "bob" %}
{% set greeting %}
Hello, {{ name }}.
{% endset %}
{{ greeting }}
```

#### Assigning Objects

Objects (i.e. 'maps') can be created

```jinja
{% set value = {"hello": 0} %}
{% set value = {"hello": data} %}
{% set value = {1: data} %}
{% set value = {true: data} %}
```

### Accessing Variables

#### Slicing

Works for arrays and strings

```jinja
{{ example[:2] }}
{{ example[1:2] }}
{{ example[1:2:2] }}
{{ example[::-1] }}
```

#### Options Chaining

An option chain is when you add a `?` before a `.` when accessing a field of an object. It is identical to the usual `.` operator, but if any part in that chain is undefined then the whole chain evaluates to undefined rather than throwing an error.

For example:

```jinja
{{ a?.b?.c or 'def' }}
```

Will print 'def' unless `a` and `b` and `c` were defined.

Similarly, you can option chain with brackets like this:

```jinja
{{ a?['b']?['c'] or 'def' }}
```

### Control Structures

#### If/Elif/Else { #conditionals }

```jinja
{% if age %}age{% else %}no age{% endif %}
{% if age - 18 %}age{% else %}no age{% endif %}
{% if name == "john" %}John{% elif name == "Bob" %}Bob{% endif %}
{% if age and name %}everything{% endif %}
{% if age == 0 %}A{% elif age == 1 %}B{% else %}Oops{% endif %}
{% if (age == 18) or (name == "bob") %}Parenthesis{% endif %}
```

#### Loops

```jinja
{% for v in my_array -%} {{ v }}{%- endfor %}
{% for v in [1, 2,] -%} {{ v }}{%- endfor %}
{% for v in 'hello' -%} {{ v }}{%- endfor %}
{% for v in my_array | sort -%} {{ v }}{% else %}Empty{%- endfor %}
{% for k, v in obj -%} {{ v }}{% else %}Empty{%- endfor %}
{% for v in [1, 2,] -%}{% if loop.index0 == 1 %}{% break %}{% else %}{{v}}{% endif %}{%- endfor %}
```

#### Ternary Expressions

```jinja
{{ true if truthy else false }}
```

### Filters

Filters allow you to combine some input with a pipe operator `|` to pass that input to a function.

```jinja
# e.g. "2025-10-31"
{{ comment.ts_rcvd | int | date }}
```

#### Filters No Longer Require Parenthesis

```jinja
{{ "Hello" | upper }}
```

#### Filters Can Have Open/Close Tags

```jinja
{% filter upper -%}
I may not always love you
But long as there are
Stars above you
{%- endfilter %}
```

Output:

```
I MAY NOT ALWAYS LOVE YOU
BUT LONG AS THERE ARE
STARS ABOVE YOU
```

#### List of All Filters

```jinja
{{ example | safe }}
{{ example | default(value="bob") }}
{{ example | upper }}
{{ example | lower }}
{{ example | trim }}
{{ example | trim(pat="abc") }}
{{ example | trim_start }}
{{ example | trim_start(pat="abc") }}
{{ example | trim_end }}
{{ example | trim_end(pat="abc") }}
{{ example | replace(from="Hello, world", to="Hello, mars") }}
{{ example | capitalize }}
{{ example | title }}
{{ example | truncate(length=5) }}
{# default for `end` is "..." #}
{{ example | truncate(length=5, end="foo") }}
{{ example | indent }}
{# default for `width` is 4, `first` and `blank` are false #}
{{ example | indent(width=2, first=true, blank=true) }}
{{ example | str }}
{{ example | int }}
{# default is base 10 #}
{{ example | int(base=2) }}
{{ example | float }}
{{ example | length }}
{{ example | reverse }}
{{ example | split(pat="/") }}
{{ example | abs }}
{{ example | round }}
{{ example | first }}
{{ example | last }}
{{ example | nth(n=0) }}
{{ example | join }}
{# default is `""` #}
{{ example | join(sep=",") }}
{{ example | slice }}
{# default for `start` is `0` and `end` is the length #}
{{ example | slice(start=1, end=4) }}
{{ example | unique }}
{{ example | get(key="name") }}
{{ example | map(attribute="name") }}
{{ example | filter(attribute="age") }}
{# default for `value` is `null` #}
{{ example | filter(attribute="age", value=21) }}
{{ example | group_by(attribute="month") }}
{{ example | json_encode }}
{{ example | date(format="%D") }}
```

See [chrono docs ↗](https://docs.rs/chrono/0.4.39/chrono/format/strftime/index.html) for info on formatting dates

## Template Context { #template-context }

The _template context_ is what variables are available to your templates.

### Base Comment Template Context

There's a base template context ([src](/packages/lib/src/comments/process.ts)) that is available to any comment, when templates are being processed ([docs](@/docs/overview.md#the-email-comment-pipeline)). It's TypeScript interface looks as follows:

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

### Email Comment Template Context

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

### Examples { #example-template-contexts }

Below are examples of the contexts.

#### JSON Example

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

#### TOML Example

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

{{ fleuron_fish() }}

{{ next_prev(prev_path="/docs/config/", prev_text="r3ply config", next_path="/docs/cli/", next_text="The CLI") }}