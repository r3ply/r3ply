+++
template = "comment.html"
title = {{ comment.txt[:120] | trim | json_encode }}
authors = {{ [author.pseudonym] | str }}
date = {{ email.date }}
slug = {{ comment.id[:8] | json_encode }}

[taxonomies]
commenters = {{ [author.pseudonym[:7]] | str }}
threads = {{ ["all", comment.subject.path[1:-1], "comments/" ~ (comment.id[:8])] | str }}
replies = {{ [("comments/" ~ comment.subject.fragment[1:9]) if (comment.subject.fragment and comment.subject.fragment[:8] != "#:~:text") else comment.subject.path[1:-1]] | str }}

[extra.email]
dkim = {{ email.auth.dkim }}
dmarc = {{ email.auth.dmarc }}
spf = {{ email.auth.spf }}

[extra.comment]
document = {{ comment.subject.path | json_encode }}
root = {{ comment.subject.fragment is undefined or comment.subject.fragment?[:8] == "#:~:text" }}
in_reply_to = {{ comment.subject.fragment | json_encode if comment.subject.fragment else false }}
ctx = {{ __tera_context | str | json_encode }}
+++

{{ comment.html }}
