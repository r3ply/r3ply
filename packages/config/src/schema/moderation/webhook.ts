import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const webhook = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/webhook.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  required: ['url'],
  unevaluatedProperties: false,
  properties: {
    url: {
      type: 'string',
      format: 'uri',
      description: 'URL of the webhook.',
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyWebhookConfig = FromSchema<typeof webhook>
