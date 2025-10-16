import { Option, Result } from 'oxide.ts'
import { R3plySignetConfig } from '@r3ply/schema/config'
import {
  R3plyCommentsConfig,
  R3plyEmailCommentsConfig,
} from '@r3ply/schema/config/comments'
import micromatch from 'micromatch'
import { Addr, Message as Email } from '@mail-parser/ts-bindings'
import { AcceptedEmail, Secret } from './accept'
import { AnonymizeEmail } from './signet'
import { EncryptEmail } from './token'
import { CommentMetadata } from '../receive'

/**
 * Just a simple wrapper used to indicate that something has been encrypted
 */
export interface Encrypted<T> {
  value: T
}
export function Encrypted<T>(value: T): Encrypted<T> {
  return { value }
}

/**
 * Just a simple wrapper used to indicate that something has been redacted
 */
export interface Anonymized<T> {
  value: T
}
export function Anonymized<T>(value: T): Anonymized<T> {
  return { value }
}

export interface DeliverableEmail {
  to: string
  subject: URL
  email: Email
  site: R3plySignetConfig
  from: {
    pseudonym: Anonymized<string>
    token: Encrypted<string>
  }
}

export async function deliverable(
  accepted: AcceptedEmail,
  {
    sites,
    comments_config,
    email_comments_config,
    anonymize,
    encrypt,
    // metadata isn't used in the library but is exposed at the API level for consuming applications to use
    metadata,
  }: {
    sites: R3plySignetConfig[]
    comments_config: R3plyCommentsConfig
    email_comments_config: R3plyEmailCommentsConfig
    anonymize: AnonymizeEmail
    encrypt: EncryptEmail
    metadata: CommentMetadata
  },
): Promise<DeliverableEmail> {
  // check `To` has address, and is addressed properly (to this site + r3ply pair, i.e. <YOUR_SITE>@<R3PLY>)
  const site = to_field_is_deliverable(accepted.to, sites)
  // check `Subject` header of comment is deliverable
  const subject = subject_resolves_to_valid_url(
    Option(accepted.subject).expect('Subject is required for email comments'),
    new URL('https://' + site.domain),
  )
  comment_path_is_allowed_by_config(subject, comments_config['paths*'])
  // check `From` is not on site's `block_list`
  const redact = (email_address: string) =>
    anonymize(email_address, site.domain, site.r3ply, site.signet, site.issued)
  const { pseudonym, token } = await from_field_is_deliverable(
    accepted.from,
    redact,
    email_comments_config['block*'],
    encrypt,
  )

  return {
    to: site.to,
    subject,
    email: accepted.email,
    site,
    from: { pseudonym, token },
  }
}

/**
 * @description for the `To` field to be deliverable it must have exactly one deliverable address (additional non-deliverable addresses are ok)
 * @param to a list of addresses the email is addressed to (in address includes name and email address)
 * @param site_to_domain_mappings the domains the site config accepts emails at
 * @param system_domains the systems the site config accepts emails from
 * @returns the relevant `To` field (only the email address) and it ignores the others
 */
function to_field_is_deliverable(
  to: Addr[],
  site_to_r3ply_mappings: R3plySignetConfig[],
): R3plySignetConfig & { to: string } {
  const valid_possible_to_headers = site_to_r3ply_mappings.map((site) => {
    return {
      to: `${site.domain}@${site.r3ply}`,
      ...site,
    }
  })
  let matches = to.filter((to) => {
    if (to.address) {
      if (valid_possible_to_headers.map((h) => h.to).includes(to.address))
        return true
      else return false
    } else return false
  })
  if (matches.length != 1) {
    const to_addresses = valid_possible_to_headers.map((site) => site.to)
    throw new Error(
      `Comment is undeliverable, \`To\`: \`${JSON.stringify(to)}\` did not match exactly one valid address from: ${JSON.stringify(to_addresses)}`,
    )
  } else {
    const [m] = matches
    const result = valid_possible_to_headers.find((h) => h.to == m.address)!
    return result
  }
}
namespace to_field_is_deliverable {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    describe('to_field_is_deliverable', () => {
      const prod_domain = 'example.com'
      const test_domain = 'test.example.com'
      const prod_r3ply = 'r3ply.com'
      const test_r3ply = 'test.r3ply.com'
      const signet_list = [
        {
          domain: prod_domain,
          r3ply: prod_r3ply,
          signet: 'a'.repeat(22),
          issued: '2025-08-22',
        },
        {
          domain: test_domain,
          r3ply: test_r3ply,
          signet: 'b'.repeat(22),
          issued: '2025-08-22',
        },
      ]
      const c: Addr = { address: `c.com@r3ply.com`, name: null }
      test('Empty to address list is undeliverable', () => {
        expect(() => to_field_is_deliverable([], signet_list)).throws(
          /Comment is undeliverable/,
        )
      })
      test('To address that matches what is configured is deliverable', () => {
        const actual = to_field_is_deliverable(
          [{ address: `${prod_domain}@${prod_r3ply}`, name: null }],
          signet_list,
        )
        expect(actual.domain).toBe(prod_domain)
        expect(actual.r3ply).toBe(prod_r3ply)
      })
      test('To address that does not match what is configured is undeliverable', () => {
        const actual = () =>
          to_field_is_deliverable(
            [{ address: `${prod_domain}@${test_r3ply}`, name: null }],
            signet_list,
          )
        expect(actual).throws(/Comment is undeliverable/)
      })
      test('To address list with at least one matching configuration is deliverable', () => {
        const actual = to_field_is_deliverable(
          [`${test_domain}@${test_r3ply}`, 'unrelated.com@ignore.com'].map(
            (address) => ({ address, name: null }),
          ),
          signet_list,
        )
        expect(actual.domain).toBe(test_domain)
        expect(actual.r3ply).toBe(test_r3ply)
      })
      test('To address list with no matching configuration is undeliverable', () => {
        const actual = () =>
          to_field_is_deliverable(
            [`a.com@b.com`, 'unrelated.com@ignore.com'].map((address) => ({
              address,
              name: null,
            })),
            signet_list,
          )
        expect(actual).throws(/Comment is undeliverable/)
      })
      test('To address list matching multiple configured domains is undeliverable', () => {
        const actual = () =>
          to_field_is_deliverable(
            [
              `${prod_domain}@${prod_r3ply}`,
              `${test_domain}@${test_r3ply}`,
            ].map((address) => ({ address, name: null })),
            signet_list,
          )
        expect(actual).throws(/Comment is undeliverable/)
      })
    })
  }
}

/**
 * @description If the subject parses as a fully qualified URL then its hostname MUST match the site's configured hostname. Otherwise, it will interpreted as a path.
 * @param subject The email comment's "subject" which must be either a URL or URL path
 * @param site_domain The site's configured domain
 * @returns a new URL resolving the subject as a path or URL, and the site's configured domain
 */
function subject_resolves_to_valid_url(subject: string, site_domain: URL) {
  const subject_is_complete_url = Result.safe(() => new URL(subject))
  if (subject_is_complete_url.isOk()) {
    const subject_url = subject_is_complete_url.unwrap()
    if (subject_url.hostname != site_domain.hostname)
      throw new Error(
        `URL in subject "${subject_url.toString()}" did not match site's hostname "${site_domain.hostname}"`,
      )
    else return subject_url
  } else {
    return new URL(subject, site_domain)
  }
}
namespace subject_resolves_to_valid_url {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    describe('subject_resolves_to_valid_url', () => {
      test('Subject line as URL must match site domain to be deliverable', () => {
        const actual = () =>
          subject_resolves_to_valid_url(
            'https://a.com/blog/post123',
            new URL('https://example.com'),
          )
        expect(actual).throws(/URL in subject .* did not match site's hostname/)
      })
      test('Subject line as URL that matches site domain is deliverable', () => {
        const actual = subject_resolves_to_valid_url(
          'https://example.com/blog/post123',
          new URL('https://example.com'),
        )
        expect(actual).toStrictEqual(
          new URL('https://example.com/blog/post123'),
        )
      })
      test('Subject line as path is deliverable to site domain', () => {
        const actual = subject_resolves_to_valid_url(
          'blog/post123',
          new URL('https://example.com'),
        )
        expect(actual).toStrictEqual(
          new URL('https://example.com/blog/post123'),
        )
      })
      test('Subject line as URL without protocol is treated as path', () => {
        const actual = subject_resolves_to_valid_url(
          'a.com/blog/post123',
          new URL('https://example.com'),
        )
        expect(actual).toStrictEqual(
          new URL('https://example.com/a.com/blog/post123'),
        )
      })
      test('Subject line is URL encoded', () => {
        const actual = subject_resolves_to_valid_url(
          'a b c',
          new URL('https://example.com'),
        )
        expect(actual).toStrictEqual(new URL('https://example.com/a%20b%20c'))
      })
      test('Subject line accepts relative paths', () => {
        const actual = subject_resolves_to_valid_url(
          '/a/b/../b2/c/../../b3',
          new URL('https://example.com'),
        )
        expect(actual).toStrictEqual(new URL('https://example.com/a/b3'))
      })
      test('Subject line accepts fragments (anchor links)', () => {
        const actual = subject_resolves_to_valid_url(
          '/a/b#comment123',
          new URL('https://example.com'),
        )
        expect(actual).toStrictEqual(
          new URL('https://example.com/a/b#comment123'),
        )
      })
      test('Subject line accepts text fragments', () => {
        const actual = subject_resolves_to_valid_url(
          '/a/#:~:text=Hey%2C-,thank%20you,-so%20much',
          new URL('https://example.com'),
        )
        expect(actual).toStrictEqual(
          new URL(
            'https://example.com/a/#:~:text=Hey%2C-,thank%20you,-so%20much',
          ),
        )
      })
    })
  }
}

function comment_path_is_allowed_by_config(
  subject: URL,
  path_globs?: string[],
) {
  if (path_globs) {
    const matches = micromatch([subject.pathname], path_globs)
    if (matches.length == 0)
      throw new Error(
        `Comment at path "${subject.pathname}" forbidden by configured path globs "${JSON.stringify(path_globs, null, 2)}"`,
      )
  }
}
if (import.meta.vitest) {
  const { describe, test, expect } = import.meta.vitest
  describe('comment_path_is_allowed_by_config', () => {
    test("No 'path*' configured should allow comments at any path", () => {
      const actual = () =>
        comment_path_is_allowed_by_config(
          new URL('https://example.com/blog/post123'),
        )
      expect(actual).not.toThrow()
    })
    test('Empty path should forbid comments at any path', () => {
      const actual = () =>
        comment_path_is_allowed_by_config(
          new URL('https://example.com/blog/post123'),
          [],
        )
      expect(actual).toThrowError(
        /Comment at path .* forbidden by configured path globs \"\[\]\"/,
      )
    })
    test('No error should be thrown for comments at matching configured paths', () => {
      const actual = () =>
        comment_path_is_allowed_by_config(
          new URL('https://example.com/blog/post123'),
          ['/blog/*'],
        )
      expect(actual).not.toThrow()
    })
    test('Path globs should be able to exclude a single path', () => {
      const ok = () =>
        comment_path_is_allowed_by_config(
          new URL('https://example.com/blog/post123'),
          ['**', '!/'],
        )
      expect(ok).not.toThrow()
      const bad = () =>
        comment_path_is_allowed_by_config(new URL('https://example.com/'), [
          '**',
          '!/',
        ])
      expect(bad).toThrow(
        /Comment at path .* forbidden by configured path globs .* \"!\/\"/s,
      )
    })
  })
}

/**
 * @description for the `From` field to be deliverable it must not match with the site's configured block_list
 * @param from_secret the from field, wrapped in a `Secret` type
 * @param anonymize a function that's used to obscure the secret, e.g. a hash function or an hmac
 * @param block_list a list of strings that can be patterns
 * @returns the `From` field but redacted
 */
async function from_field_is_deliverable(
  from_secret: Secret<string>,
  anonymize: (email_address: string) => Promise<string>,
  block_list: string[],
  encrypt: EncryptEmail,
): Promise<{ pseudonym: Anonymized<string>; token: Encrypted<string> }> {
  const pseudonym = Anonymized(
    (await Result.safe(anonymize(from_secret.value)))
      .mapErr((err) => {
        throw new Error(
          `Error anonymizing comment author. Underlying reason: \n\n\`\`\`\n${err.message}\n\`\`\`\n`,
        )
      })
      .expect('Error redacting `From` header.'),
  )

  const author_on_site_block_list = micromatch(
    [from_secret.value, pseudonym.value],
    block_list,
  )
  if (author_on_site_block_list.length > 0)
    throw new Error(
      `Comment author was on block_list, matches: ${JSON.stringify(author_on_site_block_list, null, 2)}`,
    )
  const token = Encrypted(await encrypt(from_secret.value))
  return { pseudonym, token }
}
namespace from_field_is_deliverable {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    describe('from_field_is_deliverable', () => {
      test('Empty block list is always deliverable', async () => {
        await expect(
          from_field_is_deliverable(
            Secret('bob@example.com'),
            (input: string) => Promise.resolve(input),
            [],
            (input: string) => Promise.resolve(input),
          ),
        ).resolves.toStrictEqual({
          pseudonym: {
            value: 'bob@example.com',
          },
          token: {
            value: 'bob@example.com',
          },
        })
      })
      test('Non-empty block list is still deliverable if "From" doesn\'t match', async () => {
        await expect(
          from_field_is_deliverable(
            Secret('bob@example.com'),
            (input: string) => Promise.resolve(input),
            ['alice@example.com'],
            (input: string) => Promise.resolve(input),
          ),
        ).resolves.toStrictEqual({
          pseudonym: {
            value: 'bob@example.com',
          },
          token: {
            value: 'bob@example.com',
          },
        })
      })
      test('Clear text email is checked against blocklist', async () => {
        await expect(
          from_field_is_deliverable(
            Secret('bob@example.com'),
            (input: string) => Promise.resolve(input),
            ['bob@example.com'],
            (input: string) => Promise.resolve(input),
          ),
        ).rejects.toThrowError(
          /Comment author was on block_list, matches: \[\s*"bob@example.com"\s*\]/,
        )
      })
      test('Anonymized email is checked against blocklist', async () => {
        await expect(
          from_field_is_deliverable(
            Secret('bob@example.com'),
            (input: string) => Promise.resolve('ABC123DEF456XYZ789'),
            ['ABC123DEF456XYZ789'],
            (input: string) => Promise.resolve(input),
          ),
        ).rejects.toThrowError(
          /Comment author was on block_list, matches: \[\s*"ABC123DEF456XYZ789"\s*\]/,
        )
      })
      test('Blocklist utilizes glob patterns', async () => {
        await expect(
          from_field_is_deliverable(
            Secret('mallory@evil.com'),
            (input: string) => Promise.resolve('ABC123DEF456XYZ789'),
            ['*@evil.com'],
            (input: string) => Promise.resolve(input),
          ),
        ).rejects.toThrowError(
          /Comment author was on block_list, matches: \[\s*"mallory@evil.com"\s*\]/,
        )
      })
      test('Anonymized and encrypted versions of cleartext email are returned', async () => {
        await expect(
          from_field_is_deliverable(
            Secret('bob@example.com'),
            (input: string) => Promise.resolve('ABC123DEF456XYZ789'),
            ['*@evil.com'],
            (input: string) => Promise.resolve('bob@example.com^abc'),
          ),
        ).resolves.toStrictEqual({
          pseudonym: {
            value: 'ABC123DEF456XYZ789',
          },
          token: {
            value: 'bob@example.com^abc',
          },
        })
      })
    })
  }
}
