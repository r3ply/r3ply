# r3ply lib

This library provides the underlying implementation of r3ply, as well as serves as a reference for the expected state changes and their transitions. It is not the r3ply application itself, and has no IO or way of directly interacting on its own, but it may be extended/composed in the real world to build an application (that would include things like statefulness, logging, etc...).

In other words, if you're trying to understand how r3ply works you should probably start here, but if you're trying to make a version of r3ply that runs on AWS and stores messages on queues you should probably look at the [/apps](../../apps/) directory.

## Prerequisites

It helps to understand the basic flow of what r3ply is actually doing:

```txt
commenter -> r3ply server -> site
             [has config]    [different config]
```

And here's a basic overview of what these terms mean:

- **commenter**: this is the person who actually wrote the comment. They send the comment to the r3ply server, either via email or some other method (e.g. POST, etc...).
- **r3ply server**: the program that receives the message from the commenter in its original form. It acts as an intermediary of the site and processes the comment from the raw form the commenter sent it into something the site admin expects.
- **r3ply server config**: this is the r3ply config of the r3ply server.
- _site_: this is the site domain the original comment is addressed to.
- **site admin**: the person who is administering the site.
- **site config**: this is the r3ply config of the site the original comment is addressed to

View the [config](../config/) for more information about config.

## State changes (comments via email)

Comments that are received via email transition through states as they are processed in a way that is very similar to how a postal service works.

1. `prescreen`: the first step and mainly checks compatibility of the r3ply server and the site the comment is intended for. Questions like if this site is even configured to be accepting comments are checked here. In addition the length in bytes of the message is checked to avoid any further unnecessary processing if messages that are too large.
2. `receive`: next a `comment_id` is assigned as well as a timestamp of when the email was received.
3. `accept`: next the email is parsed. It's at this point that the sender is redacted. The difference between `receive` and `accept` is similar to the difference between dropping a letter off in a mailbox, where it may still receive a postmark, and when someone from the post service actually takes that letter it into their possession.
4. `deliverable`: additional checks are performed to see if the email comment is even deliverable based on a range of factors. This is different from prescreen because the actual headers of the email are looked at. For example, `deliverable` is when a comment from a commenter who has been previously blocked would be cease to be processed.
5. `prepare`: next the email is prepared to for processing. This is when all the inputs that are needed for turning an email into a comment are gathered and made ready.
6. `process`: finally the prepared inputs of the email are processed into an actual comment, based on the site admin's configuration. Usually this means an object is passed as the context to a template the site admin has configured.

## Security

To achieve a balance of privacy for commenters while still enabling moderation, r3ply uses a combination of a pseudonym and an encrypted token.

### Stable Pseudonyms for Moderation

Stable pseudonyms for moderation are accomplished with by performing an HMAC on commenter emails mixed with random key material. The key material is unique on a **site domain x r3ply domain** basis, and are stored publicly in the site domain's config as `signet`, alongside an `issued` config value. What follows is a more detailed overview.

- `signet` is an envelope issued by the service that contains an encrypted key, which is used by r3ply to generate a deterministic HMAC of each commenter’s email.
- `issued` is a date indicating when the signet was generated, and is useful for when rotations need to be performed.

Together, these allow you to compute a stable pseudonym for a commenter across comments. Upon receipt of a comment the email address of the commenter is pseudo-anonymized to an `author` value. This `author` value will accompany the comment and is formed by `HMAC(signet + issued, email)`, which produces a fixed-length digest. This digest is deterministic, meaning the same `email` + `signet` + `issued` will always produce the same identity, which is the `author` field of the comment. **Site owners never see the email itself; they only see the HMAC identity.** Here's an example:

1. A comment via email is received from `bob@example.com`, and address to `alice.com@r3ply.com`.
2. r3ply will fetch `alice.com`'s config and use `signet=qhQ6YSUvQNLb1lCdw3kDRg` + `issued=2025-08-22` that were issued by `r3ply.com`.
3. The `author` field becomes `5f1a242e4eeec2fa9cbd67c5fa20b09f1dd5a61263c77ec00b314efbd0556a4d`, which can safely be truncated to `5f1a242e4eee`.

The purpose of the `author` value is to establish authorship of each comment and to allow site admin's to moderator the content they host. Since the `author` key is derived using HMAC it is private, but because it is deterministic it can be relied upon for moderation.

When a signet needs to be rotated, the corresponding r3ply service first generates a new `signet` and `issued` value. This will cause all future comments to use these new values. Previous comments can optionally have their authorship upgraded to use the `signet`. See [email encryption](#email-encryption) for more details.

### email encryption

Each comment has a `token` field to be stored, alongside the `author` field. This token allows site owners to recompute `author` fields when they rotate their `signet` fields, without revealing the underlying email addresses. The `token` is a fixed width, symmetric encryption of the underlying email, and should be stored with the comment.
