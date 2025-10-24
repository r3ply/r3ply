+++
title = "r3ply docs: Overview"
template = "doc.html"
+++

# Overview

In this page we'll discuss concepts and terminology of r3ply. The goal is to give the reader a big picture understanding of r3ply (_Also, documentation that doesn't have a dedicated page should go here_).

{% fig(dark="/illustrations/r3ply-email-comment-swim-lanes_dark@0.5x.webp" caption="Swim lanes detailing the flow of data in r3ply") %}
![Swim lane architectural diagram depicting the flow of data when receiving an email comment](/illustrations/r3ply-email-comment-swim-lanes@0.5x.webp)
{% end %}

This page is meant to be useful to both future contributors to the codebase, as well as site owners who are using r3ply to receive comments.

## Table of Contents { .text-right .border-b .border-dashed }

- [Fundamentals](#fundamentals)
  - [r3ply](#r3ply)
  - [Sites & Signets](#sites-signets)
  - [Configs](#configs)
  - [Anonymization](#encryption)
  - [Encryption](#encryption)
  - [Moderation](#moderation)
- [Tracing a Comment](/todo)
- [Why Comments as Files?](/todo)

<div class="mt-8 -mb-4 p-0 text-lg flex justify-center gap-3 dark:text-amber-200">{{ fleuron_fish() }}</div>

## Fundamentals

Here's a discussion of some of terminology and concepts of r3ply.

### r3ply

r3ply **in essence** is just a [library](/todo). To make a r3ply _app_ you just handle IO, delegating the main logic to the r3ply library. In that sense **every r3ply app is just a wrapper** around the r3ply library. Two examples of _r3ply apps_ are:

- The [r3ply Cloudflare Worker](/todo): accessed publicly, via the internet
- The [r3ply CLI](/todo) - `re`: accessed privately, via the local file system

As you can see, the main difference between the two is how they're accessed. Therefore their main responsibilities are handling the particulars of IO specific to their domains.

For example, the cloudflare worker can be accessed from the public internet, and has a way of receiving emails. It currently powers the public [r3ply.com](https://r3ply.com) service.

On the other hand, the CLI app – `re` – just receives text from the command line and parses them into arguments.

In both cases the main work they're responsible for is specific to their IO, while the actual logic of processing comments is handled by the underlying r3ply library. Since r3ply app are just IO wrappers around the r3ply library, **it's quite easy to [build your own](/todo) r3ply app** and extend others.

### Sites & Signets

Central to a r3ply app are the sites they serve, and **each r3ply x site pair** has a _signet_. A _site_ is just some domain, like "example.com", and a signet is a 22 character string issued by a r3ply server that allows the site to do business with it. This is **not an API key**. In fact, signets are never stored and their main purpose is for cryptographically signing things, such as the email addresses of commenters.

A more detailed discussion of [anonymization](#anonymization) follows below.

Sites and signets are stored in a site's r3ply config as a [site entry](/todo). Let's take a closer look at a **site x r3ply pair** and inspect the signet.

{% make_signet() %}

```toml
[[site]]
# the domain of the site
domain = "example.com"
# the domain of the issuing r3ply app
r3ply = "r3ply.com"
# the actual signet
signet = "iSQIIBcF7ka2UURJpFDkYw"
# the issued date
issued = 2025-08-26
```

{% end %}

The `issued` field is used as a key identifier for the signet. This is useful for things like key rotations. Therefore, if you ever decide to get a new signet, you'll be able to track comments that were signed by the old one.

Try changing the domain with different values to see how the signet changes. For more options you can also try using the [API](/todo) or `re generate signet --help`.

### Configs

In the [previous section](#sites-signets) there was mention of `[[site]]` entries in the site's config, and in fact the main way of using r3ply is by modifying your config. The config is full of different attributes that can be changed to get the behavior that you want.

Both sites and r3ply apps use configs.

A full treatment of the subject is in the [config section](/todo) of the documentation.

### Anonymization

From [above](#sites-signets):

> signets are never stored and their main purpose is for cryptographically signing things

In this context _cryptographically signing_ means to produce some kind of verifiable signature of something without revealing its contents.

Crucially, once something has been signed with a signet **it can never be read again**, but the same thing signed multiple times will **always produce the same signature**. In this sense, signets **perform a one-way function** that is both _pseudo-random_ and _deterministic_.

(_This is why r3ply uses the term `pseudonym` [for authors](/todo), since something truly anonymous would be indistinguishable from randomness, but the same author's email will always produce the same `pseudonym`._)

Importantly, **emails signed with signets are still completely secure** and practically indistinguishable from total randomness.

Now let's talk more about the specifics of **how r3ply's anonymization works**. Signets are 22 character strings that are actually [_key envelopes_ ↗](https://en.wikipedia.org/wiki/Hybrid_cryptosystem#Envelope_encryption), storing part of **a private key** that was produced by a **a master key**, held by the issuing r3ply app.

To form this key envelope, the site's `domain` and the signet's `issued` date are both concatenated, along with the issuing app's `r3ply` domain, and then signed with the r3ply server's private key.

When a signet is trying to be used **this is envelope is re-computed** and any deviations from the original signet **will be proof the envelope was tampered with**. You can see the process in this example code:

```TS
// Recompute expected envelope (sanity check)
const site_data_envelope = new TextEncoder().encode(
  `${r3ply_domain}:${issued_date}:${site_domain}`,
)
const hmac_bytes = new Uint8Array(
  await crypto.subtle.sign('HMAC', master_key, site_data_envelope),
)
const expected_envelope = base64UrlEncode(hmac_bytes.slice(0, 16))
if (expected_envelope !== signet) {
  throw new Error('Envelope mismatch — possible tampered config')
}
```

In other words, **a signet can only be used by the site it was issued to, along with the server that issued it**.

If the key envelope can successfully be recomputed, however, then the key is recovered from the remaining 16 bytes and used to sign the underlying data with [HMAC-SHA256 ↗](https://en.wikipedia.org/wiki/HMAC). This is how the emails of commenters of are _anonymized_, i.e. how their `pseuodonym` is generated.

### Encryption

r3ply also does some encryption. In addition to signing email addresses for anonymization, they are also encrypted. This produces an opaque `token` that comes with every email comment. Email addresses are padded with null bytes to conceal the length of the original email. For example:

```
"token": "kktE_W_Nlh95kjQpAbbcDkpOPtTjh8SRJNAdulGWav5Nv0zJNUABG91PMIeTo8K6PyMXkHp8iJsxuR-Qg0rFwKLk3LmZt0NTJ1SNUOLL8-0k0Ik-bNSBWCnH_lRCkWFc7LRpTfPNurZ7ncifRVFGbqgKrFoLhvwGSujQivorr9tNKq_r7C2aTyb-ECmTWJdgWVHaD4lwetqv0tU-tueGkBlbTHWlAR6JUX2UwOrQrTSgzx6Ft3-hb4Q9esLhlN1ffUK43Ov0E8dhGReH-Uy1fj2k_EzyOwLLfZ771mkfC4dMsjPl0jMZTSjDQqP-tK3hiA5xJsC6Aa00S04ZFVXBIZVNHEgds4AbcfUhpZqwOfBLfCXey4scQBW5DZFGkF3Km3_gaBJUYKTaYoYLN71Xd5rjELcpahwzvxUurUoNYQn-D6zt_U-Fbt4SeoA9370ivV1U0HeY6w-5YWrk"
```

Currently encryption is done mostly for the purpose of future proofing. It will allow things like key rotations to be done more easily. **For this reason, it's advised to store the author `token` alongside the comment even if you don't use it**. Otherwise the data would be lost forever, which might be fine for some people.

A 32-byte AES-256 symmetric key is used for encryption.

(_In the future encryption may be used more to allow sites to store secrets in public that r3ply can use._)

### Moderation

r3ply handles _receiving_ and _transforming_ comments according to site configs, however moderation channels are responsible for ultimately getting the comments to the sites. They can effectively be thought of as a handoff. There is a [section](/todo) in the config documentation where moderation channels are discussed more thoroughly.

Conceptually though moderation channels can be thought of as destinations for comments. For the purpose of flexibility r3ply allows you to [_fan-out_](<https://en.wikipedia.org/wiki/Fan-out_(software)>) a comment to multiple moderation channels. This could be used, for example, to open a pull request with the [GitHub Moderation Channel](/todo) and then to send the comment to a [Webhook Moderation Channel](/todo) for delivering a slack notification.

Each moderation channel allows you to specify an [allow list](/todo), granting certain senders to bypass moderation. [Block lists](/todo) are also possible but they are handled further upstream the comment pipeline, in the `[comments.email]` config section.

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
