import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const email = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/comments/email.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Configuration for comments via email',
  description: 'Specifies properties about comments that are unique to email.',
  type: 'object',
  required: [],
  additionalProperties: false,
  properties: {
    enabled: {
      title: 'Toggle on/off',
      description: 'Disables comments via email if false. Default is true.',
      type: 'boolean',
      default: true,
    },
    'filter*': {
      title: 'Filter site',
      description:
        "Specifies which sites, by label, will have email comments handled. The 'filter*' name means a glob pattern can be provided. See `site` config key for more details. Default is ['**'] (all sites).",
      type: 'array',
      items: { type: 'string', pattern: '^[\\s\\S]*$' },
      default: ['**'],
      examples: ['test*', '!local'],
    },
    subject: {
      title: 'Subject line handling',
      description:
        'The subject line is used to indicate to what the comment is referring to. Use "url" to require the full URL and "path" for only the path portion. The resolved URL will always match the local part of the email\'s `TO` header. Default is "path".',
      type: 'string',
      enum: ['url', 'path'],
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
      title: 'Email signature separator',
      description:
        'Many email clients automatically append a signature at the bottom. This config property tells r3ply what text boundary will appear before the email signature, to strip it out (note: you should include the same text boundary in your `mailto:` links for this to work propertly). Default is just "\n".',
      type: 'string',
      pattern: '^[\\s\\S]*$',
      default: '\n',
      examples: [
        '﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍',
        '﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍\nWrite your comment above 👆\n\nEverything below this line 👇 will be ignore\n﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍﹍',
      ],
      $comment:
        "when you prepopulate emails with mailto links, it's a good idea to use some recognizable text that can be used to separate the body of the comment from the sender's email signature, which is usually prepopulated by one's mail client.",
    },
    attachments: {
      title: 'Allow attachments',
      description:
        'Attachments are currently disabled but support will be added in the future.',
      type: 'boolean',
      default: false,
      const: false,
      $comment:
        'for now attachments always false, but in the future they will be possible',
    },
    max_size_bytes: {
      title: 'Max size (in bytes) allowed',
      description:
        'If a comment via email exceeds either this amount or the limit set upstream at the r3ply server it will be rejected.',
      type: 'integer',
      minimum: 0,
      default: 1048576,
    },
    'block*': {
      title: 'Block list',
      description:
        'Specifies which pseudyonym/email address to block. The "block*" name means glob patterns can be used.',
      type: 'array',
      items: { type: 'string', pattern: '^[\\s\\S]*$' },
      default: [],
      examples: ['e8a20d6*', 'mallory@evil.com', '*@spam.com'],
      $comment:
        'a list of pseudonyms (or email addresses) to block. Globbing patterns are allowed.',
    },
    'comment_{}': {
      title: 'Comment template (string)',
      description:
        'Specifies how email comments should be transformed into text. The "comment_{}" name means a template string can be provided. Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
      pattern: '^[\\s\\S]*$',
      $comment:
        'Template string. For longer comment templates, try using `&comment_{}`.',
    },
    '&comment_{}': {
      title: 'Comment template (file)',
      description:
        'Specifies how email comments should be transformed into text. The "&comment_{}" name means a reference to a file that holds a template string can be provided. Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
      format: 'uri-reference',
      examples: [
        './viaEmail/comment.html',
        '/example.comment.template.md',
        '../comment.txt',
      ],
      $comment: 'File reference. Relative to the location of the r3ply config.',
    },
    comment_mime: {
      title: 'Comment mime type',
      description:
        'Comments are templated as some kind of file. It can be at times useful to specify the mime type of the file.',
      type: 'string',
      pattern: '^[\\S]*$',
      maxLength: 128,
      default: 'text/plain',
      $comment: 'Can be useful if mime type of comment needs to be specified.',
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyEmailCommentsConfig = FromSchema<typeof email>
