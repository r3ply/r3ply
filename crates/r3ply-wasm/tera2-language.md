+++
template = "doc.html"
title = "r3ply docs: templating language"
+++

# Tera 2 Templating Language

This project uses a version of the tera programming language that is still under development. Much of the language is similar to the original [tera ↗](https://keats.github.io/tera/docs/), while much is improved.

The parts that are different will be documented here in a way that applies to r3ply.

## Assigning Variables

```jinja
{% set a = 1 %}
{% set a = (b + 1) | round %}
{% set a = 'hi' %}
{% set a = [1, true, 'hello'] %}
{% set a = [1, true, [1,2]] %}
{% set_global a = 1 %}
```

`set` now has an open/close tag, which can even apply filters before assignment.

```jinja
{% set body | upper %}
I may not always love you
But long as there are
Stars above you
{% endset %}

Variable assignment can use templating inside of it:

```jinja
{% set name = "bob" %}
{% set greeting %}
Hello, {{ name }}.
{% endset %}
{{ greeting }}
```

Objects (i.e. 'maps') can be created

```jinja
{% set value = {"hello": 0} %}
{% set value = {"hello": data} %}
{% set value = {1: data} %}
{% set value = {true: data} %}
```

## Accessing Variables

### Easy Slicing

Works for arrays and strings

```jinja
{{ example[:2] }}
{{ example[1:2] }}
{{ example[1:2:2] }}
{{ example[::-1] }}
```

### Options Chaining

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

## Control Structures

### Loops

```jinja
{% for v in my_array -%} {{ v }}{%- endfor %}
{% for v in [1, 2,] -%} {{ v }}{%- endfor %}
{% for v in 'hello' -%} {{ v }}{%- endfor %}
{% for v in my_array | sort -%} {{ v }}{% else %}Empty{%- endfor %}
{% for k, v in obj -%} {{ v }}{% else %}Empty{%- endfor %}
{% for v in [1, 2,] -%}{% if loop.index0 == 1 %}{% break %}{% else %}{{v}}{% endif %}{%- endfor %}
```

## Ternary Expressions

```jinja
{{ true if truthy else false }}
```

## Filters

### Filters No Longer Require Parenthesis

```jinja
{{ "Hello" | upper }}
```

### Filters Can Have Open/Close Tags

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

### All Filters Available

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
