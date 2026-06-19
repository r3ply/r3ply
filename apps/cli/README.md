# r3ply CLI

CLI tool to help websites integrate with the r3ply commenting system.

The r3ply commenting system allows websites to receive comments via email. It works well with static sites as well as dynamic sites. This package helps you do things like simulate emails so you can focus on templating them the way you want, without requiring you to manually send comments yourself over email. Essentially it allows for quick and accurate iteration, and makes the final deployment much more smooth.

> See [r3ply.com](https://r3ply.com) for more information, or read the [docs](https://r3ply.com/docs/cli/)

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

## Usage

```text
Usage: re [options] [command]

CLI for r3ply

Options:
  -V, --version           output the version number
  --config <path>         specify path to config
  --format <toml | json>  format to use with file output (default: "toml")
  -h, --help              display help for command

Commands:
  init [options]          initialize a new r3ply project (at current directory)
  config                  r3ply config commands
  generate                generate useful text
  simulate                simulate receiving a comment using your r3ply config
  cache                   manage comment cache
  help [command]          display help for command
```

More detailed information is at [r3ply.com/docs/cli](https://r3ply.com/docs/cli/).

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