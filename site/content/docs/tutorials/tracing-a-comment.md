+++
template = "doc.html"
title = "r3ply Walkthrough: Tracing a Comment"
draft = true
+++

## Hello, World!

Let's start by simulating a comment via email that says, "Hello, world!".

```bash
re config simulate email --body "Hello, world!"
```

_**Note: if you see an error like the one below, then you didn't add the [CLI's signet](/docs#install-r3ply-cli-tool).**_

````bash
# (...output above elided...)
Error anonymizing comment author. Underlying reason:

```
Envelope mismatch — possible tampered config
```
````

**If the config was valid you should see a large stream of output, then congratulations!**

What's happening here is this wall of text is a trace of our simulated email comment as it moved through r3ply system. Let's examine the important parts to get an understanding of what's happening here.

_**(Note: the output of `simulate email` can be silenced or filtered, e.g. `re simulate email --filter config,process`. See `re simulate email --help` or refer to the <!-- TODO -->[CLI](/docs/cli) docs for more).**_

## Tracing a Comment

To understand the stages that a comment goes through in the r3ply pipeline, let's trace a comment from source to sink.

```bash
re simulate email --body "Hello, world!" --moderate --dry-run
```

If you saw a large stream of output, congratulations.

Each step in the process is begins with text `# === Like This ===`. Let's go through them one by one.

### 1. Initial Email { #initial-email }

The first "stage" we see from our simulated email comment might look something like this:

```email
# === Input Email ===
Message-ID: <84a6d4c8-a3d4-4312-8efe-b19ce5a97cd4@tryscummvm.net>
From: "Esteban Scabb" <Esteban.1914@tryscummvm.net>
To: <site.local.test@cli.r3ply.test>
Subject: https://site.local.test/opinion/worst-ways-to-die-in-monkey-island
Date: Thu, 25 Nov 2021 20:36:00 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: 7bit

Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?
```

This shows you what the original email looked like when it was received by r3ply.

**Note that `re` will generate text automatically.[^automatic-text-generation]**

[^automatic-text-generation]: If you are interested in helping to improve the generated comment text – such as training the dataset on text from vintage point-and-click adventure games – please see [contact](/todo).

### 2. Configs are Gathered { #configs-gathered }

From there, r3ply reads the `To` field of the email and breaks it into two parts:

```
Part 1. Local
      |
/-----------\
 Esteban.1914@tryscummvm.net
              \------------/
                   |
              Part 2: Domain
```

1. Part 1: (the local part) is the domain of the site the comment is intended for.
2. Part 2: (the "domain" part) is the domain of the r3ply server receiving the email.

r3ply will fetch configs at [pre-arranged paths](@/docs/config.md#file-types-and-locations) from both these domains, which is what we see in the "second stage" of our simulated comment output.

For the system config we have:

```toml
# === Comment: System Config ===

# Generated using site config
domains = ["cli.r3ply.test"]
version = "0.0.1"
enabled = true

[[admin]]
name = "Guybrush Threepwood"
email = "guybrush@example.com"

[email]
enabled = true
attachments = false
max_size_bytes = 5_242_880
```

And for the site config we see:

```toml,hide_lines=15-1000
# === Comment: Site Config ===

# From path /Users/spence/Developer/r3ply/site/static/.well-known/r3ply/config.toml
version = "0.0.1"
enabled = true

[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "wWM5hk4DKr1xVRhVq-7aog"
issued = "2025-10-16"
label = "CLI"

[comments]
enabled = true
cache = false
md_to_html = true
sanitize_html = true
allow_tags = [
  "a",
  "br",
  "p",
  "span",
  "strong",
  "s",
  "del",
  "em",
  "u",
  "ul",
  "ol",
  "li",
  "blockquote",
  "hr",
  "code",
  "pre",
  "table",
  "tr",
  "td",
  "th",
  "caption",
  "thead",
  "tbody",
  "tfoot",
  "kbd",
  "mark",
  "sub",
  "small"
]
"$comment_sources" = [ "email" ]

  [comments.email]
  enabled = true
  "filter*" = [ "**" ]
  email_signature_separator = """

"""
  attachments = false
  max_size_bytes = 1_048_576
  "block*" = [ ]
  comment_mime = "text/plain"

[moderation]
enabled = true
github = [ ]
webhook = [ ]

  [[moderation.local]]
  "file_path_{}" = "content/comments/{{ comment.id[:8] }}.json"
  enabled = true
  "allow*" = [ ]
```

The email from [step 1](#initial-email) and these configs from [step 2](#configs-gathered) are what r3ply uses to evaluate whether to allow an email through, and how to process it into something your site can use.

### 3. Checks are Performed { #checks-performed }

Once r3ply has gathered its configs it will begin performing checks on the email per the configs's specifications.

#### Prescreening

The first check is a simple prescreening check. These checks are the ones that happen before even beginning to parse the email, and they're things such as making sure that site is accepting comments, etc...

```toml
# === Comment: Prescreening Results ===

result = "pass"

[r3ply_is_disabled]
result = "pass"
system = false
site = false

[comments_accepted]
result = "pass"
system_for_site = true
site_from_system = true

[comments_configured]
result = "pass"

[email_size_bytes]
result = "pass"
bytes_received = 570
max_bytes_allowed = 1_048_576
```

#### Received and Accepted

Since the email has passed the `Prescreening Results`, it can officially be 'received', which just means it's assigned a `comment_id` and timestamp.

```toml
# === Comment: Comment Received ===

comment_id = "73e5577c4b1541a29055f6d1219443e9"
ts_rcvd = "1761414486"
```

After being 'received' the email is 'accepted', which means the email itself is actually parsed, so further checks can be made.

#### Deliverability

The next and final check is `Deliverability Details`. This is where it's determined if the comment is deliverable.

For example, if the sender was banned and added to the site's `block_list` then it would not be deliverable. There can be many reasons however a comment is not considered deliverable.

```toml
# Note: `From` is redacted
to = "site.local.test@cli.r3ply.test"
subject = "https://site.local.test/opinion/worst-ways-to-die-in-monkey-island"

[site]
to = "site.local.test@cli.r3ply.test"
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "wWM5hk4DKr1xVRhVq-7aog"
issued = "2025-10-16"
label = "CLI"

[from.pseudonym]
value = "3a3b5ccb758c9fa7394aaa00dfd788c6c45998adab82bafcb400cba6017435db"

[from.token]
value = "KQxclPJiNlZY03TxVVqMKFIwSf3qpche8z6Hj3J_h6xGEvotIH4G-0pJHTSBkfD21K28N2T0FRY6n6km8tIWhaTMq_SG9L6Vkta7Q9n3wkMxqpWHrsNWx01YJJ3Wr_IMXg_aVumhf2zCSinktVbn89bZ6Lek1z_P6e7yAANguqYbSonCkE6HLiItXmH1Z2pIOZzBVX57eQlNbd_fFIZTirRhXlQ8e3PZ4sxjzwwFGEqIP8fW6wqBmkuSrFM32y-HtC4zC61RU2eSP2EwNZLBNYJ4l0-SfD65OdCjENGjYQTXSdRT6etcSi7EXbVJs_-Rk1j_QTrSA1MheF5GP-i3HP0NRVsdS6XsLP5I7MF9adiX8yU0qdK4GKJ01T9TN0E1O0Y3RX6rJd25Y50LQaczI5hnXXI4AwlhUt29l9YQrfeBkKkCfhlOdyx0NyMi6-M_zVPUylDsXUW6cFQ8"
```

Once the email has been designated 'deliverable' its sender is anonymized, and sent to be processed into an actual comment.

### 4. Comment Template is Prepared { #template-prepared }

At this point the email is processed into an actual comment. There are two complementary halves necessary to this process:

1. A **template context**
2. _And_ a **comment template**

At a high level the _template context_ provides the ingredients to the _comment template_, which ultimately decides the structure of those ingredients and the comments final form.

As such, the template context is an object that contains all the details of the comment as an object.

```toml
# === Comment: Template Context ===

# These are the values available to your templates

[r3ply]
config_version = "0.0.1"
server = "cli.r3ply.test"
site = "site.local.test"
signet = "wWM5hk4DKr1xVRhVq-7aog"
issued = "2025-10-16"

[author]
pseudonym = "3a3b5ccb758c9fa7394aaa00dfd788c6c45998adab82bafcb400cba6017435db"
token = "KQxclPJiNlZY03TxVVqMKFIwSf3qpche8z6Hj3J_h6xGEvotIH4G-0pJHTSBkfD21K28N2T0FRY6n6km8tIWhaTMq_SG9L6Vkta7Q9n3wkMxqpWHrsNWx01YJJ3Wr_IMXg_aVumhf2zCSinktVbn89bZ6Lek1z_P6e7yAANguqYbSonCkE6HLiItXmH1Z2pIOZzBVX57eQlNbd_fFIZTirRhXlQ8e3PZ4sxjzwwFGEqIP8fW6wqBmkuSrFM32y-HtC4zC61RU2eSP2EwNZLBNYJ4l0-SfD65OdCjENGjYQTXSdRT6etcSi7EXbVJs_-Rk1j_QTrSA1MheF5GP-i3HP0NRVsdS6XsLP5I7MF9adiX8yU0qdK4GKJ01T9TN0E1O0Y3RX6rJd25Y50LQaczI5hnXXI4AwlhUt29l9YQrfeBkKkCfhlOdyx0NyMi6-M_zVPUylDsXUW6cFQ8"

[comment]
id = "73e5577c4b1541a29055f6d1219443e9"
ts_rcvd = "1761414486"
txt = "Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?"
md = """
<p>Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?</p>
"""
html = """
<p>Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?</p>
"""

[comment.subject]
url = "https://site.local.test/opinion/worst-ways-to-die-in-monkey-island"
origin = "https://site.local.test"
protocol = "https:"
hostname = "site.local.test"
path = "/opinion/worst-ways-to-die-in-monkey-island"

[email]
to = "site.local.test@cli.r3ply.test"
subject = "https://site.local.test/opinion/worst-ways-to-die-in-monkey-island"
date = "2021-11-25T20:36:00+00:00"
text = "Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?"

[email.auth]
dkim = false
spf = false
dmarc = false
pass = false

[email.from]
pseudonym = "3a3b5ccb758c9fa7394aaa00dfd788c6c45998adab82bafcb400cba6017435db"
signet = "wWM5hk4DKr1xVRhVq-7aog"
issued = "2025-10-16"
token = "KQxclPJiNlZY03TxVVqMKFIwSf3qpche8z6Hj3J_h6xGEvotIH4G-0pJHTSBkfD21K28N2T0FRY6n6km8tIWhaTMq_SG9L6Vkta7Q9n3wkMxqpWHrsNWx01YJJ3Wr_IMXg_aVumhf2zCSinktVbn89bZ6Lek1z_P6e7yAANguqYbSonCkE6HLiItXmH1Z2pIOZzBVX57eQlNbd_fFIZTirRhXlQ8e3PZ4sxjzwwFGEqIP8fW6wqBmkuSrFM32y-HtC4zC61RU2eSP2EwNZLBNYJ4l0-SfD65OdCjENGjYQTXSdRT6etcSi7EXbVJs_-Rk1j_QTrSA1MheF5GP-i3HP0NRVsdS6XsLP5I7MF9adiX8yU0qdK4GKJ01T9TN0E1O0Y3RX6rJd25Y50LQaczI5hnXXI4AwlhUt29l9YQrfeBkKkCfhlOdyx0NyMi6-M_zVPUylDsXUW6cFQ8"
```

Each of these fields will be made available to the next step, when this _template context_ is bound with the _comment template_.

{% info(type="tip") %}
When designing good comment templates, it is a smart idea to store all the `author` information (i.e. `pseudonym` and `token`). Even better is store the entire comment context, to future-proof your comments.

You can store the entire comment context as a string using `__tera_context`:

```toml
context = "{{ __tera_context }}"
```

{% end %}

### Comment Processed { #comment-processed }

Finally, the comment is processed when it's template is bound to the template context. If there is no template then the default is to write the template context as JSON.

```json
# === Comment: Processed ===

{
  "r3ply": {
    "config_version": "0.0.1",
    "server": "cli.r3ply.test",
    "site": "site.local.test",
    "signet": "wWM5hk4DKr1xVRhVq-7aog",
    "issued": "2025-10-16"
  },
  "author": {
    "pseudonym": "3a3b5ccb758c9fa7394aaa00dfd788c6c45998adab82bafcb400cba6017435db",
    "token": "KQxclPJiNlZY03TxVVqMKFIwSf3qpche8z6Hj3J_h6xGEvotIH4G-0pJHTSBkfD21K28N2T0FRY6n6km8tIWhaTMq_SG9L6Vkta7Q9n3wkMxqpWHrsNWx01YJJ3Wr_IMXg_aVumhf2zCSinktVbn89bZ6Lek1z_P6e7yAANguqYbSonCkE6HLiItXmH1Z2pIOZzBVX57eQlNbd_fFIZTirRhXlQ8e3PZ4sxjzwwFGEqIP8fW6wqBmkuSrFM32y-HtC4zC61RU2eSP2EwNZLBNYJ4l0-SfD65OdCjENGjYQTXSdRT6etcSi7EXbVJs_-Rk1j_QTrSA1MheF5GP-i3HP0NRVsdS6XsLP5I7MF9adiX8yU0qdK4GKJ01T9TN0E1O0Y3RX6rJd25Y50LQaczI5hnXXI4AwlhUt29l9YQrfeBkKkCfhlOdyx0NyMi6-M_zVPUylDsXUW6cFQ8"
  },
  "comment": {
    "id": "73e5577c4b1541a29055f6d1219443e9",
    "ts_rcvd": "1761414486",
    "subject": {
      "url": "https://site.local.test/opinion/worst-ways-to-die-in-monkey-island",
      "origin": "https://site.local.test",
      "protocol": "https:",
      "hostname": "site.local.test",
      "path": "/opinion/worst-ways-to-die-in-monkey-island"
    },
    "txt": "Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?",
    "md": "<p>Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?</p>\n",
    "html": "<p>Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?</p>\n"
  },
  "email": {
    "to": "site.local.test@cli.r3ply.test",
    "subject": "https://site.local.test/opinion/worst-ways-to-die-in-monkey-island",
    "date": "2021-11-25T20:36:00+00:00",
    "text": "Is it possible to run a startup successfully without Investor/funding. Is there any platform where I could contribute to build a project based on ongoing research, like implementing a research paper?",
    "auth": {
      "dkim": false,
      "spf": false,
      "dmarc": false,
      "pass": false
    },
    "from": {
      "pseudonym": "3a3b5ccb758c9fa7394aaa00dfd788c6c45998adab82bafcb400cba6017435db",
      "signet": "wWM5hk4DKr1xVRhVq-7aog",
      "issued": "2025-10-16",
      "token": "KQxclPJiNlZY03TxVVqMKFIwSf3qpche8z6Hj3J_h6xGEvotIH4G-0pJHTSBkfD21K28N2T0FRY6n6km8tIWhaTMq_SG9L6Vkta7Q9n3wkMxqpWHrsNWx01YJJ3Wr_IMXg_aVumhf2zCSinktVbn89bZ6Lek1z_P6e7yAANguqYbSonCkE6HLiItXmH1Z2pIOZzBVX57eQlNbd_fFIZTirRhXlQ8e3PZ4sxjzwwFGEqIP8fW6wqBmkuSrFM32y-HtC4zC61RU2eSP2EwNZLBNYJ4l0-SfD65OdCjENGjYQTXSdRT6etcSi7EXbVJs_-Rk1j_QTrSA1MheF5GP-i3HP0NRVsdS6XsLP5I7MF9adiX8yU0qdK4GKJ01T9TN0E1O0Y3RX6rJd25Y50LQaczI5hnXXI4AwlhUt29l9YQrfeBkKkCfhlOdyx0NyMi6-M_zVPUylDsXUW6cFQ8"
    }
  }
}
```
