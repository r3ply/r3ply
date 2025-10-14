import dayjs from 'dayjs'
import { base64UrlEncode, toHex } from '../../util'
import crypto from 'crypto'
import { R3plySystemConfig, R3plySignetConfig } from '@r3ply/schema/config'

/**
 * @description
 * Generates a short, user-friendly envelope string, called a `signet` from a master key.
 *
 * @param encryption_key_b64 Encryption key as base64 string
 * @param site_domain The domain this signet is being issued to
 * @param r3ply_domain The domain of the r3ply service that issued the signet
 * @param issued_date Date the signet was issued, usually as YYYY-MM-DD
 * @param label A name for this signet
 * @returns Short Base64URL string representing the signet (i.e. envelope) and its issue date (i.e. key id)
 */
async function make_short_signet(
  encryption_key_b64: string,
  {
    site_domain,
    r3ply_domain,
    issued_date,
    label,
  }: {
    site_domain: string
    r3ply_domain: string
    issued_date?: string
    label?: string
  },
): Promise<R3plySignetConfig> {
  // normalize inputs
  const site_url = new URL('https://' + site_domain)
  const r3ply_url = new URL('https://' + r3ply_domain)
  // Generate a key ID based on the date for future rotations
  const date = dayjs(issued_date ?? new Date())
  if (!date.isValid()) throw new Error('issued must be a valid date')
  const issued = date.format('YYYY-MM-DD')
  // Import master key (32 bytes)
  const master_key_bytes = Uint8Array.from(
    Buffer.from(encryption_key_b64, 'base64'),
  )
  const crypto_key = await crypto.subtle.importKey(
    'raw',
    master_key_bytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  // Derive a per-site HMAC key
  const hmac_bytes = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      crypto_key,
      new TextEncoder().encode(
        `${r3ply_url.hostname}:${issued}:${site_url.hostname}`,
      ),
    ),
  )
  // Take first 16 bytes for a short envelope
  const envelope_bytes = hmac_bytes.slice(0, 16)
  const signet = base64UrlEncode(envelope_bytes) // ~22-char base64url string
  return {
    domain: site_url.hostname,
    r3ply: r3ply_url.hostname,
    signet,
    issued,
    label,
  }
}
namespace make_short_signet {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    describe('make_short_signet', async () => {
      // openssl rand -base64 32
      const test_key = '0lR0WsHxbNYTMGMXYnGFPbDwTNbZJw3IF1gh/BPmeDs='
      test('Generates a signet from a site + r3ply domain, plus optional issued date', async () => {
        await expect(
          make_short_signet(test_key, {
            r3ply_domain: 'r3ply.com',
            site_domain: 'example.com',
            issued_date: '2025-08-25',
          }),
        ).resolves.toStrictEqual({
          domain: 'example.com',
          issued: '2025-08-25',
          label: undefined,
          r3ply: 'r3ply.com',
          signet: 'IvDnuNdK51pGP4H6t1EfUQ',
        })
      })
      test('Issued date must parse to a valid date', async () => {
        await expect(
          make_short_signet(
            test_key, // openssl rand -base64 32
            {
              r3ply_domain: 'r3ply.com',
              site_domain: 'example.com',
              issued_date: 'abc',
            },
          ),
        ).rejects.toThrow(/issued must be a valid date/)
      })
      describe('Different details produce different signets', () => {
        const site_domain = 'example.com'
        const r3ply_domain = 'r3ply.com'
        const issued_date = '2025-08-25'
        test('r3ply domains', async () => {
          const test_r3ply_domain = 'test.r3ply.com'
          expect(test_r3ply_domain).not.toBe(r3ply_domain)
          await expect(
            make_short_signet(test_key, {
              r3ply_domain,
              site_domain,
              issued_date,
            }),
          ).resolves.not.toStrictEqual(
            await make_short_signet(test_key, {
              r3ply_domain: test_r3ply_domain,
              site_domain,
              issued_date,
            }),
          )
        })
        test('Site domains', async () => {
          const test_site_domain = 'foo.com'
          expect(test_site_domain).not.toBe(site_domain)
          await expect(
            make_short_signet(test_key, {
              r3ply_domain,
              site_domain,
              issued_date,
            }),
          ).resolves.not.toStrictEqual(
            await make_short_signet(test_key, {
              r3ply_domain,
              site_domain: test_site_domain,
              issued_date,
            }),
          )
        })
        test('Issued dates', async () => {
          const test_issued_date = '2025-10-14'
          expect(test_issued_date).not.toBe(issued_date)
          await expect(
            make_short_signet(test_key, {
              r3ply_domain,
              site_domain,
              issued_date,
            }),
          ).resolves.not.toStrictEqual(
            await make_short_signet(test_key, {
              r3ply_domain,
              site_domain,
              issued_date: test_issued_date,
            }),
          )
        })
        test('Domains are normalized (e.g. case insensitive)', async () => {
          expect(r3ply_domain.toUpperCase()).not.toBe(r3ply_domain)
          expect(site_domain.toUpperCase()).not.toBe(r3ply_domain)
          await expect(
            make_short_signet(test_key, {
              r3ply_domain,
              site_domain,
              issued_date,
            }),
          ).resolves.toStrictEqual(
            await make_short_signet(test_key, {
              r3ply_domain: r3ply_domain.toUpperCase(),
              site_domain: site_domain.toUpperCase(),
              issued_date,
            }),
          )
        })
      })
    })
  }
}

/**
 * @description
 * Used to anonymize email addresses, by computing a deterministic HMAC of an email using a r3ply service's secret key + a domain's `signet` and `issued` config values.
 *
 * @param email Email address to hmac
 * @param encryption_key_b64 Master key as base64 string
 * @returns Uint8Array containing the HMAC digest of email
 */
async function hmac_email(
  email: string,
  {
    encryption_key_b64,
    site_domain,
    r3ply_domain,
    signet,
    issued_date,
  }: {
    encryption_key_b64: string
    site_domain: string
    r3ply_domain: string
    signet: string
    issued_date: string
  },
): Promise<string> {
  // Import master key (same one used to originally generate envelope, i.e. signet)
  const master_key = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(Buffer.from(encryption_key_b64, 'base64')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  // Recompute expected envelope (sanity check)
  const site_data_envelope = new TextEncoder().encode(
    `${r3ply_domain}:${issued_date}:${site_domain}`,
  )
  const hmac_bytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', master_key, site_data_envelope),
  )
  const expected_envelope = base64UrlEncode(hmac_bytes.slice(0, 16))
  if (expected_envelope !== signet) {
    throw new Error('Envelope mismatch — possible tampered config')
  }
  // Derive actual per-site key (full 32 bytes from SHA-256 HMAC, not just truncated part) to HMAC the email
  const site_key = await crypto.subtle.importKey(
    'raw',
    hmac_bytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const hmac_email = new Uint8Array(
    await crypto.subtle.sign(
      'HMAC',
      site_key,
      new TextEncoder().encode(email.toLowerCase().trim()),
    ),
  )
  return toHex(hmac_email)
}
namespace hmac_email {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    describe('hmac_email', async () => {
      // openssl rand -base64 32
      const test_key = '0lR0WsHxbNYTMGMXYnGFPbDwTNbZJw3IF1gh/BPmeDs='
      test("Email address is anonymized with an hmac computed using the site's signet", async () => {
        await expect(
          hmac_email('bob@foo.com', {
            encryption_key_b64: test_key, // openssl rand -base64 32
            site_domain: 'example.com',
            r3ply_domain: 'r3ply.com',
            signet: 'IvDnuNdK51pGP4H6t1EfUQ',
            issued_date: '2025-08-25',
          }),
        ).resolves.toBe(
          '0075389005c7dd5eedd31aff1ad5d76c64e50fd5cb6535045acf35936849891f',
        )
      })
      test('Different signets produce different pseudonyms', async () => {
        const email_address = 'bob@foo.com'
        const pseudonym1 = hmac_email(email_address, {
          encryption_key_b64: test_key,
          site_domain: 'example.com',
          r3ply_domain: 'r3ply.com',
          signet: 'IvDnuNdK51pGP4H6t1EfUQ',
          issued_date: '2025-08-25',
        })
        const pseudonym2 = hmac_email(email_address, {
          encryption_key_b64: test_key,
          site_domain: 'example.com',
          r3ply_domain: 'r3ply.com',
          signet: 'IvDnuNdK51pGP4H6t1EfUQ',
          issued_date: '2025-08-25',
        })
      })
    })
  }
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
      hmac_email(email_address, {
        encryption_key_b64: encryption_key,
        site_domain,
        r3ply_domain,
        signet,
        issued_date,
      })
  },
}

/**
 * @description Partially applies crypto keys in order to get a function that can issue signets.
 * @param key_b64 Master crypto key as a base64 string
 * @param system_config r3ply system config of the issuing service
 * @returns A function that can issue signets
 */
export const SignetIssuer = (
  key_b64: string,
  system_config: R3plySystemConfig,
) => {
  return (
    site_domain: string,
    r3ply_domain: string,
    {
      issued_date,
      label,
    }: {
      issued_date?: string
      label?: string
    },
  ) => {
    if (system_config.domains.includes(r3ply_domain)) {
      return make_short_signet(key_b64, {
        site_domain,
        r3ply_domain,
        issued_date,
        label,
      })
    } else {
      throw new Error(
        'A r3ply service can only issue signets from its own domain.',
      )
    }
  }
}
