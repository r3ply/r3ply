+++
template = "doc.html"
title = "r3ply schemas"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

# r3ply Schemas

This page is a listing of all the schemas used by r3ply so they can be browsed or referenced by tooling.

{% toc() %}

- [Site Config](#site-config)
  - [Signet Config](#signet-config)
  - [Comments Config](#comments-config)
    - [Email Config](#email-comment-source-config)
  - [Moderation Config](#moderation-config)
    - [GitHub Moderation](#github-moderation-config)
    - [Local Moderation](#local-moderation-config)
    - [Webhook Moderation](#webhook-moderation-config)
  - [Extra Config](#extra-config)
- [System Config](#system-config)


{% end %}

{{ fleuron_fish() }}

## Site Config

[link](/schemas/v0.0.1/config/site.v0.0.1.json)

{% load_ext_snippet(path="/schemas/v0.0.1/config/site.v0.0.1.json", replace="<src/>") %}
```json, name=/schemas/v0.0.1/config/site.v0.0.1.json
<src/>
```
{% end %}

### Signet Config

[link](/schemas/v0.0.1/config/signet.v0.0.1.json)

{% load_ext_snippet(path="/schemas/v0.0.1/config/signet.v0.0.1.json", replace="<src/>") %}
```json, name=/schemas/v0.0.1/config/signet.v0.0.1.json
<src/>
```
{% end %}

### Comments Config

[link](/schemas/v0.0.1/config/comments.v0.0.1.json)

{% load_ext_snippet(path="/schemas/v0.0.1/config/comments.v0.0.1.json", replace="<src/>") %}
```json, name=/schemas/v0.0.1/config/comments.v0.0.1.json
<src/>
```
{% end %}

### Email (comment source) Config

[link](/schemas/v0.0.1/config/comments/email.v0.0.1.json)

{% load_ext_snippet(path="/schemas/v0.0.1/config/comments/email.v0.0.1.json", replace="<src/>") %}
```json, name=/schemas/v0.0.1/config/comments/email.v0.0.1.json
<src/>
```
{% end %}

### Moderation Config

[link](/schemas/v0.0.1/config/moderation.v0.0.1.json)

{% load_ext_snippet(path="/schemas/v0.0.1/config/moderation.v0.0.1.json", replace="<src/>") %}
```json, name=/schemas/v0.0.1/config/moderation.v0.0.1.json
<src/>
```
{% end %}

### Github Moderation Config

[link](/schemas/v0.0.1/config/moderation/github.v0.0.1.json)

{% load_ext_snippet(path="/schemas/v0.0.1/config/moderation/github.v0.0.1.json", replace="<src/>") %}
```json, name=/schemas/v0.0.1/config/moderation/github.v0.0.1.json
<src/>
```
{% end %}

### Local Moderation Config

[link](/schemas/v0.0.1/config/moderation/local.v0.0.1.json)

{% load_ext_snippet(path="/schemas/v0.0.1/config/moderation/local.v0.0.1.json", replace="<src/>") %}
```json, name=/schemas/v0.0.1/config/moderation/local.v0.0.1.json
<src/>
```
{% end %}

#### Webhook Moderation Config

[link](/schemas/v0.0.1/config/moderation/webhook.v0.0.1.json)

{% load_ext_snippet(path="/schemas/v0.0.1/config/moderation/webhook.v0.0.1.json", replace="<src/>") %}
```json, name=/schemas/v0.0.1/config/moderation/webhook.v0.0.1.json
<src/>
```
{% end %}

### Extra Config

[link](/schemas/v0.0.1/config/extra.v0.0.1.json)

{% load_ext_snippet(path="/schemas/v0.0.1/config/extra.v0.0.1.json", replace="<src/>") %}
```json, name=/schemas/v0.0.1/config/extra.v0.0.1.json
<src/>
```
{% end %}

## System Config

[link](/schemas/v0.0.1/config/r3ply.v0.0.1.json)

(I.e. for running a r3ply app)

{% load_ext_snippet(path="/schemas/v0.0.1/config/r3ply.v0.0.1.json", replace="<src/>") %}
```json, name=/schemas/v0.0.1/config/r3ply.v0.0.1.json
<src/>
```
{% end %}

{{ next_prev(prev_path="/docs/cli/", prev_text="r3ply CLI", next_path="/docs/api/", next_text="r3ply APIs") }}