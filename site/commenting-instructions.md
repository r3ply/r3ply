### Commenting Info:

This is a demo of commenting using [r3ply](https://r3ply.com). You can leave comments on this website by sending an email.

**Your email address [will be anonymized](@/docs/overview.md#anonymization), and _can never_ be shared with anyone.**

To try it out click the <a href="{{ mailto }}" class="px-3 py-2 border rounded-lg border-black dark:border-gray-500 bg-yellow-300 hover:bg-yellow-400 text-black no-underline">Write Comment</a> button, or draft an email manually [^1]. Your email client with a template already filled out that looks as follows:

```email, name=example-comment.eml
From: "Your Name" <your-name@account.com>
To: "r3ply.com" <r3ply.com@r3ply.com>
Subject: {{ subject_path }}

<YOUR COMMENT GOES HERE>
{{ mailto_body }}
- You
```

[^1]: To send an email manually, just compose it exactly like the code snippet above. To respond to a comment append `#<Comment-ID>` to the path, e.g. `Subject: /docs/getting-started/#abcd1234` (please note the trailing slash). You can also respond to text fragments the same way, e.g. `Subject: /docs/getting-started/#:~:text=You%20should%20see%20a%20bunch%20of%20text%20representing`.