import { Env } from "../src/types";
import { env } from 'cloudflare:test'

declare module "cloudflare:test" {
  // Controls the type of `import("cloudflare:test").env`
  interface ProvidedEnv extends Env {
    env: Env
  }
}