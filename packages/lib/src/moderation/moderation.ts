import { R3plyNotifyConfig, R3plyModerationConfig } from '@r3ply/config'
import { CommentTemplateContext } from '../process'

export interface Moderation {
  send: (
    comment: string,
    context: CommentTemplateContext,
    moderationConfig: R3plyModerationConfig,
    notifyConfig?: R3plyNotifyConfig,
  ) => Promise<{ commenter_notif?: string; moderator_notif?: string }>
}
