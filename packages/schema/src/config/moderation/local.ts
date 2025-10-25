import { Schema } from '@exodus/schemasafe'
import { JSONSchema } from 'json-schema-to-ts'

export const local = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/moderation/local.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Local moderation',
  description: 'Specifies a moderation channel used locally.',
  $comment: 'This is usually used by `re` the r3ply CLI tool.',
  type: 'object',
  required: ['file_path_{}'],
  unevaluatedProperties: false,
  allOf: [
    {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation.v0.0.1.json#/definitions/options',
    },
  ],
  properties: {
    type: {
      const: 'local',
    },
    'file_path_{}': {
      title: 'File path template (string)',
      description: 'Specifies the file path of the new comment.',
      type: 'string',
      pattern: '^(?!\\s*/)[\\s\\S]*$',
      maxLength: 1024,
      examples: ['content/comments/{{ comment.id | slice(end=8) }}.md'],
      $comment: 'Can never begin with a `/`.',
    },
  },
} as const satisfies JSONSchema & Schema
