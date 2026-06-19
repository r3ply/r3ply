+++
title = "RSS & Atom Feeds"
template="base.html"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

# RSS/Atom Feeds

This site demonstrates how visitors can receive notifications on different topics, such as comments, via RSS. It works by generating an atom.xml for each of these topics, and then exposes links allowing users to "subscribe" to something.

More specifically, visitors of this site can subscribe to receive notifications when there are new comments on:

- specific [pages](/subjects) -- each page has a its own RSS feed for comments
- other comments -- each comment has an RSS feed of direct [replies](/replies) to it

Each [author](/commenters/) also has an RSS feed, and there's a general feed for [all comments](/comments/atom.xml).

This allows notifications to be delivered to a reader without requiring them to sign up for an account, via an open and standard protocol. Feel free to browse and explore the comments, and experiment with this commenting + notifications functionality.

The site is able to do this automatically during the static compilation phase. Every comment that's received for this site adds the necessary frontmatter via the r3ply comment template.

You can experiment with it right on this page.

