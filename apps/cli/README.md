# r3ply CLI

You can simulate emails from your website's project repo

```
re comments simulate-email --from bob@example.com --to monkeyisland.com@r3ply.com
```

But you can also simply generate an email and save it as a file

```
re comments generate --from bob@example.com --to monkeyisland.com@r3ply.com > foo.eml
```

And then use that email to test, for example via cloudflare's local email testing through wrangler

```
curl --request POST 'http://localhost:8787/cdn-cgi/handler/email' \
  --url-query 'from=bob@example.com' \
  --url-query 'to=monkeyisland.com@r3ply.com' \
  --data-binary @foo.eml
```

And of course it's possible to do this all in one step by piping the output of `generate` to the test command

```
re comments generate --from bob@example.com --to monkeyisland.com@r3ply.com | \
curl --request POST 'http://localhost:8787/cdn-cgi/handler/email' \
  --url-query 'from=bob@example.com' \
  --url-query 'to=monkeyisland.com@r3ply.com' \
  --data-binary @-
```

And here is real world example of developing the next version of the r3ply cf worker, locally, alongside a website's config that is also running in a separate branch:

```
re comments generate --config static/.well-known/r3ply/config.toml --from bob@example.com --to integrate-w-next-version-of.spence.pages.dev@test.r3ply.com | \
curl --request POST 'http://localhost:8787/cdn-cgi/handler/email' \
  --url-query 'from=bob@example.com' \
  --url-query 'to=integrate-w-next-version-of.spence.pages.dev@test.r3ply.com' \
  --data-binary @-
```
