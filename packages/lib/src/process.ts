import { match, Result } from 'oxide.ts'
import { R3plySiteConfig } from '@r3ply/config'
import { tera } from '@r3ply/wasm'

/**
 * The basic context that can always be expected to be available when rendering a template into a comment.
 * Addditional context can be provided via the `&` type operator, e.g.
 *
 * ```
 * // See `EmailTemplateContext` for more
 * let template_context: CommentTemplateContext & EmailTemplateContext
 * ```
 */
export interface CommentTemplateContext {
  r3ply: {
    config_version: string
    server: string
    site: string
  }
  comment: {
    id: string
    id_8: string
    ts_rcvd: string
    author: string
    author_7: string
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
 * @description if configured this just binds an email template to its context, otherwise it just stringifieds the context itself
 * @param context at a minimum `CommentTemplateContext` but additional contexts can be added with the `&` type operator
 * @param site the configuration of the intended recipient (a website) of the comment
 * @returns either a comment rendered as a string, from the configured template and context, or just the raw context itself
 */
export function process(
  context: CommentTemplateContext,
  site: R3plySiteConfig,
) {
  let comment: string
  if (site.comments.email['comment_{}']) {
    const template = site.comments.email['comment_{}']
    comment = match(
      // Note: the stringify -> parse combo is necessary to remove keys that are present but are undefined
      Result.safe(() => tera(template, JSON.parse(JSON.stringify(context)))),
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
