+++
title = "r3ply docs: Overview"
template = "doc.html"

[extra.comments]
enabled = true
+++

# Overview

In this page we'll discuss concepts and terminology of r3ply. The goal is to give the reader a big picture understanding of r3ply (_Also, documentation that doesn't have a dedicated page should go here_).

{% fig(dark="/illustrations/r3ply-email-comment-swim-lanes_dark@0.5x.webp" caption="Swim lanes detailing the flow of data in r3ply") %}
![Swim lane architectural diagram depicting the flow of data when receiving an email comment](/illustrations/r3ply-email-comment-swim-lanes@0.5x.webp)
{% end %}

This page is meant to be useful to both future contributors to the codebase, as well as site owners who are using r3ply to receive comments.

{% toc() %}
- [Fundamentals](#fundamentals)
  - [r3ply](#r3ply)
  - [Sites & Signets](#sites-signets)
  - [Configs](#configs)
  - [Anonymization](#encryption)
  - [Encryption](#encryption)
  - [Moderation](#moderation)
- [Tracing a Comment](/todo)
- [Why Comments as Files?](/todo)
{% end %}

{{ fleuron_fish() }}

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

{{ fleuron_fish() }}

{{ next_prev(prev_path="/docs/getting-started/", prev_text="Getting Started", next_path="/docs/config/", next_text="r3ply config") }}