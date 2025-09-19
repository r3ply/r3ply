import { Schema } from '@exodus/schemasafe'
import { JSONSchema } from 'json-schema-to-ts'

export const webhook = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/moderation/webhook.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Webhook moderation',
  description: 'Webhook moderation is useful for doing custom things.',
  type: 'object',
  required: ['url'],
  unevaluatedProperties: false,
  properties: {
    url: {
      title: 'Webhook URL',
      description:
        'The URL the comment will be sent to. The comment will be in the request body.',
      type: 'string',
      format: 'uri',
      $comment:
        'TODO when r3ply supports secrets allow secrets to be stored here.',
    },
    method: {
      title: 'Webhook method',
      description:
        "The method the comment will be sent with. Default is 'POST'.",
      type: 'string',
      enum: ['POST', 'PUT', 'PATCH', 'DELETE'],
      default: 'POST',
    },
  },
} as const satisfies JSONSchema & Schema
