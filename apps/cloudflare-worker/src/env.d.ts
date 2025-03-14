import { Env as WorkerGeneratedEnv } from '../worker-configuration'
// a run script in package.json generates type automatically from wrangler.toml
// this interface extends that one, while adding fields for secrets
// locally these secrets are available via .dev.vars
// in production they're stored in cloudflare's secret storage
export interface Env extends WorkerGeneratedEnv {
  // Secrets
  EMAIL_HASH_PEPPER: string // Note: concatenated w/ sender email before hashing
  R3PLY_GIST_TOKEN: string // Note: used to temporarily store emails before doing any further processing to them
  HMAC_SECRET: string // Note: the secret used to anonymize the `From` header of emails
  GITHUB_APP_PW: string
}