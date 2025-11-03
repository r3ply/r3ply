+++
title = "r3ply Demo"
template="base.html"

[extra.comments]
enabled = true
+++

# r3ply Demo

The purpose of this page is to demonstrate what r3ply can do.

## Writing Comments

Comments are sent as emails. This allows visitors to use their own email clients, giving them a native app experience when writing. More importantly however it frees them from having to sign up for any accounts or submit themselves to any tracking or ad-tech.

r3ply automatically anonymizes all the email addresses of the commenters, before they arrive for moderation. This works by applying an HMAC-256 function on their email address, using the site's signet as a key envelope. You can read more about [the details](/docs/overview#anonymization) in the docs (or view the source on GitHUb).

To make drafting an email comment easier, this demo pre-populates the details in a mailto link. Importantly though, it would still work fine if the user filled out the correct details. The `To:` field of the email is `<Your-Site>@r3ply.com` (or another server if you use a different one.) Then the `Subject:` field is just the path of what you're commenting on.

```email,hl_lines=2-4 10,name=Comment with ID #bdc179db
Message-ID: <831a33a7-7de4-4b0e-b5fc-b7228d1b93e3@user.com>
From: <bob@user.com>
To: <example.com@r3ply.com>
Subject: /demo/
Date: Sun, 2 Nov 2025 23:00:00 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: 7bit

My name is Bob.
```

This leads to a very flexible situation, as it allows people to comment on each other's comments just by referencing their comment id's as anchor links.

Let's say for example that bob's email above has an id of `#bdc179db`. Then Alice could respond like:

```email,hl_lines=2-4 10,name=Alice's Comment with ID #9ed3c2f4
Message-ID: <62121d44-27f3-4168-b3db-cc195b1f98f2@user.com>
From: <alice@user.com>
To: <example.com@r3ply.com>
Subject: /demo/#bdc179db
Date: Sun, 2 Nov 2025 23:00:00 +0000
MIME-Version: 1.0
Content-Type: text/plain; charset="utf-8"
Content-Transfer-Encoding: 7bit

Hi bob! My name's Alice.
```

This makes for a very old-web style, comment addressable system that's quite durable and perfectly suited for static websites. In fact, one could even take it so far as to comment on specific text, as in the case of [text fragments (MDN ↗)](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment/Text_fragments).

If you have javascript enabled try it out now by highlight some text on this page.

{% fig(dark="/screenshots/text-fragment_dark-bg-cropped.png", caption="You can even receive comments on text.") %}
![Screenshot showing comment button that appears when text is highlighted.](/screenshots/text-fragment_light-bg-cropped.png)
{% end %}

{% fig(dark="/screenshots/text-fragment-email_dark-bg.png", caption="After clicking the comment icon.") %}
![Screenshot showing how responding to a text fragment looks in the email client](/screenshots/text-fragment-email_light-bg.png)
{% end %}

## Comment Navigation

TODO

