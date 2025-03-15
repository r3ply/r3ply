// Note: this code patches bundler imports for cloudflare workers
import * as imports from './r3ply-wasm-bundler_bg.js'

// switch between both syntax for node and for workerd
import wkmod from './r3ply-wasm-bundler_bg.wasm'
import * as nodemod from './r3ply-wasm-bundler_bg.wasm'
if (typeof process !== 'undefined' && process.release?.name === 'node') {
  imports.__wbg_set_wasm(nodemod)
} else {
  const instance = new WebAssembly.Instance(wkmod, {
    './r3ply-wasm-bundler_bg.js': imports,
  })
  imports.__wbg_set_wasm(instance.exports)
}

export * from './r3ply-wasm-bundler_bg.js'
