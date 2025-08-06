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
4. `deliverable`: additional checks are performed to see if the email comment is even deliverable based on a range of factors. This is difference from prescreen because the actual headers of the email are looked at. `deliverable` is for example when a commenter who has been previously blocked would be stopped.
5. `prepare`: next the email is prepared to for processing. This is when all the inputs that are needed for turning an email into a comment are gathered and made ready.
6. `process`: finally the prepared inputs of the email are processed into an actual comment, based on the site admin's configuration. Usually this means an object is passed as the context to a template the site admin has configured.
