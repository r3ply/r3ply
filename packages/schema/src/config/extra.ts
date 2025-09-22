import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { Schema } from '@exodus/schemasafe'
export const extra = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/extra.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Extra config',
  description: "An area for user's to define extra configuration.",
  type: 'object',
  required: [],
  additionalProperties: {
    type: ['string', 'number', 'boolean', 'null'],
    pattern: '^[\\s\\S]*$',
  },
  propertyNames: {
    pattern: '^[\\s\\S]*$',
  },
} as const satisfies JSONSchema & Schema
export type R3plyExtraConfig = FromSchema<typeof extra>
