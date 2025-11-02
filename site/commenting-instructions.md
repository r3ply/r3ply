### Commenting Info:

This is a demo of commenting using [r3ply](https://r3ply.com). You can leave comments on this website by sending an email.

**Your email address [will be anonymized](@/docs/overview.md#anonymization), and _can never_ be shared with anyone.**

To try it out click the `Write Comment` button, or draft an email manually [^1]. Your email client with a template already filled out that looks as follows:

```email, name=example-comment.eml
From: "You" <your-name@account.com>
To: "r3ply.com" <r3ply.com@r3ply.com>
Subject: {{ current_path }}

Your comment goes here

---
The template will have instructions like this

And your signature below will be removed
---

- You
```

[^1]: To send an email manually, just address it to `r3ply.com@r3ply.com`, with the subject `{{ current_path }}`. If you do draft the email manually, please remember to not leave your email signature in there.

If you want to respond to someone, you must include their comment as an anchor link in the path, e.g. `Subject: /docs/getting-started/#abcd1234` (please note the trailing slash).

You can also respond to text fragments, e.g.

```email
Subject: /docs/getting-started/#:~:text=You%20should%20see%20a%20bunch%20of%20text%20representing
```