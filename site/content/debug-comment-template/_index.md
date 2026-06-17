+++
template = "base.html"
title = "Debug Pending Comments (Set `draft = false` to use)"
render = false

[extra.comments]
enabled = true
+++

# Debug Pending Comments

To render pending comments this site wraps the commenting html in template tags. However, these templates tags are [inherently inert](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/template), therefore if I need to debug the content they have to be rendered somewhere. That's what this page is for.

In addition to this, I'm writing this explanation in case this process needs to be repeated or some future person doesn't understand what's happening here.