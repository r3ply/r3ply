import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { options } from './options'

export const webhook = {
  title: 'Webhook moderation',
  description: 'Webhook moderation is useful for doing custom things.',
  $id: 'https://r3ply.com/schemas/v0.0.1/config/moderation/webhook.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  allOf: [
    {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation/options.v0.0.1.json',
    },
    {
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
    },
  ],
} as const satisfies JSONSchema & Schema
export type R3plyWebhookConfig = FromSchema<
  typeof webhook,
  {
    references: [typeof webhook, typeof options]
  }
>
