export interface Env {
  // Secrets
  EMAIL_HASH_PEPPER: string // Note: concatenated w/ sender email before hashing
  R3PLY_GIST_TOKEN: string // Note: used to temporarily store emails before doing any further processing to them
  HMAC_SECRET: string // Note: the secret used to anonymize the `From` header of emails
  GITHUB_APP_PW: string

  // Variables
  EMAIL_MAX_BYTES_DEFAULT: string
  EMAIL_HASH_PEPPER_VERSION: string
  RUNNING_LOCALLY: boolean

  // Bindings
  MODERATOR_EMAIL: SendEmail
  R3PLY_USER_CONFIGS: KVNamespace
  R3PLY_DB: D1Database
  R3PLY_GITHUB_APP: Fetcher
}

declare module '*.toml' {
  const content: string
  export default content
}
