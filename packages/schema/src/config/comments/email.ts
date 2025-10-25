import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const email = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/comments/email.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Emailed comments config',
  description: 'Control parameters unique to email.',
  type: 'object',
  required: [],
  additionalProperties: false,
  properties: {
    enabled: {
      title: 'Enable email comments',
      description: 'False disables email comments only.',
      type: 'boolean',
      default: true,
      $comment: 'See `comments.enabled`.',
    },
    'filter*': {
      title: 'Filter site',
      description: 'Specifies which sites (by label) will be processed.',
      type: 'array',
      items: { type: 'string', pattern: '^[\\s\\S]*$' },
      default: ['**'],
      examples: ['*', '!local'],
      $comment: 'See `label` property on `site` config variable.',
    },
    email_signature_separator: {
      title: 'Email signature separator',
      description: 'Text boundary that appears before email signature.',
      type: 'string',
      pattern: '^[\\s\\S]*$',
      default: '\n',
      examples: [
        `﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍
Write your comment above 👆

DON'T alter the subject line ⚠️

Everything below this line 👇 will be ignored
﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍`,
      ],
      $comment:
        "This should be the same string you use in the `body` field of your mailto links. It's a good idea to use some recognizable text. You can also put instructions to the commenter in here.",
    },
    attachments: {
      title: 'Allow attachments',
      description:
        'Attachments are currently disabled but support will be added in the future.',
      type: 'boolean',
      default: false,
      const: false,
    },
    max_size_bytes: {
      title: 'Max size (in bytes)',
      description:
        'If an email comment exceeds either this amount or the limit set upstream by the r3ply server it will be rejected.',
      type: 'integer',
      minimum: 0,
      default: 1048576,
      $comment: 'i.e. 1 MB.',
    },
    'block*': {
      title: 'Block list',
      description: 'Specifies which pseudyonym/email address to block.',
      type: 'array',
      items: { type: 'string', pattern: '^[\\s\\S]*$' },
      default: [],
      examples: ['e8a20d6*', 'mallory@evil.com', '*@spam.com'],
    },
    'comment_{}': {
      title: 'Comment template (string)',
      description:
        'Specifies how email comments should be transformed into text. Default is a stringified JSON object.',
      type: 'string',
      pattern: '^[\\s\\S]*$',
      $comment: 'For longer comment templates see `&comment_{}`.',
    },
    '&comment_{}': {
      title: 'Comment template (file)',
      description:
        'Specifies how email comments should be transformed into text. Must be a path.',
      type: 'string',
      format: 'uri-reference',
      examples: [
        './viaEmail/comment.html',
        '/example.comment.template.md',
        '../comment.txt',
      ],
      $comment: 'See also `comment_{}`.',
    },
    comment_mime: {
      title: 'Comment mime type',
      description:
        'It can be at times useful to specify the mime type of a comment file.',
      type: 'string',
      pattern: '^[\\S]*$',
      maxLength: 128,
      default: 'text/plain',
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyEmailCommentsConfig = FromSchema<typeof email>
