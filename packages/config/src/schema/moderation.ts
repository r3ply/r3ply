import { Schema } from '@exodus/schemasafe'
import {
  FromSchema,
  FromSchemaOptions,
  JSONSchema,
  FromSchemaDefaultOptions,
} from 'json-schema-to-ts'
import { github } from './github'
// import { webhook } from './webhook'

export const moderation = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/moderation.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'r3ply schema for moderation of comments via email',
  description:
    "JSON Schema to configure what should happen to comments received via email, after they've been processed.",
  type: 'object',
  required: ['type'],
  // @ts-ignore - note: this is not part of json schema, but is in schemasafe because of ambiguity in json schema spec
  discriminator: {
    propertyName: 'type',
  },
  oneOf: [
    {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/github.v0.0.1.json',
    },
    // {
    //   $ref: 'https://r3ply.com/schemas/v0.0.1/config/webhook.v0.0.1.json',
    // },
  ],
} as const satisfies JSONSchema & Schema
export type R3plyModerationConfig = FromSchema<
  typeof moderation,
  FromSchemaDefaultOptions & {
    references: [
      typeof github,
      // typeof webhook
    ]
  }
>
