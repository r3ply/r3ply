# r3ply lib

This library provides the underlying implementation of r3ply, as well as serves as a reference for the expected state changes and their transitions. It is not the r3ply application itself, and has no IO or way of directly interacting on its own, but it may be extended/composed in the real world to build an application (that would include things like statefulness, logging, etc...).

In other words, if you're trying to understand how r3ply works you should probably start here, but if you're trying to make a version of r3ply that runs on AWS and stores messages on queues you should probably look at the [/apps](https://github.com/asimpletune/r3ply/tree/main/apps) directory in the [r3ply monorepo](https://github.com/asimpletune/r3ply/).

This library handles the logic of what r3ply does and is embedded by r3ply apps, since it has no IO of its own. A r3ply app simply handle the edges (the IO part of things).

For more details information view the [docs](https://r3ply.com/docs/) or visit [r3ply.com](https://r3ply.com).

## Installation

Install `@r3ply/lib` from npm.

```sh
# npm
npm install --save-dev @r3ply/lib
# pnpm
pnpm install --dev @r3ply/lib
# bun
bun install --dev @r3ply/lib
```

## Development

This package depends on the upstream [@r3ply/schema](../../packages/schema/README.md) and [@r3ply/wasm](../../crates/r3ply-wasm/README.md).

You can build with `pnpm build`. Tests are run once with `pnpm test` and continously with `pnpm test:watch`.