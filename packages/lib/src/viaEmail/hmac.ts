import { toHex } from '../util'

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
 * @param domain - The domain this signet is being issued to
 * @returns Short Base64URL string representing the envelope
 */
export async function make_short_signet(
  encryption_key: string,
  domain: string,
) {
  // Service master key stored in environment (32 bytes, base64)
  const masterKeyBase64 = encryption_key
  const masterKey = Uint8Array.from(atob(masterKeyBase64), (c) =>
    c.charCodeAt(0),
  )

  // Generate a key ID based on the date for future roations
  const key_id = new Date().toISOString().split('T')[0]

  // Derive a per-site HMAC key
  const siteData = new TextEncoder().encode(`${domain}:${key_id}`)
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

  // 4️⃣ Take first 16 bytes for a short envelope
  const envelopeBytes = hmacRaw.slice(0, 16)
  const envelope = b64url(envelopeBytes) // ~22-char base64url string

  return { key_id, envelope }
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
    domain,
    signet,
    signet_issued,
  }: {
    encryption_key: string
    domain: string
    signet: string
    signet_issued: string
  },
): Promise<string> {
  // Decode service master key (same one used to generate envelopes)
  const masterKeyBase64 = encryption_key
  const masterKey = Uint8Array.from(atob(masterKeyBase64), (c) =>
    c.charCodeAt(0),
  )

  // Recompute expected envelope (sanity check)
  const siteData = new TextEncoder().encode(`${domain}:${signet_issued}`)
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
  const test_master_key = '0lR0WsHxbNYTMGMXYnGFPbDwTNbZJw3IF1gh/BPmeDs='
  it('generates a key id and envelope, and can use that to make an hmac', async () => {
    const result = await make_short_signet(test_master_key, 'example.com')
    expect(result.envelope).toBe('G8PIt_7Y6N2s7NZEznnoaw')

    const result2 = await hmac('bob@foo.com', {
      encryption_key: test_master_key,
      domain: 'example.com',
      signet_issued: result.key_id,
      signet: result.envelope,
    })

    expect(result2).toBe(
      '5f1a242e4eeec2fa9cbd67c5fa20b09f1dd5a61263c77ec00b314efbd0556a4d',
    )
  })
}
