import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const notify = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/notify.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'r3ply schema for notifications of comments via email',
  description: 'JSON Schema to configure notifications.',
  type: 'object',
  required: [],
  additionalProperties: false,
  properties: {
    commenter: {
      type: 'boolean',
      title: '(Optional)',
      description:
        'Set to false to disable ALL notifications to the commenter.',
      default: false,
    },
    notify_commenter_upon_submission: {
      type: 'boolean',
      description:
        'Set to false to disable notifying the commenter upon submission of their email comment.',
      default: false,
    },
    'comment_submitted_notif_{}': {
      type: 'string',
      description: 'Comment submission notification template.',
      pattern: '^[\\s\\S]*$',
      $comment: 'Template string.',
    },
    '&comment_submitted_notif_{}': {
      type: 'string',
      description: 'Comment submission notification template.',
      format: 'uri-reference',
      $comment: 'File reference.',
    },
    moderator: {
      type: 'boolean',
      description:
        "Set to false to disable all notifications to the site's moderator.",
      const: false,
      default: false,
      $comment: 'Moderator notifications are not yet implemented in r3ply.',
    },
    notify_moderator_upon_receipt: {
      type: 'string',
      description:
        'Set to `"none"` to disable notifying the moderator upon receipt of a new email comment. `"all"` will notify the moderator upon every comment submission. `"approval_required"` will notify the moderator only when a comment is waiting for moderation.',
      enum: ['all', 'approval_required', 'none'],
      default: 'all',
    },
    'comment_received_notif_{}': {
      type: 'string',
      description: 'New comment notification template.',
      pattern: '^[\\s\\S]*$',
      $comment: 'Template string.',
    },
    '&comment_received_notif_{}': {
      type: 'string',
      description: 'New comment notification template.',
      format: 'uri-reference',
      $comment: 'File reference.',
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyNotifyConfig = FromSchema<typeof notify>
