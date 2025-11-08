+++
title = "r3ply Demo"
template="base.html"

[extra.comments]
enabled = true
+++

# r3ply Demo

The purpose of this page is to demonstrate what a site that uses r3ply _could_ look like.

{% toc() %}

- [Writing Comments](#writing-comments)
  - [Privacy Respecting](#privacy-respecting)
  - [Easy as Pushing a Button](#easy-button)
  - [Content Addressable](#content-addressable)
- [Reading Comments](#moderating-and-reading-comments)
  - [Comment Moderation](#comment-moderation)
  - [Individual Comment Fields](#comment-fields)
  - [Navigating Comments](#navigating-comments)

{% end %}

{{ fleuron_fish() }}

## Writing Comments

In r3ply, comments can be sent as emails. This allows visitors to use their own email clients, giving them a native app experience when writing. More importantly however is it frees them from having to sign in to other services.

The question then becomes can an email-based comment system be a good experience for users?

### Privacy Respecting

r3ply automatically anonymizes all the email addresses of the commenters, before they arrive for moderation. This works by applying an HMAC-256 function on their email address, using the site's signet as a key envelope. You can read more about [the details](/docs/overview#anonymization) in the docs (or view the source on GitHUb).

### Easy as Pushing a Button { #easy-button }

To make drafting an email comment easier, this demo pre-populates the details in a mailto link. If you combine that link with some CSS you get a button that looks simple and easy:

<a href="mailto:r3ply.com@r3ply.com?subject=/demo/&body=%0A%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%EF%B9%8D%0A1.%20Write%20you%20comment%20above%20this%20%E2%98%9D%EF%B8%8F%20line%0A2.%20When%20you%27re%20ready%20just%20hit%20send%20%F0%9F%93%A4%0A3.%20Do%20NOT%20edit%20the%20email%20subject%20%E2%9A%A0%EF%B8%8F%0A%0ANOTE%3A%20Your%20email%20address%20will%20remain%20private%0A%0AA%20subset%20of%20markdown%20can%20be%20used%0A%28no%20images%2C%20headings%2C%20or%20script%20tags%29%0A%0A%28Email%20signatures%20below%20%F0%9F%91%87%20will%20be%20ignored%29%0A%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%EF%B9%89%0A" class="bg-yellow-300 border border-black rounded-lg px-3 py-2 text-black no-underline">Easy Button.</a>

But it encodes an email just like you would when submitting a form or making an API call.

```email,name=Example 'mailto' Link:
Message-Id: <33A04EAE-DC3A-4733-9CC0-4A4F8C43781B@user.com>
Date: Wed, 5 Nov 2025 14:42:21 +0100
To: r3ply.com@r3ply.com
From: "Bob" Bob@user.com (supplied automatically by the email client)
Subject: /demo/

﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍
1. Write you comment above this ☝️ line
2. When you're ready just hit send 📤
3. Do NOT edit the email subject ⚠️

NOTE: Your email address will remain private

A subset of markdown can be used
(no images, headings, or script tags)

(Email signatures below 👇 will be ignored)
﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉﹉

-Bob
```

### Content Addressable

The `Subject:` field is just the path of the content that is being commented on. This creates a very flexible system, as the subject is any URL, like the path of a page, but you can also do much more.

#### Replying to Other Comments { #anchor-links }

For example, implementing replies to other comments is straightforward. Let's assume the comment [from above](#easy-button) has `id=bdc179db`. In this case a response could just be a mailto link appending that id to the path:

```email,hl_lines=4,name=Comment Responding to #bdc179db
Message-ID: <62121d44-27f3-4168-b3db-cc195b1f98f2@user.com>
From: <alice@user.com>
To: <r3ply.com@r3ply.com>
Subject: /demo/#bdc179db
Date: Sun, 2 Nov 2025 23:00:00 +0000

Hi Bob! (...)
```

This makes for a very old-web style, comment addressable system that's perfectly suited for static websites.

#### Commenting on Text Fragments { #text-fragments }

In fact, one could even take this even further and allow their site visitors to select and respond to specific text. To do this you would just append a [text fragment (MDN ↗)](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments).

If you have javascript enabled you can try it out now. Just highlight some text on the page and you should see a comment icon appear.

{% fig(dark="/screenshots/text-fragment_dark-bg-cropped.png", caption="Users can even respond to text fragments!", add_class="rounded-lg p-4 bg-blue-100 dark:bg-slate-900") %}
![Screenshot showing comment button that appears when text is highlighted.](/screenshots/text-fragment_light-bg-cropped.png)
{% end %}

And after clicking that icon, we see the same process as before:

{% fig(dark="/screenshots/text-fragment-email_dark-bg.webp", caption="View of responding to a 'text fragment'", add_class="rounded-lg p-4 bg-blue-200/50 dark:bg-gray-800/50") %}
![Screenshot showing how responding to a text fragment looks in the email client](/screenshots/text-fragment-email_light-bg.webp)
{% end %}

## Moderating & Reading Comments { #moderating-and-reading-comments }

After a comment has been received, it's processed by r3ply and then sent for moderation according to the site's config.

### Comment Moderation

In the case of this demo, the comments use GitHub moderation. The comments themselves are stored in separate repo, and are pulled into the r3ply site as a git submodule. Here's an excerpt from the config:


```toml, name=this site's github moderation:
[[moderation.github]]
owner = "asimpletune"
repo = "r3ply-site-comments"
"file_path_{}" = "{{ comment.ts_rcvd }}_{{ comment.id[:8] }}-{{ author.pseudonym[:7] }}.md"
"base_branch_{}" = "main"
"head_branch_{}" = "comment-{{ comment.ts_rcvd }}-{{ comment.id[:8] }}.md"
"commit_msg_{}" = """Comment submitted:\n
  - Sender: {{ author.pseudonym }}
  - Timestamp: {{ comment.ts_rcvd }}
  - Subject: {{ comment.subject.url }}
\n> {{ comment.txt | split(pat="\r\n") | join(sep="\n> ") }}"""
"pr_title_{}" = "New comment ({{ comment.id[:8] }}) on {{ comment.subject.url }} by author `{{ author.pseudonym[:7] }}`"
"allow*" = [ ]
```

### Comment Fields

Each comment has been rendered to display similar to a actual email, which makes their fields readily understandable.

```email
Comment-ID: <60e3283a…> (links to the comment, individually)
From: <5bcb8f1…> (pseudonym of sender)
Subject: /demo/
Date: Mon, 27 Oct 2025 15:25:31 +0000
Auth: [dkim : x , spf : x , dmarc : x] (auth details of the orig. email)

Now, if only we had a captain. . . What about it? How much is it? That's 100 pieces of eight. I'd like to make you an offer. Great!
```

### Navigating Comments

<div class="dark:prose-code:bg-transparent! dark:prose-code:text-violet-300!">

This demo also implements a [hn](https://news.ycombinator.com) style commenting system with `prev`, `next`, `parent`, and `root` controls, in addition to adding a `#` control for a comment to link to itself.

{% fig(dark="/screenshots/comment-navigation_desktop_dark.webp", add_class="p-4 rounded-lg bg-blue-100 dark:bg-slate-900", caption="Hackernews style comment navigation") %}
![Screenshot showing "hackernews" style comment navigation](/screenshots/comment-navigation_desktop_light.webp)
{% end %}

On mobile it uses a shorthand version of the same navigation, but `/` for root, `..` for parent, and `.` for self, along with `⭣` and `⭡` for next and prev.

{% fig(dark="/screenshots/comment-navigation_mobile_dark.webp", add_class="p-4 rounded-lg bg-blue-100 dark:bg-slate-900", caption="*nix style symbols for 'root', 'parent', and 'self'.") %}
![Screenshot showing "hackernews" style but on mobile](/screenshots/comment-navigation_mobile_light.webp)
{% end %}

</div>

{{ fleuron_fish(add_class="mb-2") }}