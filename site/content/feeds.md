+++
title = "RSS & Atom Feeds"
template="base.html"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

# RSS/Atom Feeds

This site demonstrates how visitors can receive notifications on comments, threads, authors, etc. using RSS. It works by generating an atom.xml for each of these items and then exposes links allowing users to "subscribe" to something.

More specifically, visitors of this site can subscribe to receive notifications to:

- specific [pages](/subjects): any comments on an individual page well notify them via RSS
- direct [replies](/replies) to comments
- replies to whole [threads](/threads)
- or any comments by a certain [author](/commenters/)

This allows notifications to be delivered to a reader without requiring them to sign up for an account, via an open and standard protocol. Feel free to browse and explore the comments, and experiment with this commenting + notifications functionality.

The site is able to do this automatically during the static compilation phase. Every comment that's received for this site adds the necessary frontmatter via the r3ply comment template.

You can experiment with it right on this page.

