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
}

export async function deliverable(
  accepted: AcceptedEmail,
  redact: (input: string) => Promise<string>,
  site: R3plySiteConfig,
  system: R3plySystemConfig,
): Promise<DeliverableEmail> {
  // check `To` has address, and is addressed properly (to this site + r3ply pair, i.e. <YOUR_SITE>@<R3PLY>)
  let to = match(
    Result.safe(() =>
      Util.unique_addr(accepted.to, `${site.domain}@${system.domain}`),
    ),
    {
      Ok: (to) => to.address,
      Err: (error) => {
        throw new Error(
          `Comment is underliverable, \`To\`: \`${JSON.stringify(accepted.to)}\``,
        )
      },
    },
  )

  // check `Subject` header of comment is deliverable (note: if future subject types besides URL are added, here is where to integrate that logic)
  let subject: URL
  if (site.comments.email.subject == 'url') {
    //  Extract a valid URL from subject (hostname of URL must match `domain` from config)
    let subject_str = Option(accepted.subject).expect(
      `config.comments.email.subject == "url" requires subject`,
    )
    subject = Result.safe(() => new URL(subject_str)).expect(
      `config.comments.email.subject == "url" requires subject parses as a URL`,
    )

    // check subject has same hostname as `site.domain`, as well as pathname as `site.comments.paths`
    if (subject.hostname != site.domain)
      throw new Error(
        `Site can not accept subjects concerning other domains: ${subject.hostname}`,
      )
    const subject_matches_configured_paths = micromatch(
      [subject.pathname],
      site.comments.paths,
    )
    if (subject_matches_configured_paths.length == 0)
      throw new Error(
        `Site is not configured to accept comments at path: '${subject.pathname}'`,
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
