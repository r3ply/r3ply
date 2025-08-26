import { Env } from '../src/env'
import { env } from 'cloudflare:test'

declare module 'cloudflare:test' {
  // Controls the type of `import("cloudflare:test").env`
  interface ProvidedEnv extends Env {
    TEST_DB: D1Database
    R3PLY_GIST_TOKEN: string
    SIGNET_KEY: string
    EMAIL_ENCRYPT_KEY: string
  }
}
