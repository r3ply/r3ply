import { base64UrlDecode, base64UrlEncode } from '../util'

// fixed length for padded emails
const EMAIL_PAD_LEN = 320

/**
 * Encrypts an email address into a fixed-length, opaque token suitable for storage.
 *
 * The token is constructed as: Base64URL([nonce || ciphertext || tag]), where:
 * - nonce: 12-byte random value generated for each encryption
 * - ciphertext: AES-GCM-encrypted, padded email (EMAIL_PAD_LEN bytes)
 * - tag: 16-byte AES-GCM authentication tag
 *
 * Padding:
 * - The email is first converted to bytes and padded with null bytes to a fixed length (EMAIL_PAD_LEN)
 * - This ensures all tokens are the same length and prevents leaking email length
 *
 * Nonce:
 * - Random 12-byte nonce ensures that encrypting the same email twice produces different ciphertexts
 * - The nonce is included in the token so it can be used for decryption
 *
 * AES-GCM:
 * - AES-256-GCM encryption ensures both confidentiality (ciphertext) and integrity (authentication tag)
 * - Any tampering with the token will cause decryption to fail
 *
 * Token:
 * - The final token is Base64URL-encoded for safe storage in front matter or JSON fields
 * - Token length is fixed (e.g., 464 characters if EMAIL_PAD_LEN = 320)
 *
 * Usage:
 * - This token is opaque and should NOT be used for moderation; use a deterministic HMAC instead
 * - Master key rotation is supported by storing a token_version and re-encrypting with a new key
 *
 * @param masterKey - 32-byte AES-256 symmetric key (Uint8Array) stored securely
 * @param email - Email address to encrypt
 * @returns Base64URL string containing nonce, ciphertext, and authentication tag
 */
export async function encrypt_email(
  symmetric_encryption_master_key: string,
  email: string,
): Promise<string> {
  // Convert base64 stored key to an array
  const masterKeyBase64 = symmetric_encryption_master_key
  const masterKey = Uint8Array.from(atob(masterKeyBase64), (c) =>
    c.charCodeAt(0),
  )

  // Import key for AES-GCM
  const key = await crypto.subtle.importKey(
    'raw',
    Buffer.from(masterKey),
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )

  // Generate 12-byte nonce
  const nonce = crypto.getRandomValues(new Uint8Array(12))

  // Encode email to bytes
  const encoder = new TextEncoder()
  const email_bytes = encoder.encode(email)
  if (email_bytes.length > EMAIL_PAD_LEN)
    throw new Error('Email too long for padding')
  const padded = new Uint8Array(EMAIL_PAD_LEN)
  padded.set(email_bytes)

  // Encrypt
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, padded),
  )

  // Concatenate nonce + ciphertext
  const token_bytes = new Uint8Array(nonce.length + ciphertext.length)
  token_bytes.set(nonce, 0)
  token_bytes.set(ciphertext, nonce.length)

  // Base64URL encode
  return base64UrlEncode(token_bytes)
}

/**
 * Decrypts a token produced by `encryptEmail` to recover the original email address.
 *
 * The token is expected to be Base64URL([nonce || ciphertext || tag]):
 * - nonce: 12-byte random value used during encryption
 * - ciphertext: AES-GCM-encrypted padded email (EMAIL_PAD_LEN bytes)
 * - tag: 16-byte AES-GCM authentication tag
 *
 * Process:
 * 1. Base64URL-decode the token into a byte array
 * 2. Split into nonce (first 12 bytes) and ciphertext+tag (remaining bytes)
 * 3. Import the master AES-256 key for decryption
 * 4. Decrypt ciphertext using AES-GCM with the nonce
 * 5. Remove padding (trailing null bytes) to recover the original email
 *
 * Security:
 * - AES-GCM ensures confidentiality and integrity; tampering with the token will cause decryption to fail
 * - Nonce included in the token ensures that repeated encryptions of the same email are unique
 * - Padding prevents leaking the original email length
 *
 * Notes:
 * - The token must have been generated using the same master key (or corresponding key version)
 * - Throws an error if decryption fails, e.g., due to wrong key, corrupted token, or tampering
 *
 * @param masterKey - 32-byte AES-256 symmetric key (Uint8Array) used for encryption
 * @param token - Base64URL string produced by `encryptEmail`
 * @returns The original email address as a string
 */
export async function decrypt_email(
  symmetric_encryption_master_key: string,
  token: string,
): Promise<string> {
  // Convert base64 stored key to an array
  const masterKeyBase64 = symmetric_encryption_master_key
  const masterKey = Uint8Array.from(atob(masterKeyBase64), (c) =>
    c.charCodeAt(0),
  )

  // Convert base64 token to bytes
  const tokenBytes = base64UrlDecode(token)

  // Split nonce and ciphertext+tag
  const nonce = tokenBytes.slice(0, 12)
  const ciphertext = tokenBytes.slice(12)

  // Import key
  const key = await crypto.subtle.importKey(
    'raw',
    Buffer.from(masterKey),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  )

  // Decrypt
  const padded = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: nonce },
      key,
      ciphertext,
    ),
  )

  // Remove trailing null bytes
  let end = padded.length
  while (end > 0 && padded[end - 1] === 0) {
    end--
  }
  const email_bytes = padded.slice(0, end)

  return new TextDecoder().decode(email_bytes)
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest

  // openssl rand -base64 32
  const test_encryption_master_key =
    '09tCJoUT+hOsdzHXLfi4gE5JE1frS0qwNA0K7wIh9KM='
  it('encrypts/decrypts an email/token', async () => {
    const encrypted_token = await encrypt_email(
      test_encryption_master_key,
      'bob@example.com',
    )
    const email = await decrypt_email(
      test_encryption_master_key,
      encrypted_token,
    )
    expect(email).toBe('bob@example.com')
  })

  it('should encrypt to a fixed length', async () => {
    const token1 = await encrypt_email(test_encryption_master_key, 'a@b.com')
    const token2 = await encrypt_email(
      test_encryption_master_key,
      'bob@example.com',
    )
    const token3 = await encrypt_email(
      test_encryption_master_key,
      'fourscoureandsevenyearsagotoday@example.com',
    )
    const token4 = await encrypt_email(
      test_encryption_master_key,
      'ipledgeallegiencetotheflagoftheunitedstatesofamericaandtotherepublicforwhichitstands@example.com',
    )
    const expected_token_length = 464
    expect(token1.length).toBe(expected_token_length)
    expect(token2.length).toBe(expected_token_length)
    expect(token3.length).toBe(expected_token_length)
    expect(token4.length).toBe(expected_token_length)
  })
}
