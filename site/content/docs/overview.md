+++
title = "r3ply docs: Overview"
template = "doc.html"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

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
  - [Privacy](#encryption)
  - [Data Flow](#data-flow)
- [Comment Sources](#comment-sources)
  - [Email](#comments-via-email)
    - [The Email Comment Pipeline](#the-email-comment-pipeline)
- [Moderation Channels](#moderation-channels)
  - [GitHub Moderation](#github-moderation)
  - [Webhook Moderation](#webhook-moderation)
  - [Local Moderation](#local-moderation)
{% end %}

{{ fleuron_fish() }}

## Fundamentals

Here's a discussion of some of terminology and concepts of r3ply.

### r3ply

r3ply **in essence** is just a [library (src ↗)](https://github.com/r3ply/r3ply/tree/main/v0.0.1/packages/lib). To make a r3ply _app_ you just handle IO, delegating the main logic to the r3ply library. In that sense **every r3ply app is just a wrapper** around the r3ply library.

Two examples of _r3ply apps_ are:

- The [r3ply Cloudflare Worker](https://github.com/r3ply/r3ply/tree/main/v0.0.1/apps/cloudflare-worker): accessed publicly, via the internet
- The [r3ply CLI (src ↗)](https://github.com/r3ply/r3ply/tree/main/v0.0.1/packages/cli) - `re`: accessed privately, via the local file system

As you can see, the main difference between the two is how they're accessed. Therefore their main responsibilities are handling the particulars of IO specific to their domains.

For example, the cloudflare worker can be accessed via email over the public internet, and it currently powers the [r3ply.com](https://r3ply.com) service.

On the other hand, the CLI app – `re` – just receives text from the command line and parses them into arguments.

In both cases the main work they're responsible for is specific to their IO, while the actual logic of processing comments is handled by the underlying r3ply library. Since r3ply app are just IO wrappers around the r3ply library, **it's quite easy to build your own <!-- TODO: this would be a cool tutorial --> r3ply app** and extend others.

### Sites & Signets

Central to a r3ply app are the sites they serve, and **each r3ply x site pair** has a _signet_. A _site_ is just some domain, like "example.com", and a signet is a 22 character string issued by a r3ply server that allows the site to do business with it. This is **not an API key**. In fact, signets are never stored and their main purpose is for cryptographically signing things, such as the email addresses of commenters.

A more detailed discussion of [anonymization](#anonymization) follows below.

Sites and signets are stored in a site's r3ply config as a [site entry](@/docs/config.md#site-config-entry). Let's take a closer look at a **site x r3ply pair** and inspect the signet.

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

Try changing the domain with different values to see how the signet changes. For more options you can try using `re generate signet --help`.

### Configs

In the [previous section](#sites-signets) there was mention of `[[site]]` entries in the site's config, and in fact the main way of using r3ply is by modifying your config. The config is full of different attributes that can be changed to get the behavior that you want.

Both sites and r3ply apps use configs.

A full treatment of the subject is in the [config section](@/docs/config.md) of the documentation.

### Privacy

Emails addresses of commenters **are never shown** to site moderators. Instead, they are [anonymized](#anonymization) to a stable but private identifier. [Encryption](#encryption) is also used for forwards compatibility.

r3ply administrators can see email addresses, as this is an unavoidable fact of technology in general. This exists only in the case where there's a problem that needs to be debugged and logs need to be checked to understand what's wrong. That is why the source code is public and fully auditable.

#### Anonymization

This section covers in-depth how r3ply's anonymization works. It's not necessary to understand how to use r3ply, but it's documented here nonetheless for people who are curious.

From [above](#sites-signets):

> signets are never stored and their main purpose is for cryptographically signing things

In this context _cryptographically signing_ means to produce some kind of verifiable signature of something without revealing its contents.

Crucially, once something has been signed with a signet **it can never be read again**, but the same thing signed multiple times will **always produce the same signature**. In this sense, signets **perform a one-way function** that is both _pseudo-random_ and _deterministic_.

(_This is why r3ply uses the term `pseudonym` [for authors](@/docs/templating.md#template-context), since something truly anonymous would be indistinguishable from randomness, but the same author's email will always produce the same `pseudonym`._)

Importantly, **emails signed with signets are still completely secure** and practically indistinguishable from total randomness.

Now let's talk more about the specifics of **how r3ply's anonymization works**. Signets are 22 character strings that are actually [_key envelopes_ (wikipedia ↗)](https://en.wikipedia.org/wiki/Hybrid_cryptosystem#Envelope_encryption), storing part of **a private key** that was produced by a **a master key**, held by the issuing r3ply app.

To form this key envelope, the site's `domain` and the signet's `issued` date are both concatenated, along with the issuing app's `r3ply` domain, and then signed with the r3ply server's private key.

When a signet is trying to be used **this is envelope is re-computed** and any deviations from the original signet **will be proof the envelope was tampered with**. You can see the process in this example code:

```ts, name=how key envelope is checked
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

If the key envelope is recomputed, then the key is recovered from the remaining 16 bytes and used to sign the underlying data with [HMAC-SHA256 (wikipedia ↗)](https://en.wikipedia.org/wiki/HMAC).

This is how the emails of commenters of are _anonymized_, i.e. how their `pseuodonym` is generated.

#### Encryption

r3ply also does some encryption. In addition to signing email addresses for anonymization, they are also encrypted. This produces an opaque `token` that comes with every email comment. Email addresses are padded with null bytes to conceal the length of the original email. For example:

```
"token": "kktE_W_Nlh95kjQpAbbcDkpOPtTjh8SRJNAdulGWav5Nv0zJNUABG91PMIeTo8K6PyMXkHp8iJsxuR-Qg0rFwKLk3LmZt0NTJ1SNUOLL8-0k0Ik-bNSBWCnH_lRCkWFc7LRpTfPNurZ7ncifRVFGbqgKrFoLhvwGSujQivorr9tNKq_r7C2aTyb-ECmTWJdgWVHaD4lwetqv0tU-tueGkBlbTHWlAR6JUX2UwOrQrTSgzx6Ft3-hb4Q9esLhlN1ffUK43Ov0E8dhGReH-Uy1fj2k_EzyOwLLfZ771mkfC4dMsjPl0jMZTSjDQqP-tK3hiA5xJsC6Aa00S04ZFVXBIZVNHEgds4AbcfUhpZqwOfBLfCXey4scQBW5DZFGkF3Km3_gaBJUYKTaYoYLN71Xd5rjELcpahwzvxUurUoNYQn-D6zt_U-Fbt4SeoA9370ivV1U0HeY6w-5YWrk"
```

Currently encryption is done mostly for the purpose of future proofing. It will allow things like key rotations to be done more easily. **For this reason, it's advised to store the author `token` alongside the comment even if you don't use it**. Otherwise the data would be lost forever, which might be fine for some people.

A 32-byte AES-256 symmetric key is used for encryption.

### Data Flow

The general flow of data is as follows.

{% fig(dark="/illustrations/r3ply-email-comment-swim-lanes_dark@0.5x.webp" caption="Swim lanes detailing the flow of data in r3ply") %}
![Swim lane architectural diagram depicting the flow of data when receiving an email comment](/illustrations/r3ply-email-comment-swim-lanes@0.5x.webp)
{% end %}

1. The data flow begins when a r3ply app receives a request for comment from a [commenting source](#comment-sources), e.g. email.
2. The r3ply app will check fetch the config from the site for whom the comment request is destined.
3. The site responds to the r3ply app with its config.
4. The r3ply app resumes processing the comment request according to the site's configuration. The specific details are covered more in depth in the [comment processing pipeline](#the-email-comment-pipeline) docs. When this step is finished the comment request is now a comment.
5. The comment is then passed along to the various [moderation channels](#moderation-channels) specified in the site's config.
6. A response is sent to the original commenter. This is usually but in the case of `re` – the r3ply CLI – it might just be printing to the terminal.
7. TODO: notify the site (see [roadmap](@/project/roadmap.md))

Each comment is abstracted as a file. The file per comment approach allows us to avoid the issue of merge conflicts with version control systems.

## Comment Sources

Each commenting source is a way to begin the r3ply [data flow](#data-flow). They are configured below the `[config]` variable. Currently there is only email as a commenting source.

{% info(type="tip") %}
Each commenting source can specify a `filter*` variable in their config that filters what `[[site]]` entries ([docs](/@/docs.md#sites-and-signets)) it accepts comments from. The `filter*` variable is a list of strings that [can be glob patterns](@/docs/config.md#variables-and-types) reference that site entry's label.
{% end %}

### Email { #comments-via-email }

Commenters can send comment requests via email. Emails must conform to the following requirements:

1. The `To` field of the email must be addressed to the site + r3ply app like `<SITE-DOMAIN>@<R3PLY-DOMAIN>`.
2. The `Subject` field must either be a full URL or a URL path. It is not valid to send an email request with a URL in the subject line that has a different hostname than the local portion of the `To` address. The email address in the `From` field will be [anonymized](#anonymization) into an author [pseudonym](@/docs/templating.md#base-comment-template-context).
3. The body of the email will be the comment. There is a field in the site config to [remove the email signature](@/docs/config.md#email-comments) from the body.

It's advised to generate the `To`, `Subject`, and `Body` of the email in advance with a `mailto` link to ensure that sending comments is a reliable and repeatable process for your users.

Offensive commenters can be blocked by adding their pseudonym to a block list ([docs](@/docs/config.md#email-comments)).

r3ply handles _receiving_ and _transforming_ comments according to site configs, however [_moderation channels_](#moderation-channels) are used for ultimately getting the comments to the sites. They can effectively be thought of as a handoff.

#### The Email Comment Pipeline

Here are the precise steps of the email comment pipeline. To see the steps clearly yourself try running `re simulate email`

1. `prescreen`: checks made to the email before it's actually opened. These are very basic checks such as ensuring that the email is within the accepted size, or that both the configured site and its r3ply app are enabled and accepting comments. The block list is not checked here. The analogy to the postal service would be asking if your package has anything flammable.
2. `receive`: an ID and timestamp is assigned to the email comment. This would be similar to the postal service giving you a tracking number.
3. `accept`: the actual email bytes are parsed. This would be analogous to someone from the post office actually physically picking up your package.
4. `deliverable`: the email itself is examined for deliverability. Here is where the block list is checked, along with the the Subject line.
5. `prepare`: the parsed email is prepared into a [template context](@/docs/templating.md#template-context) that will provide all the variables that the templating will use later.
6. `process`: here is when the actual comment is produced by binding the templating context from above with the user's configured template, if any. If there is none then the comment is just the template context.

After these stages the comment request has finished becoming a comment. It will then be sent to any moderation channels that accept it.

## Moderation Channels

Conceptually, moderation channels can often be thought of as destinations for comments. For the purpose of flexibility r3ply allows you to [_fan-out_ (wikipedia ↗)](https://en.wikipedia.org/wiki/Fan-out_(software)) a comment to multiple moderation channels. This could be used, for example, to open a pull request with the [GitHub Moderation Channel](@/docs/config.md#github-moderation) and  to send the comment to a [Webhook Moderation Channel](@/docs/config.md#webhook-moderation) for delivering a slack notification.

Additionally, each moderation channel allows you to specify an [allow list](@/docs/config.md#moderation-configuration), granting permission to bypass moderation for certain senders. As mentioned above, [Block lists](@/docs/config.md#email-comments) are also possible but they are handled further upstream the comment pipeline, in the `[comments.email]` config section ([docs](@/docs/config.md#email-comments)).

Offensive commenters can be blocked by adding their pseudonym to a block list ([docs](@/docs/config.md#email-comments)).

There is a [subsection](@/docs/config.md#moderation-configuration) in the config documentation where the configuration of each moderation channel is documented.

### GitHub Moderation

GitHub moderation allows r3ply to submit each comment as a file in a pull request. To use it with a private repo you need to give the [r3ply GitHub bot](https://github.com/apps/r3ply) permission to access your repo. It can be configured according to the [GitHub Moderation config](@/docs/config.md#github-moderation) docs.

### Webhook Moderation

The webhook moderation channel is for general purpose integration. It can be configured according to the [Webhook Moderation config](@/docs/config.md#webhook-moderation) docs.

### Local Moderation

Local moderation is used by `re` – the r3ply CLI – to simulate comments. It can be configured according to the [Local Moderation config](@/docs/config.md#local-moderation) docs.

{{ fleuron_fish() }}

{{ next_prev(prev_path="/docs/getting-started/", prev_text="Getting Started", next_path="/docs/config/", next_text="r3ply config") }}
