import { R3plySiteConfig } from '../../../config/dist/index.cjs'
import { CommentTemplateContext } from '../process'

export interface Moderation {
  send: (
    comment: string,
    context: CommentTemplateContext,
    siteConfig: R3plySiteConfig,
  ) => Promise<unknown>
}
