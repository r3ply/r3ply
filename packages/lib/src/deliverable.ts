import { match, Option, Result } from 'oxide.ts'
import { Redacted } from './types'
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
}

export async function deliverable(
  accepted: AcceptedEmail,
  redact: (input: string) => Promise<string>,
  site: R3plySiteConfig,
  system: R3plySystemConfig,
): Promise<DeliverableEmail> {
  // check `To` has address, and is addressed properly (to this site + r3ply pair, i.e. <YOUR_SITE>@<R3PLY>)
  const to = to_field_is_deliverable(accepted.to, site.domains, system.domain)

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

  // check `From` is not on site's `block_list`
  const from = Redacted(
    (await Result.safe(redact(accepted.from.value)))
      .mapErr((err) => {
        throw new Error(
          `Error redacting comment author. Underlying reason: \n\n\`\`\`\n${err.message}\n\`\`\`\n`,
        )
      })
      .expect('Error redacting `From` header.'),
  )
  const author_on_site_block_list = micromatch(
    [accepted.from.value, from.value],
    site.comments.email.block_list,
  )
  if (author_on_site_block_list.length > 0)
    throw new Error(
      `Comment author was on block_list, matches: ${author_on_site_block_list}`,
    )

  return { from, to, subject, email: accepted.email }
}

/**
 * @description for the `To` field to be deliverable it must have exactly one deliverable address (additional non-deliverable addresses are ok)
 * @param to a list of addresses the email is addressed to (in address includes name and email address)
 * @param site_domains the domains the site config accepts emails at
 * @param system_domain the systems the site config accepts emails from
 * @returns the relevant `To` field (only the email address) and it ignores the others
 */
function to_field_is_deliverable(
  to: Addr[],
  site_domains: string[],
  system_domain: string,
) {
  return match(
    Result.safe(() =>
      Util.unique_addr(
        to,
        site_domains.map((site_domain) => `${site_domain}@${system_domain}`),
      ),
    ),
    {
      Ok: (to) => to.address,
      Err: (error) => {
        throw new Error(
          `Comment is underliverable, \`To\`: \`${JSON.stringify(site_domains)}\``,
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

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('to_field_is_deliverable', () => {
    const site_domains = ['a.com', 'hello.com']
    const system_domain = 'r3ply.com'
    const a: Addr = { address: `a.com@${system_domain}`, name: null }
    const hello: Addr = { address: `hello.com@${system_domain}`, name: null }
    const c: Addr = { address: `c.com@${system_domain}`, name: null }
    expect(
      to_field_is_deliverable(
        [a, { address: 'unrelated.com', name: null }],
        site_domains,
        system_domain,
      ),
    ).toBe('a.com@r3ply.com')
    expect(to_field_is_deliverable([hello], site_domains, system_domain)).toBe(
      'hello.com@r3ply.com',
    )
    expect(() =>
      to_field_is_deliverable([a, hello], site_domains, system_domain),
    ).toThrowError(/Comment is underliverable/)
    expect(() =>
      to_field_is_deliverable([c], site_domains, system_domain),
    ).toThrowError(/Comment is underliverable/)
    expect(() =>
      to_field_is_deliverable([a], site_domains, 'notr3ply.com'),
    ).toThrowError(/Comment is underliverable/)
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
}
