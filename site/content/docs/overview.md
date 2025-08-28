+++
title = "Overview"
template = "doc.html"
+++

# Overview

From the [last section](/docs), you should have `re` installed, and a valid [minimal config](/docs#putting-it-all-together). Now we can use `re` to simulate receiving comments. This will give us an overview of how r3ply works, and it will help you in the future fine tune your config.

What's important to know about using `re` is that it uses your actual configuration and then acts as a local, terminal-based implementation of r3ply. This let's us trace an email comment at each stage along the way and fix otherwise silent and frustrating errors.

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

Each step in the process is begins with text `=== Like This ===` and it constitutes a stage in the process.

### 1. Initial Email { #initial-email }

The first "stage" we see from our simulated email comment might look something like this:

```yaml
=== Input Email ===

Message-ID: <43d971ed-fc09-4ab9-a1b4-c7cb4a80d340@tryscummvm.com>
From: "Kazim Weatherby" <Kazim.1938@tryscummvm.com>
To: <site.local.test@cli.r3ply.test>
Subject: https://site.local.test/lore/fettucini-brothers-circus
Date: Wed, 23 May 2018 00:43:19 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: 7bit

If you run a SAAS and you have a small team or even 1 man bootstrapped, how do you get started?
```

This shows you what the original email looked like when it was received by r3ply.

**Note that `re` will generate text automatically.**

_(Also: If you are interested in helping train the dataset on text from point-and-click adventure games please <!-- TODO -->[contact](/) me)_

### 2. Configs are Gathered { #configs-gathered }

From there, r3ply reads the `To` field of the email and breaks it into two parts:

```
Part 1. Local
     |
/---------\
 Kazim.1938@tryscummvm.com
            \------------/
                   |
            Part 2: Domain
```

1. Part 1: (the local part) is the domain of the site the comment is intended for.
2. Part 2: (the "domain" part) is the domain of the r3ply server receiving the email.

r3ply will fetch configs at <!-- TODO -->[pre-arranged paths](/) from both these domains, which is what we see in the "second stage" of our simulated comment output.

```toml
# === System Config ===

# Generated using site config
version = "0.0.1"
domains = ["r3ply.com", "cli.r3ply.test"]

[[admin]]
name = "Guybrush Threepwood"
email = "guybrush@example.com"
```

```toml
# === Site Config ===

# From path /Users/spence/Developer/spenc.es/static/.well-known/r3ply/test-config.toml
version = "0.0.1"
enabled = true

[[site]]
domain = "example.com"
r3ply = "r3ply.com"
signet = "iSQIIBcF7ka2UURJpFDkYw"
issued = "2025-08-26"

[[site]]
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "aT57Rm7B_3YGqNbRgaI5gw"
issued = "2025-08-27"

# (... text elided ...)
```

The email from [step 1](#initial-email) and [these configs](#configs-gathered) are what r3ply uses to evaluate whether to allow an email through, and how to process it into something your site can use.

### 3. Checks are Performed { #checks-performed }

Once r3ply has gathered its configs, then it will begin performing checks on the email per the configs's specifications.

The first check is a simple prescreening check. These checks are the ones that happen before even beginning to parse the email, and they're things such as making sure that site is accepting comments, etc...

```toml
# === Prescreening Results ===

[checks.email_size_bytes]
result = "pass"
bytes_received = 454
max_bytes_allowed = 1_048_576

[checks.r3ply_is_disabled]
result = "pass"
site = false
system = false

[checks.comments_accepted]
result = "pass"
system_for_site = true
site_from_system = true
```

Since the email has passes the `Prescreening Results`, it can officially be 'received', which just means it's assigned a `comment_id` and timestamp.

```toml
# === Comment Received ===

comment_id = "14580fc1fa554b919469cd3cd7ec0104"
ts_rcvd = "1756308757"
```

After being 'received' the email is 'accepted', which means it's parsed for further checks. The next and final check is `Deliverability Details`. This is where it's determined if the comment is even deliverable.

**For example, if the sender was banned and added to the site's `block_list` then it would not be deliverable, but there can be many other reasons.**

```toml
# === Deliverability Details ===

# Note: `From` is redacted
to = "site.local.test@cli.r3ply.test"
subject = "https://site.local.test/lore/fettucini-brothers-circus"

[site]
to = "site.local.test@cli.r3ply.test"
domain = "site.local.test"
r3ply = "cli.r3ply.test"
signet = "aT57Rm7B_3YGqNbRgaI5gw"
issued = "2025-08-27"

[from.pseudonym]
value = "9f3010da99b7ca8758533b702e5b348d989f543887c6d459e382454a0207a8d3"

[from.token]
value = "uXt4lvjooLksfhh0Ri5M-TSEq1NxBFgl5TIxYzcu77f2hX3u6v0m8497TiS7ydg58K5VFoPFs0q4jFfvsyWvAkwyMojsbJ7J53Wan3JyE-rKurSk2HjPM_edBlWFHktFJOwdca3LtcJQTHIkzcb9KtznvPmPInzURjANuAw-yODAf8D1lPAnDz6WwkhvvWAcA3MZUIeqKQeolHSHID7rNvxwRS_SmqYrl0vgHsIeLiyUaEyvrkkcCkfGtPuaQ-APYd9fuopOjTSlRVxgCj9pJqzUC7DbbANBA9wtqUoQGL2vDjG_NMRQq-AIM7ysu9H6K89ZzTpx46igh6QmrKB7uro-QpYj_R3JgUebet34KJhcwPzpMzvbnIsM2IdONUauQRu7Pr4IlhxSWVFtsWsX1Pudly1WXEamkha1P1I_AqN771mwYMBfC9pe1Ec28oFJxxBECEKHtdlbTUEH"
```

Once the email has been designated 'deliverable' its sender is anonymized, and sent to be processed into an actual comment.

### 4. Comment Template is Prepared { #template-prepared }

At this point the email is processed into an actual comment. There are two complementary halves necessary to this process:

1. A 'template context' and
2. A 'comment template'

At a high level the 'template context' provides the ingredients to the 'comment template', which ultimately decides the structure of those ingredients and the comments final form.

As such, the template context is an object that contains all the details of the comment as an object. This is what we find in the next stage of our [comment simulation](#overview)'s traced output.

```toml
# === Template Context ===

# These are the values available to your templates
[r3ply]
config_version = "0.0.1"
server = "cli.r3ply.test"
site = "site.local.test"
signet = "uV9NgkYqTol24KdUo3D4HQ"
issued = "2025-08-27"

[author]
pseudonym = "4727089403116442e0f27d5b095428e56a93bbbf5d7c00753dbbed7ba5433ccc"
token = "HzDdpkKXwvlXWuxUJkPNRVEsWdTY4GWa3hPz0OWtUh3dpHVC8bEXxPGFt_ObGYg25GM26bd0qfGpA3lSm5Na0jN1qJII_6_ms8_TiAEU4sbNeF035BLI3AxVmHsWSVrMnjlgEilbu3RrqjPECDnANBy8OdmFUk1KKTtDye0DlbCuagBOWC5AUf887kcRZfEdL4jGxe9gy7EZZ9610cbk3WA0pX2ixUxOrzLYr7snT9p0idnAAMLNQ4HKPlL4BRg4rYYAYNt-AsDKj0fKvjJDmfFuFt_DyyTQwNhoZiP9nMEf16marxi6JD6DhNLQkyuZyHySQWbaEcn_ejVwlEz7Hu85GzgRLHFgsYSmOKGkp-phCTEzuvXzWok-STE3G-uwJM0GGXJfHfq7gNfX77KGwrBZOVrvIoU0KfH3zFxWBMOdTlo1P-NRUTq6eaBclx-4hyMxWojBTfRSSg80"

[comment]
id = "db30d18782d149debd252b2f7ee0e886"
ts_rcvd = "1756311958"
txt = "With all the hype of Node, and other up and coming languages, do you think chess skills translate into good programming skills?"
md = """
<p>With all the hype of Node, and other up and coming languages, do you think chess skills translate into good programming skills?</p>
"""
html = """
<p>With all the hype of Node, and other up and coming languages, do you think chess skills translate into good programming skills?</p>
"""

[comment.subject]
url = "https://site.local.test/lore/marcus-brody-memorial"
origin = "https://site.local.test"
protocol = "https:"
hostname = "site.local.test"
path = "/lore/marcus-brody-memorial"

[email]
to = "site.local.test@cli.r3ply.test"
subject = "https://site.local.test/lore/marcus-brody-memorial"
date = "2022-07-11T15:28:43+00:00"
text = "With all the hype of Node, and other up and coming languages, do you think chess skills translate into good programming skills?"

[email.auth]
dkim = false
spf = false
dmarc = false
pass = false

[email.from]
pseudonym = "4727089403116442e0f27d5b095428e56a93bbbf5d7c00753dbbed7ba5433ccc"
signet = "uV9NgkYqTol24KdUo3D4HQ"
issued = "2025-08-27"
token = "HzDdpkKXwvlXWuxUJkPNRVEsWdTY4GWa3hPz0OWtUh3dpHVC8bEXxPGFt_ObGYg25GM26bd0qfGpA3lSm5Na0jN1qJII_6_ms8_TiAEU4sbNeF035BLI3AxVmHsWSVrMnjlgEilbu3RrqjPECDnANBy8OdmFUk1KKTtDye0DlbCuagBOWC5AUf887kcRZfEdL4jGxe9gy7EZZ9610cbk3WA0pX2ixUxOrzLYr7snT9p0idnAAMLNQ4HKPlL4BRg4rYYAYNt-AsDKj0fKvjJDmfFuFt_DyyTQwNhoZiP9nMEf16marxi6JD6DhNLQkyuZyHySQWbaEcn_ejVwlEz7Hu85GzgRLHFgsYSmOKGkp-phCTEzuvXzWok-STE3G-uwJM0GGXJfHfq7gNfX77KGwrBZOVrvIoU0KfH3zFxWBMOdTlo1P-NRUTq6eaBclx-4hyMxWojBTfRSSg80"
```

Each of these fields will be made available to the next step, when this template context is bound with the comment template.

**Note: when designing good comment templates, at a minimum it is a smart idea to store the `author` information (i.e. `pseudonym` and `token`), in addition to the obvious ones like the `comment` information, etc...**

_**This is useful for future proofing, in the event that you ever need to change your signet. It would allow you to update all your old comments to the new signet in a process called <!-- TODO -->'[signet rotation](/)'.**_

Finally, we're ready to turn our email into a comment. At this stage in the pipeline we see the comment in its final form, before its delivered to us for moderation.

However, our [minimal config](/docs/#putting-it-all-together) doesn't include a comment template! So what happens if the comment template is undefined? The comment template is written directly, as JSON.

Let's take a look and see what that looks like, before seeing how to update out config with a comment template.

```JSON
{
  "r3ply": {
    "config_version": "0.0.1",
    "server": "cli.r3ply.test",
    "site": "site.local.test",
    "signet": "uV9NgkYqTol24KdUo3D4HQ",
    "issued": "2025-08-27"
  },
  "author": {
    "pseudonym": "4727089403116442e0f27d5b095428e56a93bbbf5d7c00753dbbed7ba5433ccc",
    "token": "HzDdpkKXwvlXWuxUJkPNRVEsWdTY4GWa3hPz0OWtUh3dpHVC8bEXxPGFt_ObGYg25GM26bd0qfGpA3lSm5Na0jN1qJII_6_ms8_TiAEU4sbNeF035BLI3AxVmHsWSVrMnjlgEilbu3RrqjPECDnANBy8OdmFUk1KKTtDye0DlbCuagBOWC5AUf887kcRZfEdL4jGxe9gy7EZZ9610cbk3WA0pX2ixUxOrzLYr7snT9p0idnAAMLNQ4HKPlL4BRg4rYYAYNt-AsDKj0fKvjJDmfFuFt_DyyTQwNhoZiP9nMEf16marxi6JD6DhNLQkyuZyHySQWbaEcn_ejVwlEz7Hu85GzgRLHFgsYSmOKGkp-phCTEzuvXzWok-STE3G-uwJM0GGXJfHfq7gNfX77KGwrBZOVrvIoU0KfH3zFxWBMOdTlo1P-NRUTq6eaBclx-4hyMxWojBTfRSSg80"
  },
  "comment": {
    "id": "db30d18782d149debd252b2f7ee0e886",
    "ts_rcvd": "1756311958",
    "subject": {
      "url": "https://site.local.test/lore/marcus-brody-memorial",
      "origin": "https://site.local.test",
      "protocol": "https:",
      "hostname": "site.local.test",
      "path": "/lore/marcus-brody-memorial"
    },
    "txt": "With all the hype of Node, and other up and coming languages, do you think chess skills translate into good programming skills?",
    "md": "<p>With all the hype of Node, and other up and coming languages, do you think chess skills translate into good programming skills?</p>\n",
    "html": "<p>With all the hype of Node, and other up and coming languages, do you think chess skills translate into good programming skills?</p>\n"
  },
  "email": {
    "to": "site.local.test@cli.r3ply.test",
    "subject": "https://site.local.test/lore/marcus-brody-memorial",
    "date": "2022-07-11T15:28:43+00:00",
    "text": "With all the hype of Node, and other up and coming languages, do you think chess skills translate into good programming skills?",
    "auth": {
      "dkim": false,
      "spf": false,
      "dmarc": false,
      "pass": false
    },
    "from": {
      "pseudonym": "4727089403116442e0f27d5b095428e56a93bbbf5d7c00753dbbed7ba5433ccc",
      "signet": "uV9NgkYqTol24KdUo3D4HQ",
      "issued": "2025-08-27",
      "token": "HzDdpkKXwvlXWuxUJkPNRVEsWdTY4GWa3hPz0OWtUh3dpHVC8bEXxPGFt_ObGYg25GM26bd0qfGpA3lSm5Na0jN1qJII_6_ms8_TiAEU4sbNeF035BLI3AxVmHsWSVrMnjlgEilbu3RrqjPECDnANBy8OdmFUk1KKTtDye0DlbCuagBOWC5AUf887kcRZfEdL4jGxe9gy7EZZ9610cbk3WA0pX2ixUxOrzLYr7snT9p0idnAAMLNQ4HKPlL4BRg4rYYAYNt-AsDKj0fKvjJDmfFuFt_DyyTQwNhoZiP9nMEf16marxi6JD6DhNLQkyuZyHySQWbaEcn_ejVwlEz7Hu85GzgRLHFgsYSmOKGkp-phCTEzuvXzWok-STE3G-uwJM0GGXJfHfq7gNfX77KGwrBZOVrvIoU0KfH3zFxWBMOdTlo1P-NRUTq6eaBclx-4hyMxWojBTfRSSg80"
    }
  }
}
```

As you can see, it's identical to the '[template context](#template-prepared)' from earlier, just in JSON form.

For many people this may be fine, but with comment templates we can directly produce the HTML we're going to use.

### Comment Processed { #comment-processed }

Let's actually process the template context into a comment. To do that you need to add a comment template. Edit your config file and add the following key:

```toml
[comments.email]
"comment_{}" = """
<!-- Comment Details:
  version = {{ r3ply.config_version }}
  server = {{ r3ply.server }}
  site = {{ r3ply.site }}
  signet = {{ r3ply.signet }}
  issued = {{ r3ply.issued }}
  author_token: {{ author.token }}
  author_pseudonym: {{ author.pseudonym }}
-->

<div class="comment" id="{{ comment.id[:12] }}">
  <div class="meta">
    <span class="author">{{ author.pseudonym[:8] }}</span> ·
    <time datetime="{{ email.date }}">{{ email.date }}</time>
  </div>
  <div class="content">
    {{ comment.html }}
  </div>
  <div class="subject">
    <a href="{{ comment.subject.url }}">View subject</a>
  </div>
</div>
"""
```

Then if we rerun our command `re simulate email`, we should see the comment printed to the screen in a simple, HTML example.

```html
=== Comment ===

<!-- Comment Details:
  version = 0.0.1
  server = cli.r3ply.test
  site = site.local.test
  signet = uV9NgkYqTol24KdUo3D4HQ
  issued = 2025-08-27
  author_token: lIncWPOp6y5CP2I6F3YO68gtKA9JZt4dxCeWmp3ifC39M-8uLjo5zTsuNEK0N9eZr4A7ztDt_yjohB0ARsGqj3TxMKqqF8ci8LmuaqqbCkMYuO4t7ZnM42Gv-15I4O2WOot0U841bcpCKFHmhexF3DagylJjhYEu1miPCxOM53Wrb--t0KnPPflKskEBE9oYnghJybqYQpxnK0RfAa0fZXDIieHRjJs5B185ZpsxnS1P6znNBzDvkO-DJ_ebAqlHsJ9E9_kOWzzoeeRIRCpDpGqpl3nX2_IfZUgEj3nw6mNYbfmFR-Qlcu7IqZ0T7iO4_NAE38L8Ho_VgIVYjHfNO0l6UL8UarJQr5Yn_LG-7_2A9oJqprxmmK38WuSyU8RGSsEfk3_R_R8lUqK9APfac09eGZjmLI3plZpaJpL0_qqjdisYcCepJfC2r_t0V17eCqh_5pw9dgPSgTH9
  author_pseudonym: 6b7c5271cefc69bd6361e654ab3b015a383460c18a3a0fbb72c2ed1dbab6bef0
-->

<div class="comment" id="8565bb574420">
  <div class="meta">
    <span class="author">6b7c5271</span> ·
    <time datetime="2024-07-26T15:33:05+00:00">2024-07-26T15:33:05+00:00</time>
  </div>
  <div class="content">
    <p>
      I was spending time debating which to use. There are pros and cons for
      each in my domain. It seems more powerful to combine them then, and for
      that matter any other languages that have immediate use. Basically I want
      a F #that is Clojure and Haskell. What are your favorite and most visited
      sites/forums?
    </p>
  </div>
  <div class="subject">
    <a href="https://site.local.test/secrets/best-action-scenes-in-indy-games"
      >View subject</a
    >
  </div>
</div>
```

This look like it's something that could be directly used by a website, but it's made our [minimal config](/docs#putting-it-all-together) a little bit minimal. So now we need to learn how to put comment templates – and other templates – into their own files, and just reference them from without our main config.

In the next section we will learn how to do that, as well as dissect in more detail all the things that configured. However, before we do that let's summarize what we've learned, and how to use it.

## Iterating Like This { #iterating-on-this }

By using the r3ply CLI tool `re`, we've seen how an email makes its way through r3ply, and together with it how the various aspects of your config are used to check it and transform it along that journey journey. By continuing like this you can develop beautiful and ambitious commenting systems, while still being certain that when you make the changes public they'll work.

Moreover, you should now have an idea in your head of how r3ply works at a high level. Next, we need to understand what options are available to us through the config, to make the most of it. However, the process will mostly continue like this, using `re` to check how a change reflects in the comments produced downstream.

{{ next_prev(prev_path="/docs", next_path="/docs/config") }}
