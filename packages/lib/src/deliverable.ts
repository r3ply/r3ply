import { match, Option, Result } from 'oxide.ts'
import { Redacted, Secret } from './types'
import { R3plySiteConfig, R3plySystemConfig } from '@r3ply/config'
import micromatch from 'micromatch'
import { Addr, Message as Email } from '@mail-parser/ts-bindings'
import { AcceptedEmail } from './accept'
import { Util } from './email'

export interface DeliverableEmail {
  from: Redacted<string>
  to: string
  subject: URL
  email: Email
  site_domain: string
  r3ply_domain: string
}

export async function deliverable(
  accepted: AcceptedEmail,
  redact: (input: string) => Promise<string>,
  site: R3plySiteConfig,
  system: R3plySystemConfig,
): Promise<DeliverableEmail> {
  // check `To` has address, and is addressed properly (to this site + r3ply pair, i.e. <YOUR_SITE>@<R3PLY>)
  const to = to_field_is_deliverable(accepted.to, site.domains, system.domains)
  const [site_domain, r3ply_domain] = to.split('@', 2)

  // check `Subject` header of comment is deliverable (note: if future subject types besides URL are added, here is where to integrate that logic)
  let subject: URL
  if (site.comments.email.subject == 'url') {
    subject = subject_field_is_deliverable(
      Option(accepted.subject).expect(
        `config.comments.email.subject == "url" requires subject`,
      ),
      site.domains,
      site.comments.paths,
    )
  } else {
    throw new Error(
      `Not implemented for config.comments.email.subject == ${site.comments.email.subject}`,
    )
  }

  // check `Subject` header's domain is the same as local portion of to `To` address
  subject_domain_matches_site_domain(subject, site_domain)

  // check `From` is not on site's `block_list`
  const from = await from_field_is_deliverable(
    accepted.from,
    redact,
    site.comments.email.block_list,
  )

  return { from, to, subject, email: accepted.email, site_domain, r3ply_domain }
}

/**
 * @description for the `To` field to be deliverable it must have exactly one deliverable address (additional non-deliverable addresses are ok)
 * @param to a list of addresses the email is addressed to (in address includes name and email address)
 * @param site_domains the domains the site config accepts emails at
 * @param system_domains the systems the site config accepts emails from
 * @returns the relevant `To` field (only the email address) and it ignores the others
 */
function to_field_is_deliverable(
  to: Addr[],
  site_domains: string[],
  system_domains: string[],
) {
  const valid_possible_to_headers = site_domains.flatMap((site_domain) =>
    system_domains.map((system_domain) => `${site_domain}@${system_domain}`),
  )
  return match(
    Result.safe(() => Util.unique_addr(to, valid_possible_to_headers)),
    {
      Ok: (to) => to.address,
      Err: (error) => {
        const to_addresses = to.map((to) => to.address)
        throw new Error(
          `Comment is undeliverable, \`To\`: \`${JSON.stringify(to_addresses)}\` did not match any valid addresses: ${JSON.stringify(valid_possible_to_headers)}`,
        )
      },
    },
  )
}

/**
 * @description for the `Subject` field to be deliverable it must be a URL, whose hostname is the same as one of the site's configured domains, with a path the site accepts comments at
 * @param subject_str the email's subject field
 * @param site_domains the domains the site config accepts emails at
 * @param site_comment_paths the paths the site config accepts comments at
 * @returns
 */
function subject_field_is_deliverable(
  subject_str: string,
  site_domains: string[],
  site_comment_paths: string[],
) {
  const subject = Result.safe(() => new URL(subject_str)).expect(
    `config.comments.email.subject == "url" requires subject parses as a URL`,
  )

  // check subject has same hostname is inclued in `site.domains`, as well as pathname as `site.comments.paths`
  if (!site_domains.includes(subject.hostname))
    throw new Error(
      `Site not configured to accept subjects on domain '${subject.hostname}'`,
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
 * @param redact a function that's used to obscure the secret, e.g. a hash function or an hmac
 * @param block_list a list of strings that can be patterns
 * @returns the `From` field but redacted
 */
async function from_field_is_deliverable(
  from_secret: Secret<string>,
  redact: (input: string) => Promise<string>,
  block_list: string[],
) {
  const from = Redacted(
    (await Result.safe(redact(from_secret.value)))
      .mapErr((err) => {
        throw new Error(
          `Error redacting comment author. Underlying reason: \n\n\`\`\`\n${err.message}\n\`\`\`\n`,
        )
      })
      .expect('Error redacting `From` header.'),
  )
  const author_on_site_block_list = micromatch(
    [from_secret.value, from.value],
    block_list,
  )
  if (author_on_site_block_list.length > 0)
    throw new Error(
      `Comment author was on block_list, matches: ${author_on_site_block_list}`,
    )
  return from
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('to_field_is_deliverable', () => {
    const site_domains = ['a.com', 'test.a.com']
    const system_domains = ['r3ply.com', 'test.r3ply.com']
    const a_at_r3ply: Addr = { address: `a.com@r3ply.com`, name: null }
    const a_at_test_r3ply: Addr = {
      address: `a.com@test.r3ply.com`,
      name: null,
    }
    const test_a_at_r3ply: Addr = {
      address: `test.a.com@r3ply.com`,
      name: null,
    }
    const test_a_at_test_r3ply: Addr = {
      address: `test.a.com@test.r3ply.com`,
      name: null,
    }
    const c: Addr = { address: `c.com@r3ply.com`, name: null }
    expect(
      to_field_is_deliverable(
        [a_at_r3ply, { address: 'unrelated.com', name: null }],
        site_domains,
        system_domains,
      ),
    ).toBe('a.com@r3ply.com')
    expect(
      to_field_is_deliverable(
        [a_at_test_r3ply, { address: 'unrelated.com', name: null }],
        site_domains,
        system_domains,
      ),
    ).toBe('a.com@test.r3ply.com')
    expect(
      to_field_is_deliverable(
        [test_a_at_r3ply, { address: 'unrelated.com', name: null }],
        site_domains,
        system_domains,
      ),
    ).toBe('test.a.com@r3ply.com')
    expect(
      to_field_is_deliverable(
        [test_a_at_test_r3ply, { address: 'unrelated.com', name: null }],
        site_domains,
        system_domains,
      ),
    ).toBe('test.a.com@test.r3ply.com')
    expect(() =>
      to_field_is_deliverable(
        [test_a_at_r3ply, test_a_at_test_r3ply],
        site_domains,
        system_domains,
      ),
    ).toThrowError(/Comment is undeliverable/)
    expect(() =>
      to_field_is_deliverable(
        [test_a_at_r3ply, test_a_at_r3ply],
        site_domains,
        system_domains,
      ),
    ).toThrowError(/Comment is undeliverable/)
    expect(() =>
      to_field_is_deliverable([c], site_domains, system_domains),
    ).toThrowError(/Comment is undeliverable/)
    expect(() =>
      to_field_is_deliverable([a_at_r3ply], site_domains, ['notr3ply.com']),
    ).toThrowError(/Comment is undeliverable/)
  })
  test('subject_is_a_url', () => {
    expect(
      subject_field_is_deliverable('https://a.com', ['a.com', 'b.com'], ['/']),
    ).toStrictEqual(new URL('https://a.com'))
    expect(() =>
      subject_field_is_deliverable('https://a.com', ['b.com'], ['/']),
    ).toThrowError(/not configured to accept subjects on domain/)
    expect(() =>
      subject_field_is_deliverable('https://a.com', ['a.com'], ['/blog']),
    ).toThrowError(/not configured to accept comments at path/)
  })
  test('subject_domain_matches_site_domain', () => {
    expect(() => subject_domain_matches_site_domain(new URL("https://a.com"), "b.com")).toThrow(/a.com doesn't match b.com/)
    expect(subject_domain_matches_site_domain(new URL("https://a.com"), "a.com"))
  })
  test('from_field_is_deliverable', async () => {
    const from: Secret<string> = Secret('bob@example.com')
    await expect(
      from_field_is_deliverable(
        from,
        (input: string) => Promise.resolve(input),
        [],
      ),
    ).resolves.not.toThrowError()
    await expect(
      from_field_is_deliverable(
        from,
        (input: string) => Promise.resolve(input),
        ['alice@example.com'],
      ),
    ).resolves.not.toThrowError()
    await expect(
      from_field_is_deliverable(
        from,
        (input: string) => Promise.resolve(input),
        ['bob@example.com'],
      ),
    ).rejects.toThrowError(/Comment author was on block_list/)
  })
}
