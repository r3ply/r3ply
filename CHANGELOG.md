# Changelog

## Next

## 0.0.1 (2025-03-15)

- make a monorepo with the following directory structure:

  ```
  .
  ├── apps
  │   ├── cli
  │   └── cloudflare-worker
  ├── crates
  │   └── r3ply-wasm
  ├── docs
  ├── examples
  │   └── zola-example
  ├── packages
  │   ├── config
  │   └── lib
  ├── test-data
  │   └── eml
  └── tools
  ```

  - apps: code that is used by itself, not as a library
  - crates: rust related stuff (for now this is just wasm stuff)
  - docs: placeholder for documentation/website
  - examples: different websites demoing r3ply + playground for experimentation
  - packages: TS libraries that are upstream of apps (but downstream wasm stuff)
