import { Schema } from '@exodus/schemasafe'
import { JSONSchema } from 'json-schema-to-ts'

export const local = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/moderation/local.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Local moderation',
  description:
    'Specifies moderation that happens locally, usually via the r3ply CLI tool.',
  type: 'object',
  required: ['file_path_{}'],
  unevaluatedProperties: false,
  allOf: [
    {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/moderation.v0.0.1.json#/definitions/options',
    },
  ],
  properties: {
    'file_path_{}': {
      title: 'File path template (string)',
      description:
        'Specifies the file path of the new comment. The "file_path_{}" name means the string will be interpreted as a template. It can never begin with a "/". Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
      pattern: '^(?!\\s*/)[\\s\\S]*$',
      maxLength: 1024,
      examples: ['content/comments/{{ comment.id | slice(end=8) }}.md'],
      $comment: 'Template string. Can never begin with a `/`.',
    },
  },
} as const satisfies JSONSchema & Schema
