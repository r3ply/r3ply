import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { notify } from '../notify'

export const email = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/email.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'TODO',
  description: 'TODO',
  type: 'object',
  required: [],
  additionalProperties: false,
  properties: {
    enabled: {
      type: 'boolean',
      description: 'Disable email comments if false',
      default: true,
    },
    subject: {
      type: 'string',
      enum: ['url', 'path'],
      description: 'Subject line handling',
      default: 'path',
      $comment:
        'if subject is configured as URL then it must match the domain of the site referenced in the local part of the email, i.e. <local>@<example.com>',
      examples: [
        'https://blog.example.com/posts/my-italian-vacation',
        '/posts/my-italian-vacation',
        'my-italian-vacation',
      ],
    },
    email_signature_separator: {
      type: 'string',
      pattern: '^[\\s\\S]*$',
      description: 'Used to separate comment body from email signature',
      default: '\n',
      examples: [
        '﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍',
        '﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍\nWrite your comment above 👆\n\nEverything below this line 👇 will be ignore\n﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍',
      ],
      $comment:
        "when you prepopulate emails with mailto links, it's a good idea to use some recognizable text that can be used to separate the body of the comment from the sender's email signature, which is usually prepopulated by one's mail client.",
    },
    attachments: {
      type: 'boolean',
      description: 'Allow email attachments',
      default: false,
      const: false,
      $comment:
        'for now attachments always false, but in the future they will be possible',
    },
    max_size_bytes: {
      type: 'integer',
      description: 'Max email size in bytes',
      minimum: 0,
      default: 1048576,
    },
    'block*': {
      type: 'array',
      description: 'pseudonym/email address blocklist',
      items: { type: 'string', pattern: '^[\\s\\S]*$' },
      default: [],
      examples: ['e8a20d6*', 'mallory@evil.com', '*@spam.com'],
      $comment:
        'a list of pseudonyms (or email addresses) to block. Globbing patterns are allowed.',
    },
    'comment_{}': {
      type: 'string',
      description: 'Comment template.',
      pattern: '^[\\s\\S]*$',
      $comment:
        'Template string. For longer comment templates, try using `&comment_{}`.',
    },
    '&comment_{}': {
      type: 'string',
      description: 'Comment template.',
      format: 'uri-reference',
      examples: [
        './viaEmail/comment.html',
        '/example.comment.template.md',
        '../comment.txt',
      ],
      $comment: 'File reference. Relative to the location of the r3ply config.',
    },
    'comment_{}_mime': {
      type: 'string',
      description: 'Mime type of comment.',
      pattern: '^[\\S]*$',
      maxLength: 128,
      default: 'text/plain',
      $comment: 'Can be useful if mime type of comment needs to be specified.',
    },
    notify: {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/notify.v0.0.1.json',
      default: {
        commenter: false,
        notify_commenter_upon_submission: false,
        moderator: false,
        notify_moderator_upon_receipt: 'none',
      },
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyEmailCommentsConfig = FromSchema<
  typeof email,
  {
    references: [typeof notify]
  }
>
