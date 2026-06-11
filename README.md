# r3ply

Receive comments via email. Check out the [docs](https://r3ply.com/docs/) or read the [project structure](#project-structure) of this monorepo to learn more about contributing.

## Project structure

This repository is a monorepo written in a mixture of Typescript and Rust. It contains all the pieces needed to make this work:

- [@r3ply/lib](./packages/lib/README.md) - the core functionality. Depends on `@r3ply/schema` and `@r3ply/wasm`.
- [@r3ply/schema](./packages/schema/README.md) - handles the schema definitions and their parsers
- [@r3ply/wasm](./crates/r3ply-wasm/README.md) - consolidates the rust libraries used and exports them as functions in wasm

There are also currently two "apps", which are programs that handle IO but defer the logic to `@r3ply/lib`. These are:

- [@r3ply/cli](./apps/cli/README.md) - a small CLI app to help site owners develop locally, instead of having to send actual emails
- [@r3ply/cloudflare-worker](./apps/cloudflare-worker/README.md) - the Cloudflare email worker that receives actual emails

Feel free to submit a PR for adding more apps.

## Install/Build/Test/Run

The correct order is important: _crates -> packages -> apps_. Here some commands to do this:

```sh
# do this download required dependencies
pnpm install

# this will build ALL the dependencies
# useful after initially cloning (note: `pnpm install` first)
pnpm build:all

# this will build the packages
# (faster than `pnpm build:all`)
pnpm build:pkgs

# run the tests of all the TS code (add `:watch` to run tests continuously)
pnpm test:ts

# run the cloudflare worker (or `pnpm -r --filter @r3ply/cloudflare-worker dev`)
cd apps/cloudflare-worker && pnpm dev

# to link CLI (from source)
cd packages/cli && pnpm link
# now you can use the CLI
re
```
