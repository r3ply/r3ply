# r3ply CLI

CLI tool r3ply + local development. Run `re` for usage.

## Installation

Install `@r3ply/cli` from npm.

```sh
# npm
npm install --save-dev @r3ply/cli
# pnpm
pnpm install --dev @r3ply/cli
# bun
bun install --dev @r3ply/cli
```

## Development

You can build once or continuously.

```sh
# build once
pnpm build
# build continuously (use `pnpm link` to be able to test the changes)
pnpm build:watch
```

Text generation for simulation of comments happens under [`src/comment_generation`](./src/comment_generation/).

To build the markov chain for text generation you need to run the `pretrain` and `train` steps.

```sh
# prepares and preprocesses the training data
pnpm pretrain
# adds the data to the markov chain
pnpm train
```