+++
title = "r3ply home"
template="index.html"

[extra.comments]
enabled = false
+++

{% fig(dark="/illustrations/r3ply-landing_dark@0.5x.webp" caption="r3ply, born from the inferno of the internet") %}
![volcano erupting a comment bubble containing an email icon](/illustrations/r3ply-landing_light@0.5x.webp)
{% end %}

# r3ply - Comments simple as email.

r3ply is an [open source project](/todo) that allows websites to receive comments via email. It receives emailed comments on your behalf and packages them for your site to use.

There's no sign up – simply serve a [r3ply config](/todo) from your domain:

{% make_signet() %}

```toml
# each (site x r3ply) pair has an entry
[[site]]
domain = "example.com"
r3ply = "r3ply.com"
signet = "m1ByUVAzHfjDctYztNCHWQ"
issued = 2025-10-23

# pending comments available instantly
[comments]
cache = true

# email addresses are anonymized
# e.g. bob@foo.com -> 2bdffc137d4c....
[comments.email]
# block list uses glob patterns
"block*" = ["*@evil*", "1ee44e372c*"]

# See https://r3ply.com/docs/moderation
# For docs specific to each channel
[moderation]
# E.g. `github`, `webhook`, `local`
```

{% end %}

...and then receive emails as comments addressed to `<YOUR_SITE>@r3ply.com` at your configured [moderation channel](/todo).

**View the [demo](/docs/getting-started/#comments) to try it out, follow the [getting started](/docs#getting-started) tutorial, and read the [docs](/docs) to learn more.**

## Table of Contents { .text-right .border-b .border-dashed }

- [About](#about)
- [Features](#features)
- [Why Email?](#why-email)
- [FAQ](#faq)
- [Demo](/docs/getting-started/#comments)

<div class="mt-8 -mb-4 p-0 text-lg flex justify-center gap-3 dark:text-green-200">{{ fleuron_fish() }}</div>

## About

r3ply will receive emails on your website's behalf and package them up as a comment in a way that you can configure and [protects the privacy](/todo) of the sender. **There's no sign-up.** Instead you just host a [r3ply config](/todo) from your `<domain>`, and then email comments can be addressed to `<domain>@r3ply.com`.

_The email's `subject` field is a link (or path) to what is being commented on. It must be on the same domain that hosted the config._

Upon receiving an email comment, r3ply will look for a config at the domain specified in the local part of the email's address, **for example: `foo.com`@r3ply.com**, and then begin processing the email as a comment according to that site's configuration. Below is an example of a r3ply site config with comments.

```toml
version = "0.0.1"

# one of these per site x r3ply pair
[[site]]
domain = "spenc.es"
r3ply = "r3ply.com"
signet = "KnFbG9466E-dZcSM-tXFCA"
issued = 2025-08-26

# pending comments available instantly
[comments]
cache = true

[comments.email]
# block list uses glob patterns
"block*" = ["*@evil*", "1ee44e372c*"]

# See https://r3ply.com/docs/moderation
# For more on moderation channels
[[moderation.github]]
owner = "asimpletune"
repo = "spenc.es"
# templating can be used within config
"file_path_{}" = "content/comments/{{ comment.id[:8] }}.json"
```

To make a good experience for your site's visitors, you should generate `mailto` [↗](https://en.wikipedia.org/wiki/Mailto) links with the `to`, `subject`, and `body` fields pre-populated. This allows a draft comment to be started with just the click of a button. Below is the anatomy of an email comment.

![illustration showing the anatomy of an email comment](/illustrations/anatomy-of-an-email-comment@0.5x.webp)

_note: r3ply has a **CLI tool** called `re` that can help you generate mailto links (as well as validate configs, simulate email comments, etc..._)

**About hosting!** r3ply is an open source project and can therefore be self-hosted. In addition to this, there is a canonical, community instance of it available to all, for free, at [r3ply.com](https://r3ply.com).

---

## Features

r3ply is a win x win for websites and their readers. Here's a breakdown what there is to gain for each group.

### Benefits for site visitors and commenters: { #user-experience-benefits }

- There's **no account creation** required (or even possible)
- Commenter **email addresses are anonymized** with HMAC-SHA256 ([docs](/todo))
- Email clients provide **native app experience** for writing
- Automatic **comment history** and **comment threading**
- **Flexible to use** how you want! (e.g. `cc` a friend on a comment)
- Familiar experience... everybody knows how to send an email

By reusing mature and platform agnostic technology – like email – you allow your site visitors to truly bring their own client, offering a native app experience for writing.

In our view this is a much preferable experience to the alternatives of requiring social media logins, or each website having to implement/embed a text editor.

### For websites using r3ply: { #websites-benefits }

- Comment moderation possible with `block*` lists ([docs](/todo))
- A **templating system** for formatting comments how you want ([docs](/todo))
- "Fan-out" to **multiple moderation channels** (e.g. GitHub PR, webhook) ([docs](/todo))
- **Restrict comments** to certain paths, _e.g._ `["**", "!/private/**"]` ([docs](/todo))
- Configurable `allow*` lists to bypass comment moderation ([docs](/todo))
- Designed to **work perfectly with static sites** and traditional web servers
- A cache to serve **pending comments immediately** ([docs](/todo))

**r3ply also has a CLI tool** called `re` that is a local implementation of the r3ply server. It allows for easy debugging and development of your r3ply config, and is indispensable in iterating on how you choose to integrate comments with your website.

_E.g. you can just `re simulate email` and see [the entire pipeline](/todo) in the terminal._

### For those who want to run a r3ply service

r3ply in its most basic form is completely stateless. It therefore [can be run](/todo), comfortably within most free-tiers.

---

## Why Email?

Emailed comments crucially allow for content moderation, but there are also three additional reasons why email makes a great commenting system:

1. Everybody in the world **_already has_** email
2. **_Nobody_** wants to create accounts for things
3. Email gives us **_a lot of nice things_** for free

The appeal is simple. Not only is email the most popular and ubiquitous platform in the world, but it also gives us features like a native text editor, draft comments, and comment history without having to write a line of code. It even allows user's to bring their own tools.

**In fact, emailed comments means there isn't even vender lock-in!** Just swap out `<your-site>@r3ply.com` with whatever you want and you're back in business.

To this point, [the idea](https://spenc.es/writing/email-as-a-commenting-system/#email-as-a-commenting-system-is-not-new) of email comments has been done manually [for a while now](https://web.archive.org/web/20240430052558/https://www.dam.brown.edu/people/mumford/blog/2019/conscious.html#:~:text=SOME%20EMAIL%20RESPONSES). r3ply is just software (the first?) for automating this process, and therefore we hope improves upon that design.

**Overall the user experience is actually very nice!**

<img class="rounded-lg dark:border border-grey-400" alt='Screen recording of clicking a "comment" button in r3ply and sending' src="/animations/r3ply-screen-recording-demo.webp"/>

---

## FAQ

Below are answers to common questions. Check the [docs](/docs) for more details.

**Table of Contents:**

- [How Does r3ply Work?](#how-does-r3ply-work)
- [How Do I Integrate r3ply Comments with My Website?](#how-do-i-integrate-r3ply-comments-with-my-website)
- [How Are Email Addresses Anonymized?](#how-are-emails-anonymized)
- [What Comment Sources Are Supported?](#what-comment-sources-are-supported)
- [What Moderation Channels Are Supported?](#what-moderation-channels-are-supported)
- [Can Commenters Receive an Email Notification?](#can-commenters-receive-an-email-notification)
- [Can Site Moderators Receive an Email Notification?](#can-site-moderators-receive-an-email-notification)
- [What is the Difference between r3ply.com and r3ply?](#what-is-the-difference-between-r3ply-com-and-r3ply)

### How Does r3ply Work?

Here's an overview of the flow of data:

1. the site owner hosts a [r3ply config](/todo) from their domain
2. then they pre-populate mailto links for the parts of their website where they want to receive comments
3. a user then clicks the mailto link, writes their comment, and submits it
4. the email arrives at the r3ply server, which then checks the site the email is addressed to and fetches that site's config
5. r3ply then uses the site's configuration to process the email into a format the site expects, e.g. html, json, toml, markdown, etc...
6. along the way a number of checks are performed, allowing malicious comments to be ignored
7. finally the processed comment is ready for the owner to moderate and is forwarded to the moderation channel(s) in their config
8. (optional) comments that are pending moderation can be cached by r3ply and available immediately via front-end JS
9. The user receives a simply confirmation email letting them know their comment was successfully submitted

### How Do I Integrate r3ply Comments with My Website?

Comments from r3ply arrive for moderation as files. From there you just build your website normally. Without any config changes r3ply comments will simply be JSON files, however you can also use a templating language in your config to precisely control how comments look. For example, you could template that JSON object into HTML.

For this purpose there's also a r3ply CLI tool called `re`, which is designed to help with a number of local tasks, such as simulating receiving comments. Using `re` you can test changes to your website, and make sure that everything is still working as expected.

### How Are Emails Anonymized?

r3ply uses the concept of a _signet_ to pseudo-anonymize the email addresses of commenters. This has the benefit of privacy, but is also deterministic, which allows site owners to moderate comments.

Specifically a _signet_ is just a encrypted envelope that is issued by a r3ply service, to a website's domain. The envelop carries key material that's decrypted by the r3ply service, and then mixed with the senders email address, before performing an [HMAC ↗](https://en.wikipedia.org/wiki/HMAC).

_Signet's_ can not be used by other websites, nor can they be used with other r3ply services. The signet represents a strict 1:1 relationship between the site domain and the r3ply service that issued the signet.

### What Comment Sources Are Supported?

Currently there's just email. However, r3ply was designed from the beginning to allow for additional commenting sources. If you're interested in adding more, then please checkout r3ply's [GitHub repo](/todo) and the [contributing](/todo) docs.

### What Moderation Channels Are Supported?

Currently there's just `GitHub`, `webhook`, and `local` (which is used by the CLI). If you're interested in adding more, then please checkout r3ply's [GitHub repo](/todo) and the [contributing](/todo) docs.

### Can Commenters Receive an Email Notification?

Commenters do receive a simple email notification letting them know their comment was received successfully. In the future we plan to support allowing site owners to template that email to their liking.

### Can Site Moderators Receive an Email Notification?

As of right now, there are some limitations around this. If you're a moderator who wants to receive email notifications, then the best way to do that is to make sure that your preferred moderation channel does this, e.g. GitHub pull request can be configured to email repository owners.

The reason for this limitation is that r3ply's email provider only allows responding to emails. At the moment sending _new_ emails (or forwarding emails) — which would be required for notifying a site moderator by email - is restricted to only a pre-approved list of emails.

In the future a different, outbound service could be used or r3ply could host its own email server. More generally, there are plans to add altogether new notification channels in the future.

### What is the Difference between [r3ply.com](https://r3ply.com) and **_r3ply_**?

r3ply is open source software, and [r3ply.com](https://r3ply.com) is just one, canonical deployment of that software. For people who just want to start receiving comments right away, [r3ply.com](https://r3ply.com) should be all they need. However, since r3ply is open source anyone can host their own instance and serve themselves and others with it.

For example, if someone deployed r3ply at `https://r4ply.com`, then websites could add that to their config and receive comments at `<site>@r4ply.com`.

<div class="mt-8 -mb-4 p-0 text-lg flex justify-center gap-3 dark:text-pink-300">{{ fleuron_fish() }}</div>

{{ next_prev(next_path="/docs/" next_text="r3ply Docs") }}