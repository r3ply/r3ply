# r3ply Comments

Accepts comments to your website via email.

Here's an example of the basic flow that is currently being used at https://spenc.es/

![commenting lifecycle using r3ply as swimlanes](<./documentation/my%20r3ply%20workflow%20(swimlanes)@0.5x.png>)

## Environment Variables

- `EMAIL_HASH_PEPPER` - a secret that's added to user emails before they're hashed to make it more difficulty to uncover their identity
- `R3PLY_GIST_TOKEN` - a secret that's used by r3ply to anonymously store emails as gists in case there's a problem while processing a comment

## Basic Usage

```sh
# install dependencies
npm install

# deploys to cloudflare infrastructure
npm run deploy

# runs a local server for testing (inbound email won't work)
npm run dev

# runs tests once
npm test

# run tests continually
npm test:watch

# cleans the dist directory and builds an api
npm run prepack

# packages the api so it can be distributed locally as a tar ball
npm pack
```

## Infrastructure

There are a few pieces of infrastructure to be aware of

- Cloudflare
  - Email Workers ([docs](https://developers.cloudflare.com/email-routing/email-workers/)) - provides inbound email and some limited reply/fwd/send capabilities
    - Email Routing ([panel](https://dash.cloudflare.com/55945010d6d11381c59ab3263481b978/r3ply.com/email/routing/routes)) - Manage how routes trigger workers for this project
    - Moderator email binding - you can register certain email with Cloudflare in advance and then bind them to your service, which is how moderator emails are currently handled (In the future this should be removed as Cloudflare limits how many email bindings you can have)
    - Mail Channels ([link](https://support.mailchannels.com/hc/en-us/articles/4565898358413-Sending-Email-from-Cloudflare-Workers-using-MailChannels-Send-API)) - provides free email sending with Cloudflare Workers, but this functionality hasn't been implemented yet
  - [KV Store] ([docs](https://developers.cloudflare.com/kv/)) - is used to store user configs under the binding `R3PLY_USER_CONFIGS`
- GitHub
  - r3ply is currently storing emails in private gists, just in case there's an issue when processing a comment, which should allow the message to be reprocessed in the future if needed

## Statefulness

### D1

This project is using [D1](https://developers.cloudflare.com/d1/), a Cloudflare SQL db, to store the state of the comments.

The schema is located in [schema.sql](./schema.sql). Here are some useful commands

```zsh
# run the schema script locally
wrangler d1 execute r3ply --local --file=./schema.sql

# run the schema script in production (☠️ DANGER ☠️)
wrangler d1 execute r3ply --remote --file=./schema.sql
```
