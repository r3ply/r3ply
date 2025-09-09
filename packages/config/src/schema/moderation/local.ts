import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const local = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/local.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  required: ['file_path_{}'],
  unevaluatedProperties: false,
  properties: {
    'file_path_{}': {
      type: 'string',
      description: 'File path template of new comment.',
      pattern: '^(?!\\s*/)[\\s\\S]*$',
      maxLength: 1024,
      examples: ['content/comments/{{ comment.id | slice(end=8) }}.md'],
      $comment: 'Template string. Can never begin with a `/`.',
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyLocalModerationConfig = FromSchema<typeof local>
