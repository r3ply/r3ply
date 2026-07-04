# r3ply-wasm

This crate exports several useful rust functions with wasm bindings for use within the downstream [@r3ply/lib](../../packages/lib/README.md) package.

See [r3ply.com](https://r3ply.com) to learn more about the r3ply commenting system.

## Build/Install

```sh
# build bundler + node targets, patch bundler imports for cloudflare workers, copy package json over
pnpm build:wasm

# (optional) if you want to generate a tar file for quick exports for testing
pnpm pack
```

Then you can use everything like you would a normal JS/TS module, in both node and bundler projects.

```ts
import { sanitize_html } from '@r3ply/wasm'
```

## Deploying

This project generates a package.json file within [`pkg`](./pkg/package.json) and _that's_ what needs to be deployed.

## Tera 2 Templating Language

See the [templating language docs](https://keats.github.io/tera) for more.
