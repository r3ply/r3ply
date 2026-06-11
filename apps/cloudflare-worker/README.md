# r3ply Cloudflare Worker

Implementation of r3ply using Cloudflare Workers that's accessible over the public internet via email, along with a small rest API.

See [https://r3ply.com/](https://r3ply.com/) for more info:
- [docs](https://r3ply.com/docs/) - for the general r3ply docs
- [demo](https://r3ply.com/demo/) - to see a demo
- [project](https://r3ply.com/project/) - for project documentation like structure and contributing info.

## Environment Variables

- `R3PLY_GIST_TOKEN` - a secret that's used by r3ply to anonymously store emails as gists in case there's a problem while processing a comment

## Basic Usage

```sh
# install dependencies
pnpm install

# run cloudflare type generation
pnpm cf:types

# runs a local server for testing (inbound email won't work)
pnpm run dev

# runs tests once
pnpm test

# run tests continually
pnpm test:watch

# builds project
pnpm build

# deploys to cloudflare infrastructure
pnpm cf:deploy

# tail output of worker to the console
pnpm tail
```

## Local Testing

Make sure the server is running first.

```sh
pnpm run dev
```

### Comments via Email

You can use `re` - the r3ply CLI tool - to test emails via this r3ply cloudflare worker:

```bash
EMAIL_FROM="bob@user.com"
EMAIL_TO="ping@r3ply.com"
EMAIL_SUBJECT="example"
re generate email --from "$EMAIL_FROM" --to "$EMAIL_TO" --subject "$EMAIL_SUBJECT" | \
curl --request POST 'http://localhost:8787/cdn-cgi/handler/email' \
  --url-query "from=$EMAIL_FROM" \
  --url-query "to=$EMAIL_TO" \
  --data-binary @-
```

(Note: this code needs to be run from within the project directory of the relevant site NOT necessarily within the directory of the cloudflare worker)

### Cache

This project uses the d1 database to cache.

You can query the database locally

```bash
wrangler d1 execute R3PLY_STAGING_DB --local --command "<SQL>"
```

To query what tables are available you can use this sql query.

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name NOT LIKE 'sqlite_%';
```

You can trigger the cache eviction locally by running `curl "http://localhost:8787/__scheduled?cron=0+0+*+*+*"`.


## Rate Limits

- 5 emails per 60 seconds (for comments)
- 12 reqs per 60 seconds (for API)