import { match, Result } from 'oxide.ts'
import { R3plySiteConfig } from '@r3ply/schema/config'
import { tera } from '@r3ply/wasm'
import { CommentMetadata } from './receive'

/**
 * The basic context that can always be expected to be available when rendering a template.
 */
export interface CommentTemplateContext {
  r3ply: {
    config_version: string
    server: string
    site: string
    signet: string
    issued: string
  }
  author: {
    pseudonym: string
    token: string
  }
  comment: {
    id: string
    ts_rcvd: string
    subject: {
      url: string
      origin: string
      protocol: string
      hostname: string
      path: string
      queryParams?: string
      fragment?: string
    }
    txt: string
    md?: string
    html?: string
  }
}

/**
 * @description if configured this just binds an email template to its context, otherwise it just stringifies the context itself
 * @param context at a minimum `CommentTemplateContext` but additional contexts can be added with the `&` type operator
 * @param site the configuration of the intended recipient (a website) of the comment
 * @returns either a comment rendered as a string, from the configured template and context, or just the raw context itself
 */
export async function process(
  context: CommentTemplateContext,
  {
    comment_template,
    site,
    metadata,
  }: {
    comment_template?: string
    site: R3plySiteConfig
    metadata: CommentMetadata
  },
) {
  let comment: string
  if (comment_template) {
    comment = match(
      // Note: the stringify -> parse combo is necessary to remove keys that are present but are undefined
      Result.safe(() =>
        tera(comment_template, JSON.parse(JSON.stringify(context))),
      ),
      {
        Ok: (rendered) => rendered,
        Err: (error) => {
          console.error(
            `Error binding comment template to data, original message:\n\n${error.message}\n\nContext:\n\n\`\`\`TS\n${JSON.stringify(context, null, 2)}\n\`\`\``,
          )
          throw error
        },
      },
    )
  } else {
    comment = JSON.stringify(context, null, 2)
  }
  return comment
}
