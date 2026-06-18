+++
template = "comment.html"
title = {{ comment.txt[:120] | trim | json_encode }}
authors = {{ [author.pseudonym] | str }}
date = {{ email.date }}
slug = {{ comment.id[:8] | json_encode }}

[taxonomies]
# groups comments by author
commenters = {{ [author.pseudonym[:7]] | str }}
# groups comments by subject
subjects = {{ [comment.subject.path[1:-1]] | str }}
# groups comments by thread (the thread is the comment + its replies, and their replies, etc...)
# "all" is a special thread of all comments (used mainly because each tax. term generates an RSS feed)
threads = {{ ["all", comment.id[:8]] | str }}
# used to groups comments by replies (i.e. a comments direct children)
# first member is always itself, so that an RSS feed is guaranteed to exist
# second member is optionally a parent comment, i.e. this comment is replying to it
replies = {{ [comment.id[:8], ...([comment.subject.fragment[1:9]] if (comment.subject.fragment and comment.subject.fragment[:8] != "#:~:text") else [])] | str }}

[extra.email]
dkim = {{ email.auth.dkim }}
dmarc = {{ email.auth.dmarc }}
spf = {{ email.auth.spf }}

[extra.comment]
document = {{ comment.subject.path | json_encode }}
root = {{ comment.subject.fragment is undefined or comment.subject.fragment[:8] == "#:~:text" }}
in_reply_to = {{ comment.subject.fragment | json_encode if comment.subject.fragment else false }}
ctx = {{ __tera_context | str | json_encode }}
+++

{{ comment.html }}
