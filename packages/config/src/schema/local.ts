import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const local = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/local.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  required: ['type', 'file_path_{}'],
  additionalProperties: false,
  properties: {
    type: { const: 'local' },
    'file_path_{}': {
      type: 'string',
      description: 'File path template of new comment.',
      format: 'uri-reference',
      examples: ['content/comments/{{ comment.id | slice(end=8) }}.md'],
      $comment: 'Template string. Can never begin with a `/`.',
    },
    enabled: {
      type: 'boolean',
      description: 'If false, comment is not sent for moderation.',
      default: true,
    },
    'allow*': {
      type: 'array',
      description: 'Pseudonym/email address allow list.',
      items: { type: 'string', pattern: '^[\\s\\S]*$', maxLength: 256 },
      default: [],
      examples: ['*@alice.com', 'bob@example.com'],
      $comment: 'Glob pattern.',
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyWebhookConfig = FromSchema<typeof local>
