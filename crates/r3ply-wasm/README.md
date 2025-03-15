# r3ply-wasm

This crate provides functionality to the r3ply library by exporting several useful rust functions with wasm bindings.

## Build/Install

```sh
# build bundler + node targets, patch bundler imports for cloudflare workers, copy package json over
npm run build

# packages everything into a tar file so it can be imported for projects
npm run pack
```

Then you can use everything like you would a normal JS/TS module, in both node and bundler projects.

```ts
import { sanitize_html } from '@r3ply/wasm'
```
