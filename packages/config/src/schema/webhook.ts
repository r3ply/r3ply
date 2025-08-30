import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const webhook = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/webhook.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  required: ['type', 'url'],
  additionalProperties: false,
  properties: {
    enabled: {
      type: 'boolean',
      description: 'If false, comment is not sent for moderation.',
      default: true,
    },
    type: { const: 'webhook' },
    'allow*': {
      type: 'array',
      description: 'Pseudonym/email address allow list.',
      items: { type: 'string', pattern: '^[\\s\\S]*$', maxLength: 256 },
      default: [],
      examples: ['*@alice.com', 'bob@example.com'],
      $comment: 'Glob pattern.',
    },
    url: {
      type: 'string',
      format: 'uri',
      description: 'URL of the webhook.',
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyWebhookConfig = FromSchema<typeof webhook>
