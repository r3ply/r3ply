import {
  R3ply,
  process,
  CommentTemplateContext,
  receive,
  accept,
  AcceptedEmail,
  deliverable,
  DeliverableEmail,
  CommentMetadata,
  prepare,
  prescreen,
  Moderation,
} from '@r3ply/lib'
import { R3plySiteConfig, R3plySystemConfig } from '@r3ply/config'
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
    function email_handler(
      redact: (input: string) => Promise<string>,
      moderator?: Moderation,
    ) {
      const handle_email_event: (
        email_event: [recipient: R3plySiteConfig, bytes: Uint8Array],
      ) => Promise<string> = async ([site_config, email_bytes]) => {
        prescreen(
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
          await cf_deliverable(
            accepted_email,
            metadata,
            redact,
            site_config,
            system_config,
            comment_state,
          )
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
          const moderation_reuslt = moderator?.send(
            comment,
            template_context,
            site_config,
          ) as any as Promise<Response>
          return moderation_reuslt.then((moderation_result) => {
            if (!moderation_result.ok) {
              return moderation_result.text().then((error_text) => {
                console.error(
                  `Error sending comment for moderation, details:\n\n> ${error_text.split('\n').join('\n> ')}`,
                )
                return comment
              })
            } else {
              return comment
            }
          })
        } else return comment
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
        .accept(accepted_email.messageId, accepted_gist_result.into())
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
  metadata: CommentMetadata,
  redact: (input: string) => Promise<string>,
  site_config: R3plySiteConfig,
  system_config: R3plySystemConfig,
  comment_state?: CommentState,
) {
  const deliverable_email = Result.safe(
    deliverable(accepted_email, redact, site_config, system_config),
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
  const comment = Result.safe(() => process(template_context, site_config))
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
      .then((_) => comment)
  } else return comment
}
