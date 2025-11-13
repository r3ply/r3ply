+++
template = "base.html"
title = "Contributing to r3ply"

[extra.comments]
enabled = true
+++

{{ breadcrumbs() }}

# Contributing

Contributions are welcome. Just open an issue. PR's are always welcome too, but it might save everyone time to discuss and plan first.

Also checkout the [roadmap](@/project/roadmap.md) for ideas or to submit your feedback on the direction the project should go in.

## Annotated Project Structure

r3ply is a small monorepo, consisting of a few different apps and packages. It is mostly written in TS with a small amount of rust code that provides wasm bindings.

The most important thing to know when working on the code base is

* `packages/schemas` and `crates/r3ply-wasm` have no dependencies on the rest of the workspace and are therefore considered upstream dependencies of everything
* `package/lib` uses `packages/schemas` and `crates/r3ply-wasm` but is also an upstream dependency of the apps
* The `apps` use everything upstream of them and are not a dependency to everything

Here is some tree output of the codebase, with comments.

{{ project_structure() }}

{{ fleuron_fish() }}

{{ next_prev(prev_path="/project/roadmap/", prev_text="Roadmap", next_path="/project/contact/", next_text="Contact & Support") }}


