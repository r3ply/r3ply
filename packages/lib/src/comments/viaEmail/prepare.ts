import { Message as Email } from '@mail-parser/ts-bindings'
import { get_auth_results, get_body_txt, get_date, get_subject } from './email'
import { match, Result } from 'oxide.ts'
import { R3plySiteConfig, R3plySystemConfig } from '@r3ply/schema/config'
import {
  R3plyCommentsConfig,
  R3plyEmailCommentsConfig,
} from '@r3ply/schema/config/comments'
import { DeliverableEmail } from './deliverable'
import { CommentTemplateContext } from '../process'
import { md_to_html, sanitize_html } from '@r3ply/wasm'
import { CommentMetadata } from '../receive'

/**
 * This adds context for comments received via email
 */
export interface EmailTemplateContext {
  email: {
    to: string
    subject: string
    date: string
    text: string
    auth: {
      dkim: boolean
      spf: boolean
      dmarc: boolean
      pass: boolean
    }
    from: {
      pseudonym: string
      signet: string
      issued: string
      token: string
    }
  }
}

/**
 * @description prepares the comment data to be processed
 * @param receive A function that "receives" an email, usually you will create a closure
 * @param email_bytes The email as an array of bytes
 * @param redact_from Another closure that takes a string and returns a redacted version
 * @param config the site config the email is addressed to
 * @returns comment data
 */
export async function prepare(
  deliverable: DeliverableEmail,
  {
    metadata,
    config,
    comments_config,
    email_comments_config,
    system,
  }: {
    metadata: CommentMetadata
    config: R3plySiteConfig
    comments_config: R3plyCommentsConfig
    email_comments_config: R3plyEmailCommentsConfig
    system: R3plySystemConfig
  },
): Promise<CommentTemplateContext & EmailTemplateContext> {
  // get values from receive
  let { comment_id, ts_rcvd } = metadata

  // parse email from its raw bytes
  let data = match(
    Result.safe(() => get_remaining_email_data(deliverable.email)),
    {
      Ok: (data) => data,
      Err: (error) => {
        console.error(
          `Error during \`get_email_data()\`, name: ${error.name}, message: ${error.message}`,
        )
        throw error
      },
    },
  )

  // Separate body from email signature
  data.email_body_txt = match(
    Result.safe(
      () =>
        data.email_body_txt.split(
          email_comments_config.email_signature_separator,
        )[0],
    ),
    {
      Ok: (email_body_txt) => email_body_txt,
      Err: (error) => {
        console.error(
          `Error while trying to separate email body from signature. Message:\n\n${error.message}\n\nEmail body:\n\n${data.email_body_txt}\n\nSeparator: "${email_comments_config.email_signature_separator}"`,
        )
        throw new Error('Error separting email body from signature.')
      },
    },
  )

  // Extract md -> html if enabled
  let body_md = comments_config.md_to_html
    ? md_to_html(data.email_body_txt)
    : undefined

  // Extract html -> sanitized_html if enabled
  let body_html: string | undefined
  if (comments_config.sanitize_html) {
    if (body_md) {
      body_html = sanitize_html(body_md, comments_config.allow_tags)
    } else {
      body_html = sanitize_html(data.email_body_txt, comments_config.allow_tags)
    }
  }

  let template_context: CommentTemplateContext & EmailTemplateContext = {
    r3ply: {
      config_version: config.version,
      server: deliverable.site.r3ply,
      site: deliverable.site.domain,
      signet: deliverable.site.signet,
      issued: deliverable.site.issued,
    },
    author: {
      pseudonym: deliverable.from.pseudonym.value,
      token: deliverable.from.token.value,
    },
    comment: {
      id: comment_id,
      ts_rcvd: ts_rcvd.toString(),
      subject: {
        url: deliverable.subject.href,
        origin: deliverable.subject.origin,
        protocol: deliverable.subject.protocol,
        hostname: deliverable.subject.hostname,
        path: deliverable.subject.pathname,
        queryParams:
          deliverable.subject.search == ''
            ? undefined
            : deliverable.subject.search,
        fragment:
          deliverable.subject.hash == '' ? undefined : deliverable.subject.hash,
      },
      txt: data.email_body_txt,
      md: body_md,
      html: body_html,
    },
    email: {
      to: deliverable.to,
      subject: get_subject(deliverable.email) || '',
      date: data.date.rfc3339,
      text: data.email_body_txt,
      auth: {
        dkim: data.auth_results.dkim_pass,
        spf: data.auth_results.spf_pass,
        dmarc: data.auth_results.dmarc_pass,
        pass:
          data.auth_results.dkim_pass &&
          data.auth_results.spf_pass &&
          data.auth_results.dmarc_pass,
      },
      from: {
        pseudonym: deliverable.from.pseudonym.value,
        signet: config.site.find((s) => s.domain == deliverable.site.domain)!
          .signet,
        issued: config.site.find((s) => s.domain == deliverable.site.domain)!
          .issued,
        token: deliverable.from.token.value,
      },
    },
  }

  return template_context
}

/**
 * @description This just gets reamining fields that are required for creating the templating context
 * @param email the parsed email
 * @throws errors on invalid emails, see underlying functions for specifics
 */
function get_remaining_email_data(email: Email) {
  let date = get_date(email)
  let auth_results = get_auth_results(email)
  let email_body_txt = get_body_txt(email)
  return { date, auth_results, email_body_txt }
}
