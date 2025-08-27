+++
+++

# r3ply - Comments, simple as email.

r3ply is an <!-- TODO -->[open source project](/) that allows websites to receive comments via email. Host a [r3ply config](#getting-started) and then receive comments at `<domain>@r3ply.com`.

View the [demo site](https://spenc.es/writing/email-as-a-commenting-system/#comments) to try it out, or [get started](/#getting-started) to add comments to your site.

## Getting Started

r3ply is simple to add to your site, with just a few steps:

{% make_config() %}

1. Enter your website's domain and press 'generate' to produce a `signet`. Then host the config at `/.well-known/r3ply/config.toml` from the same domain.

{% end %}

**Now you're ready to start receiving comments. But how do your visitors know where to send them?**

2. On your website, generate `mailto:` links on the pages where you'd like to receive comments, by pre-populating the `to` and `subject` fields.

**Put `<your-site>@r3ply.com` in the `To` header of the email. In the `Subject` line just leave a link to the page or other comment the email is responding to.**

3. Comments addressed to [\<your-site\>@r3ply.com](mailto:CHANGE_ME@r3ply.com) and referencing the subject (a URL) will arrive per the `moderation` section of the config, e.g. GitHub.

**You can learn more about how to fine tune the configuration in the <!-- TODO -->[config docs](/).**

There is also a r3ply CLI tool called `re` that is useful for local development. Use it to simulate a comment arriving to your site, and iterate on your config with confidence.

```sh
npm install -g @r3ply/cli
re config validate
```

---

Next read the <!-- todo -->[docs](/) or scroll down to learn more about r3ply.

## Why Email as a Commenting System?

While there are a ton of additional benefits to using email for comments, the most important two reasons come down to the fact that:

1. Everybody person in the world **_already_** has email
2. **_Nobody_** wants to create accounts for things

However, in addition to those points, email clients are purpose-built for writing! They allow visitors to do things like **scroll side-by-side**, next to the content they're responding to, or to provide rich features like **comment drafts** and **commenting history** automatically — because **_email already works that way_**.

These features would be difficult to replicate, and that's just for the editor alone. But let's get back to the real challenge r3ply solves which is accounts and moderation.

## How r3ply Solves Accounts & Moderation

As mentioned [above](#why-email-as-a-commenting-system), everyone already has email and nobody wants to sign up for things. And they shouldn't have to!

Imagine if you sent an email to the owner of a website responding to their article (maybe it stinks!). The website owner would then have the power to copy and paste your comment at the bottom of the article, to share with the rest of the world, or to ignore your email altogether.

In that scenario, the website owner had full moderation, but the commenter only had to send an email — no sign ups were required.

---

**r3ply does the same thing but automated and with some key differences:**

1. commenter's email addresses are pseudo-anonymized to a stable hash
2. instead of using a personal email address, the site has a special email address just for receiving comments
3. moderating comments and publishing them just uses the site's normal build pipeline, rather than being copy and pasted

---

With r3ply then, users never have to sign up for anything, therefore there's no account friction preventing users from leave comments on r3ply enabled websites, and site owners can still moderate content that goes to their website.

## FAQ

Below are answers to common questions. Check the <!-- TODO -->[docs](/) for more details.

**Table of Contents:**

- [How Does r3ply Work?](#how-does-r3ply-work)
- [How Do I Integrate r3ply Comments with My Website?](#how-do-i-integrate-r3ply-comments-with-my-website)
- [What is the Difference between r3ply.com and r3ply?](#what-is-the-difference-between-r3ply-com-and-r3ply)
- [How Are Email Addresses Anonymized?](#how-are-email-addresses-anonymized)
- [What Commenting Channels (Sources) Are There?](#what-commenting-channels-sources-are-there)
- [What Moderation Channels (Sinks) Are There?](#what-moderation-channels-sinks-are-there)
- [Can Commenters Receive an Email Notification?](#can-commenters-receive-an-email-notification)
- [Can Site Moderators Receive an Email Notification?](#can-site-moderators-receive-an-email-notification)

### How Does r3ply Work?

Here's an overview of the flow of data:

1. the site owner [generates a config](#getting-started) and then host it from their domain
2. then they pre-populate mailto links for the parts of their website where they want to receive comments
3. a user then clicks the mailto link, writes their comment, and submits it
4. the email arrives at the r3ply server, which then checks the site the email is addressed to and fetches that site's config
5. r3ply then uses the site's configuration to process the email into a format the site expects, e.g. html, json, toml, markdown, etc...
6. along the way a number of checks are performed, allowing malicious comments to be ignored
7. finally the processed comment is ready for the owner to moderate and is forwarded to the moderation channel in their config
8. (optional) comments that are pending moderation can be cached by r3ply and available immediately via front-end JS

### How Do I Integrate r3ply Comments with My Website?

Comments from r3ply arrive for moderation as files. From there you just build your website normally. Without any config changes r3ply comments will simply be JSON files, however you can also use a templating language in your config to precisely control how comments look. For example, you could template that JSON object into HTML.

For this purpose there's also a r3ply CLI tool called `re`, which is designed to help with a number of local tasks, such as simulating receiving comments. Using `re` you can test changes to your website, and make sure that everything is still working as expected.

### What is the Difference between [r3ply.com](https://r3ply.com) and r3ply?

r3ply is open source software, and [r3ply.com](https://r3ply.com) is just one, canonical, deployment of that software. For people who just want to start receiving comments right away, [r3ply.com](https://r3ply.com) should be all they need. However, since r3ply is open source anyone can host their own instance and serve themselves and others with it.

For example, if someone deployed r3ply at `https://r4ply.com`, then websites could add that to their config and receive comments at `<site>@r4ply.com`.

### How Are Email Addresses Anonymized?

r3ply uses the concept of a _signet_ to pseudo-anonymize the email addresses of commenters. This has the benefit of privacy, but is also deterministic, which allows site owners to moderate comments.

Specifically a _signet_ is just a encrypted envelope that is issued by a r3ply service, to a website's domain. The envelop carries key material that's decrypted by the r3ply service, and then mixed with the senders email address, before performing an [HMAC](https://en.wikipedia.org/wiki/HMAC).

_signet's_ can not be used by other websites, nor can they be used with other r3ply services. There is a strict 1:1 relationship.

### What Commenting Channels (Sources) Are There?

Currently there's just email. However, r3ply was designed from the beginning to allow for additional commenting sources. If you're interested in adding more, then please checkout r3ply's <!-- TODO -->[GitHub repo](/) and the <!-- TODO -->[contributing](/) docs.

### What Moderation Channels (Sinks) Are There?

Currently there's just `GitHub` and `webhook`. If you're interested in adding more, then please checkout r3ply's <!-- TODO -->[GitHub repo](/) and the <!-- TODO -->[contributing](/) docs.

### Can Commenters Receive an Email Notification?

r3ply allows site owners to configure if and how they'd like r3ply to respond on their behalf to the commenters. By default there's no response, but on the other end of the spectrum one can template a response a fully branded HTML email in the config, complete with a preview URL to their comment. It just depends on how you want to do it.

Most users only care about knowing that their comment arrived and otherwise want to be left alone.

### Can Site Moderators Receive an Email Notification?

As of right now, there are some limitations around this. If you're a moderator who wants to receive email notifications, then the best way to do that is to make sure that your preferred moderation channel does this, e.g. GitHub pull request can be configured to email repository owners.

The reason for this limitation is that r3ply's email provider only allows responding to emails. At the moment sending _new_ emails (or forwarding emails) — which would be required for notifying a site moderator by email - is restricted to only a pre-approved list of emails.

In the future a different, outbound service could be used or r3ply could host its own email server. More generally, there are plans to add altogether new notification channels in the future.
