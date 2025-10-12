import { Option, Result } from 'oxide.ts'
import { Encrypted, Redacted as Anonymized, Secret } from './types'
import { R3plySignetConfig } from '@r3ply/schema/config'
import {
  R3plyCommentsConfig,
  R3plyEmailCommentsConfig,
} from '@r3ply/schema/config/comments'
import micromatch from 'micromatch'
import { Addr, Message as Email } from '@mail-parser/ts-bindings'
import { AcceptedEmail } from './accept'
import { AnonymizeEmail } from './signet'
import { EncryptEmail } from './crypto'
import { CommentMetadata } from '../receive'

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
  }: {
    sites: R3plySignetConfig[]
    comments_config: R3plyCommentsConfig
    email_comments_config: R3plyEmailCommentsConfig
    anonymize: AnonymizeEmail
    encrypt: EncryptEmail
  },
  metadata: CommentMetadata,
): Promise<DeliverableEmail> {
  // check `To` has address, and is addressed properly (to this site + r3ply pair, i.e. <YOUR_SITE>@<R3PLY>)
  const site = to_field_is_deliverable(accepted.to, sites)

  // check `Subject` header of comment is deliverable (note: if future subject types b are added, here is where to integrate that logic)
  const subject = subject_resolves_to_valid_url(
    Option(accepted.subject).expect('Subject is required for email comments'),
    new URL('https://' + site.domain),
  )

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
 * subject as url is deliverable
 *
 * @description for the `Subject` field to be deliverable it must be a URL, whose hostname is the same as one of the site's configured domains, with a path the site accepts comments at
 *
 * @param subject_str the email's subject field
 * @param site_domains the domains the site config accepts emails at
 * @param site_comment_paths the paths the site config accepts comments at
 * @returns
 */
function url_subject_field_is_deliverable(
  subject_str: string,
  site_domain: string,
  site_comment_paths: string[],
) {
  const subject = Result.safe(() => new URL(subject_str)).expect(
    `config.comments.email.subject == "url" requires subject parses as a URL`,
  )

  // check subject has same hostname is inclued in `site.domains`, as well as pathname as `site.comments.paths`
  if (site_domain != subject.hostname)
    throw new Error(
      `Site domain '${site_domain}' differs from intended recipient '${subject.hostname}'. The local portion of the email must match the configured domain.`,
    )
  const subject_matches_configured_paths = micromatch(
    [subject.pathname],
    site_comment_paths,
  )
  if (subject_matches_configured_paths.length == 0)
    throw new Error(
      `Site is not configured to accept comments at path '${subject.pathname}'`,
    )

  return subject
}

function path_subject_field_is_deliverable(
  subject_str: string,
  site_domain: string,
  site_comment_paths: string[],
) {
  const base_url = new URL('https://example.com')
  base_url.hostname = site_domain
  const url = new URL(subject_str, base_url)
  if (url.hostname != site_domain)
    throw new Error(`${site_domain} could not be assigned as a hostname`)
  return url_subject_field_is_deliverable(
    url.toString(),
    site_domain,
    site_comment_paths,
  )
}

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

/**
 * The subject's domain must match the site's domain
 * @param subject the URL object of the subject
 * @param site_domain the URL object of the site's domain (i.e. local part of `To` email header)
 */
function subject_domain_matches_site_domain(subject: URL, site_domain: string) {
  const url = new URL('https://example.com')
  url.host = site_domain
  if (subject.host != url.host)
    throw new Error(
      `Local part of \`To\` header must be same domain as \`Subject\` header (${subject.host} doesn't match ${url.host})`,
    )
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
      `Comment author was on block_list, matches: ${author_on_site_block_list}`,
    )
  const token = Encrypted(await encrypt(from_secret.value))
  return { pseudonym, token }
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('subject_is_a_url', () => {
    expect(
      url_subject_field_is_deliverable('https://a.com', 'a.com', ['/']),
    ).toStrictEqual(new URL('https://a.com'))
    expect(() =>
      url_subject_field_is_deliverable('https://a.com', 'b.com', ['/']),
    ).toThrowError(/differs from intended recipient/)
    expect(() =>
      url_subject_field_is_deliverable('https://a.com', 'a.com', ['/blog']),
    ).toThrowError(/not configured to accept comments at path/)
  })
  test('subject_is_a_path', () => {
    expect(
      path_subject_field_is_deliverable('/example/blog', 'example.com', ['**']),
    ).toStrictEqual(new URL('https://example.com/example/blog'))
    expect(
      path_subject_field_is_deliverable('../example/blog', 'example.com', [
        '**',
      ]),
    ).toStrictEqual(new URL('https://example.com/example/blog'))
    expect(
      path_subject_field_is_deliverable(
        'https://evil.com/example/blog',
        'example.com',
        ['**'],
      ),
    ).toStrictEqual(
      new URL('https://example.com/https://evil.com/example/blog'),
    )
    expect(
      path_subject_field_is_deliverable('hello world', 'example.com', ['**']),
    ).toStrictEqual(new URL('https://example.com/hello%20world'))
  })
  test('subject_domain_matches_site_domain', () => {
    expect(() =>
      subject_domain_matches_site_domain(new URL('https://a.com'), 'b.com'),
    ).toThrow(/a.com doesn't match b.com/)
    expect(
      subject_domain_matches_site_domain(new URL('https://a.com'), 'a.com'),
    )
  })
  test('from_field_is_deliverable', async () => {
    const from: Secret<string> = Secret('bob@example.com')
    await expect(
      from_field_is_deliverable(
        from,
        (input: string) => Promise.resolve(input),
        [],
        (input: string) => Promise.resolve(input),
      ),
    ).resolves.not.toThrowError()
    await expect(
      from_field_is_deliverable(
        from,
        (input: string) => Promise.resolve(input),
        ['alice@example.com'],
        (input: string) => Promise.resolve(input),
      ),
    ).resolves.not.toThrowError()
    await expect(
      from_field_is_deliverable(
        from,
        (input: string) => Promise.resolve(input),
        ['bob@example.com'],
        (input: string) => Promise.resolve(input),
      ),
    ).rejects.toThrowError(/Comment author was on block_list/)
  })
}
