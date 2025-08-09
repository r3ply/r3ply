# r3ply CLI

You can simulate emails from your website's project repo

```
re comments simulate-email --from bob@example.com --to monkeyisland.com@r3ply.com
```

But you can also simply generate an email

```
re comments generate foo.eml --from bob@example.com --to monkeyisland.com@r3ply.com
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
re comments generate foo.eml --from bob@example.com --to monkeyisland.com@r3ply.com | \
curl --request POST 'http://localhost:8787/cdn-cgi/handler/email' \
  --url-query 'from=bob@example.com' \
  --url-query 'to=monkeyisland.com@r3ply.com' \
  --data-binary @-
```
