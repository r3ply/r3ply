import { R3plyNotifyConfig, R3plyModerationConfig } from '@r3ply/config'
import { CommentTemplateContext } from '../process'

export interface ModerationResult<A, C> {
  args: A
  context: C
  commenter_notif?: string
  moderator_notif?: string
}
export interface Moderation<A, C> {
  send: (
    comment: string,
    context: CommentTemplateContext,
    moderationConfig: R3plyModerationConfig,
    notifyConfig?: R3plyNotifyConfig,
  ) => Promise<ModerationResult<A, C>>
}
