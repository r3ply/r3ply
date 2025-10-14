import { base64UrlDecode, base64UrlEncode } from '../../util'
import crypto from 'crypto' // DON'T REMOVE!

// fixed length for padded emails
const EMAIL_PAD_LEN = 320

/**
 * @description
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
 * @param symmetric_encryption_key_b64 - 32-byte AES-256 symmetric key as base64 string
 * @param email - Email address to encrypt
 * @returns Base64URL string containing nonce, ciphertext, and authentication tag
 */
async function encrypt_email(
  symmetric_encryption_key_b64: string,
  email: string,
): Promise<string> {
  // Import key for AES-GCM
  const symmetric_encryption_key = await crypto.subtle.importKey(
    'raw',
    Buffer.from(symmetric_encryption_key_b64, 'base64'),
    { name: 'AES-GCM' },
    false,
    ['encrypt'],
  )
  // Generate 12-byte nonce
  const nonce = crypto.getRandomValues(new Uint8Array(12))
  // Encode email to bytes
  const email_bytes = new TextEncoder().encode(email)
  if (email_bytes.length > EMAIL_PAD_LEN)
    throw new Error('Email too long for padding')
  const padded = new Uint8Array(EMAIL_PAD_LEN)
  padded.set(email_bytes)
  // Encrypt
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      symmetric_encryption_key,
      padded,
    ),
  )
  // Concatenate nonce + ciphertext
  const token_bytes = new Uint8Array(nonce.length + ciphertext.length)
  token_bytes.set(nonce, 0)
  token_bytes.set(ciphertext, nonce.length)
  // Base64URL encode
  return base64UrlEncode(token_bytes)
}

/**
 * @description
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
 * Notes:
 * - The token must have been generated using the same master key (or corresponding key version)
 * - Throws an error if decryption fails, e.g., due to wrong key, corrupted token, or tampering
 *
 * @param masterKey - 32-byte AES-256 symmetric key (Uint8Array) used for encryption
 * @param token - Base64URL string produced by `encryptEmail`
 * @returns The original email address as a string
 */
async function decrypt_email(
  symmetric_decryption_key_b64: string,
  token: string,
): Promise<string> {
  // Import key
  const key = await crypto.subtle.importKey(
    'raw',
    Buffer.from(symmetric_decryption_key_b64, 'base64'),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  )
  // Convert base64 token to bytes
  const token_bytes = base64UrlDecode(token)
  // Split nonce and ciphertext+tag
  const nonce = token_bytes.slice(0, 12)
  const ciphertext = token_bytes.slice(12)
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
  while (end > 0 && padded[end - 1] === 0) end--
  const email_bytes = padded.slice(0, end)
  return new TextDecoder().decode(email_bytes)
}

if (import.meta.vitest) {
  const { it, test, expect } = import.meta.vitest

  // openssl rand -base64 32
  const test_key = '09tCJoUT+hOsdzHXLfi4gE5JE1frS0qwNA0K7wIh9KM='
  test('encrypts/decrypts an email/token', async () => {
    await expect(
      encrypt_email(test_key, 'bob@example.com').then((encrypted_token) =>
        decrypt_email(test_key, encrypted_token),
      ),
    ).resolves.toBe('bob@example.com')
  })
  test('encrypts to a fixed length', async () => {
    const expected_token_length = 464
    await expect(encrypt_email(test_key, 'a@b.com')).resolves.toHaveLength(
      expected_token_length,
    )
    await expect(
      encrypt_email(test_key, 'bob@example.com'),
    ).resolves.toHaveLength(expected_token_length)
    await expect(
      encrypt_email(test_key, 'fourscoureandsevenyearsagotoday@example.com'),
    ).resolves.toHaveLength(expected_token_length)
    await expect(
      encrypt_email(
        test_key,
        'ipledgeallegiencetotheflagoftheunitedstatesofamericaandtotherepublicforwhichitstands@example.com',
      ),
    ).resolves.toHaveLength(expected_token_length)
  })
  test(`throws an error if an email exceeds the limit of ${EMAIL_PAD_LEN}`, async () => {
    const max_repeat = EMAIL_PAD_LEN - '@b.com'.length
    await expect(
      encrypt_email(test_key, `${'a'.repeat(max_repeat)}@b.com`),
    ).resolves.not.toThrowError()
    await expect(
      encrypt_email(test_key, `${'a'.repeat(max_repeat + 1)}@b.com`),
    ).rejects.toThrowError(/Email too long/)
  })
}

/**
 *  Type used to represent a function that accepts an email address and returns a future opaque, encrypted token
 *  note: the encryption key is expected to be curried
 */
export type EncryptEmail = (email_address: string) => Promise<string>
export const Encrypt = {
  email:
    (encryption_key: string): EncryptEmail =>
    (email_address: string) =>
      encrypt_email(encryption_key, email_address),
}
export type DecryptEmail = (token: string) => Promise<string>
export const Decrypt = {
  email:
    (decryption_key: string): DecryptEmail =>
    (token: string) =>
      decrypt_email(decryption_key, token),
}
