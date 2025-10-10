import { R3ply, comments, util } from '@r3ply/lib'
import { R3plySiteConfig, R3plySystemConfig } from '@r3ply/schema/config'
import { CommentState } from './state/d1'
import { GistClient, GistFiles } from './state/gist'
import { Result } from 'oxide.ts'
import mime from 'mime'

interface CloudflareR3ply extends R3ply {}
export function CloudflareR3ply(system_config: R3plySystemConfig) {
  return function dependencies(
    r3ply_gist_client: GistClient,
    comment_state?: CommentState,
  ): CloudflareR3ply {
    function email_handler(anonymize_key: string, encrypt_key: string) {
      // pass keys to functions immediately to minimize accidentally logging
      const anonymize: comments.email.AnonymizeEmail =
        Anonymize.hmac(anonymize_key)
      const encrypt_email: EncryptEmail = Encrypt.email(encrypt_key)

      const handle_email_event: (
        email_event: [recipient: R3plySiteConfig, bytes: Uint8Array],
      ) => Promise<EmailEventResponse> = async ([site_config, email_bytes]) => {
        const prescreening = prescreen(
          { email_size_bytes: email_bytes.byteLength },
          site_config,
          system_config,
        )
        const { metadata, accepted_email } = await cf_accept(
          email_bytes,
          r3ply_gist_client,
          comment_state,
        )
        const deliverable_email = (
          await cf_deliverable(accepted_email, {
            anonymize,
            encrypt_email,
            metadata,
            site_config,
            system_config,
            comment_state,
          })
        )
          .mapErr((e) => {
            throw e
          })
          .unwrap()
        const template_context = (
          await cf_prepare(
            deliverable_email,
            metadata,
            site_config,
            system_config,
            comment_state,
          )
        )
          .mapErr((e) => {
            throw e
          })
          .unwrap()
        const comment = (
          await cf_process(
            template_context,
            metadata,
            r3ply_gist_client,
            site_config,
            comment_state,
          )
        )
          .mapErr((e) => {
            throw e
          })
          .unwrap()
        if (moderator) {
          const moderation_result = moderator(
            site_config.comments.email.moderation.type,
          )
            .send(
              comment,
              template_context,
              site_config.comments.email.moderation,
            )
            .then((moderation_result) => {
              const result: EmailEventResponse = {
                comment,
                prescreening: prescreening,
                received: {
                  comment_id: metadata.comment_id,
                  ts_rcvd: metadata.ts_rcvd,
                },
                accepted: accepted_email,
                deliverable: deliverable_email,
                prepared: template_context,
                moderation: moderation_result,
              }
              return result
            })
          return moderation_result
        } else {
          const result: EmailEventResponse = {
            comment,
            prescreening: prescreening,
            received: {
              comment_id: metadata.comment_id,
              ts_rcvd: metadata.ts_rcvd,
            },
            accepted: accepted_email,
            deliverable: deliverable_email,
            prepared: template_context,
          }
          return result
        }
      }
      return handle_email_event
    }
    return {
      comments: {
        viaEmail: email_handler,
      },
    }
  }
}

export async function cf_accept(
  email_bytes: Uint8Array,
  r3ply_gist_client: GistClient,
  comment_state?: CommentState,
) {
  const accepted_email = accept(email_bytes)
  const accepted_files: GistFiles = {
    [accepted_email.messageId + '.eml']: {
      content: new TextDecoder('utf-8').decode(email_bytes),
    },
  }
  const accepted_gist_result = r3ply_gist_client.create_gist(
    accepted_files,
    `comment via email from: ${accepted_email.from.value}, to:${JSON.stringify(accepted_email.to.map((to) => `${to.name} <${to.address}>`))}`,
  )
  const metadata = accepted_gist_result.then((accepted_gist_result) => {
    if (comment_state) {
      return comment_state.viaEmail
        .accepted(accepted_email.messageId, accepted_gist_result.into())
        .then((d1_rep) => d1_rep.results[0])
    } else {
      const metadata: CommentMetadata & {
        gist_id: string | null
        gist_url: string | null
      } = {
        comment_id: crypto.randomUUID(),
        ts_rcvd: Math.floor(Date.now() / 1000).toString(),
        gist_id: accepted_gist_result.into()?.id ?? null,
        gist_url: accepted_gist_result.into()?.url ?? null,
      }
      return metadata
    }
  })
  return metadata.then((metadata) => {
    return { metadata, accepted_email }
  })
}

export async function cf_deliverable(
  accepted_email: AcceptedEmail,
  {
    anonymize,
    encrypt_email,
    metadata,
    site_config,
    system_config,
    comment_state,
  }: {
    anonymize: AnonymizeEmail
    encrypt_email: EncryptEmail
    metadata: CommentMetadata
    site_config: R3plySiteConfig
    system_config: R3plySystemConfig
    comment_state?: CommentState
  },
) {
  const deliverable_email = Result.safe(
    deliverable(accepted_email, {
      config: site_config,
      system: system_config,
      anonymize,
      encrypt: encrypt_email,
    }),
  )
  if (comment_state) {
    return deliverable_email.then((deliverable_email) => {
      return comment_state.viaEmail
        .deliverable(
          metadata.comment_id,
          deliverable_email.isOk() ? 'deliverable' : 'undeliverable',
        )
        .then((_) => deliverable_email)
    })
  } else {
    return deliverable_email
  }
}

export function cf_prepare(
  deliverable_email: DeliverableEmail,
  metadata: CommentMetadata,
  site_config: R3plySiteConfig,
  system_config: R3plySystemConfig,
  comment_state?: CommentState,
) {
  const template_context = Result.safe(() =>
    prepare(deliverable_email, metadata, site_config, system_config),
  )
  if (comment_state) {
    return comment_state.viaEmail
      .prepared(
        metadata.comment_id,
        template_context.isOk() ? 'prepared' : 'unpreparable',
      )
      .then((_) => template_context)
  } else return template_context
}

export async function cf_process(
  template_context: CommentTemplateContext,
  metadata: CommentMetadata & {
    gist_id: string | null
    gist_url: string | null
  },
  r3ply_gist_client: GistClient,
  site_config: R3plySiteConfig,
  comment_state?: CommentState,
) {
  const comment = Result.safe(() =>
    process(
      template_context,
      site_config,
      site_config.comments.email['comment_{}'],
    ),
  )
  if (metadata.gist_id !== null) {
    let comment_file: { [key: string]: { content: string } }
    if (comment.isOk()) {
      comment_file = {
        [`comment.${mime.getExtension(site_config.comments.email['comment_{}_mime'])}`]:
          { content: comment.unwrap() },
      }
    } else {
      comment_file = {
        'comment.error.txt': { content: comment.unwrapErr().message },
      }
    }
    const update_gist_with_comment_files: GistFiles = {
      'comment.context.json': {
        content: JSON.stringify(template_context, null, 2),
      },
      ...comment_file,
    }
    r3ply_gist_client
      .update_gist(metadata.gist_id, update_gist_with_comment_files)
      .then((update_gist) => {
        if (update_gist.isErr())
          console.error(
            `gist failed to update, although it succeeded in initial creation! More details: ${metadata.gist_url ?? 'no URL!'}`,
          )
      })
  }
  if (comment_state) {
    return comment_state.viaEmail
      .processed(
        metadata.comment_id,
        comment.isOk() ? 'processed' : 'unprocessable',
      )
      .then((_) => {
        // cache the comment if it's enabled in their configuration
        if (site_config.comments.cache) {
          const [domain, path, comment_id, comment] = [
            template_context.r3ply.site,
            template_context.comment.subject.path,
            template_context.comment.id,
            JSON.stringify(template_context),
          ]
          comment_state.cache.set(domain, path, comment_id, comment)
        }
      })
      .then((_) => comment)
  } else return comment
}

/**
 * A function used to created a "file_resolver" for r3ply that takes a base URL (in practice usually the location of the site's r3ply config) and uses that to resolve file references in the config.
 * @param base the domain + path from which to base the file resolution from (usually starting from the directory of the domain's r3ply config)
 * @returns an async function that accepts a file_uri and will resolve the file relative to `base`, and return either the file's contents (if 200 OK) or undefined
 * @example (assuming base URL: https://example.com/.well-known/r3ply/config.toml)
 *
 * relative reference: e.g.
 * file.txt -> https://example.com/.well-known/r3ply/file.txt
 * absolute reference: e.g. /file.txt -> https://example.com/file.txt
 * relative dotted reference: e.g. ../file.txt -> https://example.com/.well-known/file.txt
 * relative reference exceeding site root: e.g. ../../../../file.txt -> https://example.com/file.txt
 * absolute reference from another domain: e.g. https://mallory.com/file.txt -> https://example.com/file.txt
 * absolute reference from another domain, with another absolute reference as the path: e.g. https://mallory.com/https://bad.com/file.txt -> https://example.com/https://bad.com/file.txt
 *
 */
function resolve_file_from_domain(base: URL) {
  return async function (file_uri?: string): Promise<string | undefined> {
    if (file_uri) {
      // used to normalize the filepath, in case a fully qualified URI is given (in which case the URL would override the base)
      const file_uri_as_url = new URL(file_uri, 'https://example.com')
      const file_response = fetch(
        new URL('./' + file_uri_as_url.pathname, base),
      )
      return file_response.then((file_response) => {
        if (file_response.ok) {
          return file_response.text()
        } else {
          return undefined
        }
      })
    } else return Promise.resolve(undefined)
  }
}

export const resolve_config_references_at_domain: util.config.DerferenceFile =
  async (
    base_uri: string,
    file_uri_ref?: string,
  ): Promise<string | undefined> => {
    return resolve_file_from_domain(new URL(base_uri))(file_uri_ref)
  }
