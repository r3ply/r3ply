import dayjs from 'dayjs'
import { toHex } from '../../util'
import crypto from 'crypto' // DON'T REMOVE!
import { R3plySystemConfig } from '@r3ply/schema'

/**
 * Generates a short, user-friendly envelope string, called a `signet` from a binary master key.
 *
 * This envelope can be used in site configuration to represent secret key material
 * without exposing the actual master key.
 *
 * Process:
 * 1. Takes a Uint8Array (the raw master key or derived key material)
 * 2. Encodes it in Base64URL
 * 3. Optionally truncates or shortens it to produce a compact, readable token
 *
 * Security:
 * - The envelope is not the actual encryption key; it is meant to be used as
 *   a reference or wrapped key in configurations.
 * - The underlying key material should remain secret and stored securely.
 *
 * Usage:
 * - Include the generated envelope in public site config
 * - The service can decrypt or derive the underlying key using its own secrets
 *
 * @param encryption_key - Raw key material as Uint8Array
 * @param site_domain - The domain this signet is being issued to
 * @returns Short Base64URL string representing the signet (i.e. envelope) and its issue date (i.e. key id)
 */
async function make_short_signet(
  encryption_key: string,
  {
    site_domain,
    r3ply_domain,
    issued_date,
  }: {
    site_domain: string
    r3ply_domain: string
    issued_date?: string
  },
) {
  // Service master key stored in environment (32 bytes, base64)
  const master_key_b64 = encryption_key
  const masterKey = Uint8Array.from(atob(master_key_b64), (c) =>
    c.charCodeAt(0),
  )

  // Generate a key ID based on the date for future roations
  const day = dayjs(issued_date ?? new Date())
  if (!day.isValid()) throw new Error('issued must be a valid date')
  const issued = day.format('YYYY-MM-DD')

  // Derive a per-site HMAC key
  const site_entry = new TextEncoder().encode(
    `${r3ply_domain}:${issued}:${site_domain}`,
  )
  const crypto_key = await crypto.subtle.importKey(
    'raw',
    masterKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const hmac_raw = new Uint8Array(
    await crypto.subtle.sign('HMAC', crypto_key, site_entry),
  )

  // Take first 16 bytes for a short envelope
  const envelope_bytes = hmac_raw.slice(0, 16)
  const signet = b64url(envelope_bytes) // ~22-char base64url string

  return { signet, issued }
}

/**
 * Computes a deterministic HMAC of an email using a r3ply service's secret key + a domain's `signet` and `issued` config values
 *
 * HMAC is used to create stable pseudonyms for moderation or identity purposes
 * without revealing the original message (e.g., email address).
 *
 * Process:
 * 1. Takes a secret key (Uint8Array) and a message string
 * 2. Uses HMAC-SHA256 to compute a digest of the message under the key
 * 3. Returns the digest as a Uint8Array, or optionally encoded in Base64/hex
 *
 * Security:
 * - The HMAC is deterministic: the same message and key always produce the same output
 * - Without access to the secret key, it is computationally infeasible to reverse
 *   the HMAC to recover the original message
 *
 * Usage:
 * - Generate commenter pseudonyms (`identity`) for moderation
 * - Verify message authenticity in future checks
 *
 * @param encryption_key - Secret key for HMAC as Uint8Array
 * @param message - Input message string to hash
 * @returns Uint8Array containing the HMAC digest
 */
export async function hmac(
  email: string,
  {
    encryption_key,
    site_domain,
    r3ply_domain,
    signet,
    issued_date,
  }: {
    encryption_key: string
    site_domain: string
    r3ply_domain: string
    signet: string
    issued_date: string
  },
): Promise<string> {
  // Decode service master key (same one used to generate envelopes)
  const masterKeyBase64 = encryption_key
  const masterKey = Uint8Array.from(atob(masterKeyBase64), (c) =>
    c.charCodeAt(0),
  )

  // Recompute expected envelope (sanity check)
  const siteData = new TextEncoder().encode(
    `${r3ply_domain}:${issued_date}:${site_domain}`,
  )
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    masterKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const hmacRaw = new Uint8Array(
    await crypto.subtle.sign('HMAC', cryptoKey, siteData),
  )
  const expectedEnvelope = b64url(hmacRaw.slice(0, 16))

  if (expectedEnvelope !== signet) {
    throw new Error('Envelope mismatch — possible tampered config')
  }

  // Derive actual per-site key (full 32 bytes from SHA-256 HMAC, not just truncated part)
  const perSiteKey = hmacRaw

  // Use per-site key to HMAC the email
  const perSiteCryptoKey = await crypto.subtle.importKey(
    'raw',
    perSiteKey,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const emailBytes = new TextEncoder().encode(email.toLowerCase().trim())
  const emailHmac = new Uint8Array(
    await crypto.subtle.sign('HMAC', perSiteCryptoKey, emailBytes),
  )

  return toHex(emailHmac)
}

/**
 *  Type used to represent a function that takes the parameters required to anonymize and returns a future pseudonym
 *  note: the encryption key is expected to be curried
 */
export type AnonymizeEmail = (
  email_address: string,
  site_domain: string,
  r3ply_domain: string,
  signet: string,
  issued_date: string,
) => Promise<string>

/**
 *  Convenience object to curry encryption keys
 */
export const Anonymize = {
  // This is the one you want you probably want to use when passing to the `viaEmail` function on an instance of the `R3ply` type
  hmac: (encryption_key: string): AnonymizeEmail => {
    return (
      email_address: string,
      site_domain: string,
      r3ply_domain: string,
      signet: string,
      issued_date: string,
    ) =>
      hmac(email_address, {
        encryption_key,
        site_domain,
        r3ply_domain,
        signet,
        issued_date,
      })
  },
}

/**
 *  Convenience object to curry encryption keys
 */
export const Signet = {
  // This is the one you probably want to use if you provide an implementation (i.e. app) of r3ply somewhere, e.g. the CLI or cloudflare-worker, to help people join your service
  issue: (key: string, system_config: R3plySystemConfig) => {
    return (
      site_domain: string,
      r3ply_domain: string,
      issued_date?: string,
    ) => {
      if (system_config.domains.includes(r3ply_domain)) {
        return make_short_signet(key, {
          site_domain,
          r3ply_domain,
          issued_date,
        })
      } else {
        throw new Error(
          'A r3ply service can only issue signets from its own domain.',
        )
      }
    }
  },
}

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let str = ''
  for (let i = 0; i < arr.length; i++) {
    str += String.fromCharCode(arr[i])
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') // strip padding
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest

  // openssl rand -base64 32
  const test_key = '0lR0WsHxbNYTMGMXYnGFPbDwTNbZJw3IF1gh/BPmeDs='
  it('generates a key id and envelope, and can use that to make an hmac', async () => {
    const result = await make_short_signet(test_key, {
      r3ply_domain: 'r3ply.com',
      site_domain: 'example.com',
      issued_date: '2025-08-25',
    })
    expect(result.signet).toBe('IvDnuNdK51pGP4H6t1EfUQ')

    const result2 = await hmac('bob@foo.com', {
      encryption_key: test_key,
      site_domain: 'example.com',
      r3ply_domain: 'r3ply.com',
      signet: result.signet,
      issued_date: result.issued,
    })

    expect(result2).toBe(
      '0075389005c7dd5eedd31aff1ad5d76c64e50fd5cb6535045acf35936849891f',
    )
  })
}
