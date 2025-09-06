import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const local = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/local.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  required: ['type'],
  additionalProperties: false,
  properties: {
    type: { const: 'local' },
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
