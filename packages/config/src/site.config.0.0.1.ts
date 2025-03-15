import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { parser as schemasafe_parser, ParseResult } from '@exodus/schemasafe'

export const schema_ts = {
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'r3ply site config schema v0.0.1',
  description:
    "JSON Schema to describe a site's configuration for use with the r3ply commenting system. See https://r3ply.com for more info.",
  type: 'object',
  required: ['version', 'domain', 'r3ply', 'comments'],
  additionalProperties: false,
  definitions: {
    notify_config: {
      $id: 'notify_config',
      title: 'r3ply schema for notifications of comments via email',
      description:
        "JSON Schema to configure what should happen to comments received via email, after they've been processed.",
      type: 'object',
      required: [],
      additionalProperties: false,
      examples: [
        `
commenter = true
notify_commenter_upon_submission = true
"comment_submitted_notif_{}" = """
Your comment was submitted
"""
moderator = true
"comment_received_notif_{}" = """
A new comment has been received
"""
`,
      ],
      properties: {
        commenter: {
          type: 'boolean',
          description:
            'Set to false to disable all notifications to the commenter',
          default: true,
        },
        notify_commenter_upon_submission: {
          type: 'boolean',
          description:
            'Set to false to disable notifying the commenter upon submission of their email comment',
          default: true,
        },
        'comment_submitted_notif_{}': {
          type: 'string',
          description:
            'Comment submission notification template (accepts TODO data)',
          pattern: '^[\\s\\S]*$',
          default: 'TODO',
        },
        moderator: {
          type: 'boolean',
          description:
            "Set to false to disable all notifications to the site's moderator (note: this requires a moderation email address to be set up, either in the site config or privately with your r3ply server)",
          default: true,
        },
        notify_moderator_upon_receipt: {
          type: 'string',
          description:
            'Set to `"none"` to disable notifying the moderator upon receipt of a new email comment. `"all"` wll notify the moderator upon every comment submission. `"approval_required"` will notify the moderator only when a comment is waiting for moderation.',
          enum: ['all', 'approval_required', 'none'],
          default: 'all',
        },
        'comment_received_notif_{}': {
          type: 'string',
          description: 'New comment notification template',
          pattern: '^[\\s\\S]*$',
          default: 'TODO',
        },
      },
    },
    moderation_config: {
      $id: 'moderation_config',
      title: 'r3ply schema for moderation of comments via email',
      description:
        "JSON Schema to configure what should happen to comments received via email, after they've been processed.",
      type: 'object',
      required: ['type'],
      // @ts-ignore - note: this is not part of json schema, but is in schemasafe because of ambiguity in json schema spec
      discriminator: {
        propertyName: 'type',
      },
      $defs: {
        github_moderation_config: {
          required: ['repo', 'type'],
          additionalProperties: false,
          properties: {
            allow_list: {
              type: 'array',
              description:
                'Matches from this list will skip moderation. Uses glob patterns.',
              items: { type: 'string', pattern: '^[\\s\\S]*$', maxLength: 256 },
              default: [],
              examples: ['*@alice.com', 'bob@example.com'],
            },
            enabled: {
              type: 'boolean',
              description: 'If false, comment is not sent for moderation',
              default: true,
            },
            type: { enum: ['github'] },
            repo: {
              type: 'string',
              description: 'GitHub repository',
              pattern: '^[\\S]+$',
              maxLength: 1024,
              examples: ['https://github.com/you/yoursite'],
            },
            source_branch: {
              type: 'string',
              description: 'Base branch',
              pattern: '^[\\S]*$',
              default: 'main',
            },
            'file_path_{}': {
              type: 'string',
              description:
                'File path template for new comment (template data is `prepared_comment`).',
              pattern: '^[\\s\\S]*$',
              maxLength: 1024,
              examples: [
                '/content/comments/{{ comment.id | slice(end=8) }}.md',
              ],
              $comment:
                'compiled template must be 400 characters or less and be a valid file path',
            },
            'commit_msg_{}': {
              type: 'string',
              description:
                'Commit message template (template data is `prepare_comment`)',
              pattern: '^[\\s\\S]*$',
              maxLength: 2096,
              default: 'TODO',
            },
            'pr_title_{}': {
              type: 'string',
              description:
                'Pull request title template (template data is `prepare_comment`)',
              pattern: '^[\\s\\S]*$',
              maxLength: 1024,
              default: 'TODO',
            },
            'pr_body_{}': {
              type: 'string',
              description:
                'Pull request body template (template data is `prepare_comment`)',
              pattern: '^[\\s\\S]*$',
              maxLength: 2096,
              default: 'TODO',
            },
          },
        },
      },
      oneOf: [
        {
          required: ['repo', 'type', 'file_path_{}'],
          additionalProperties: false,
          properties: {
            enabled: {
              type: 'boolean',
              description: 'If false, comment is not sent for moderation',
              default: true,
            },
            allow_list: {
              type: 'array',
              description:
                'Matches from this list will skip moderation. Uses glob patterns.',
              items: { type: 'string', pattern: '^[\\s\\S]*$', maxLength: 256 },
              default: [],
              examples: ['*@alice.com', 'bob@example.com'],
            },
            type: { enum: ['github'] },
            repo: {
              type: 'string',
              description: 'GitHub repository',
              pattern: '^[\\S]+$',
              maxLength: 1024,
              examples: ['https://github.com/you/yoursite'],
            },
            source_branch: {
              type: 'string',
              description: 'Base branch',
              pattern: '^[\\S]*$',
              maxLength: 128,
              default: 'main',
            },
            'target_branch_{}': {
              type: 'string',
              description:
                'The new branch that will be created when submitting a comment for moderation. Uses templates.',
              pattern: '^[\\s\\S]*$',
              maxLength: 256,
              default: 'comment-{{ comment.ts_rcvd }}-{{ comment.id_8 }}.md',
            },
            'file_path_{}': {
              type: 'string',
              description:
                'File path template for new comment (template data is `prepared_comment`).',
              pattern: '^(?!\\s*/)[\\s\\S]*$',
              maxLength: 1024,
              examples: [
                '/content/comments/{{ comment.id | slice(end=8) }}.md',
              ],
              $comment:
                'compiled template must be 400 characters or less and be a valid file path',
            },
            'commit_msg_{}': {
              type: 'string',
              description:
                'Commit message template (template data is `prepare_comment`)',
              pattern: '^[\\s\\S]*$',
              maxLength: 2096,
              default: 'TODO',
            },
            'pr_title_{}': {
              type: 'string',
              description:
                'Pull request title template (template data is `prepare_comment`)',
              pattern: '^[\\s\\S]*$',
              maxLength: 1024,
              default: 'TODO',
            },
            'pr_body_{}': {
              type: 'string',
              description:
                'Pull request body template (template data is `prepare_comment`)',
              pattern: '^[\\s\\S]*$',
              maxLength: 2096,
              default: 'TODO',
            },
          },
        },
        {
          required: ['type', 'url'],
          additionalProperties: false,
          properties: {
            enabled: {
              type: 'boolean',
              description: 'If false, comment is not sent for moderation',
              default: true,
            },
            type: { enum: ['webhook'] },
            allow_list: {
              type: 'array',
              description:
                'Matches from this list will skip moderation. Uses glob patterns.',
              items: { type: 'string', pattern: '^[\\s\\S]*$', maxLength: 256 },
              default: [],
              examples: ['*@alice.com', 'bob@example.com'],
            },
            url: {
              type: 'string',
              format: 'uri',
            },
          },
        },
      ],
    },
    comments_config: {
      $id: 'comments_config',
      title: 'r3ply site config for comments',
      description: 'JSON Schema to configure how comments are handled',
      type: 'object',
      required: ['email'],
      additionalProperties: false,
      properties: {
        enabled: {
          type: 'boolean',
          description: 'Disable all comments if false',
          default: true,
        },
        paths: {
          type: 'array',
          description: 'URL paths to enable comments on (micromatch patterns)',
          items: { type: 'string', pattern: '^[\\s\\S]*$' },
          default: ['/**'],
          examples: ['/**', '!/private'],
        },
        cache: {
          type: 'boolean',
          description: 'Enable comment caching on r3ply server',
          default: true,
        },
        md_to_html: {
          type: 'boolean',
          description: 'Convert markdown to HTML',
          default: true,
        },
        sanitize_html: {
          type: 'boolean',
          description: 'Sanitize HTML output',
          default: true,
        },
        allow_tags: {
          type: 'array',
          description: 'Allowed HTML tags (requires `sanitize_html`)',
          items: { type: 'string', pattern: '^[\\s\\S]*$' },
          default: [
            'a',
            'br',
            'p',
            'span',
            'strong',
            's',
            'del',
            'em',
            'u',
            'ul',
            'ol',
            'li',
            'blockquote',
            'hr',
            'code',
            'pre',
            'table',
            'tr',
            'td',
            'th',
            'caption',
            'thead',
            'tbody',
            'tfoot',
            'kbd',
            'mark',
            'sub',
            'small',
          ],
          examples: [
            [
              'a',
              'br',
              'p',
              'span',
              'strong',
              's',
              'del',
              'em',
              'u',
              'ul',
              'ol',
              'li',
              'blockquote',
              'hr',
              'code',
              'pre',
              'table',
              'tr',
              'td',
              'th',
              'caption',
              'thead',
              'tbody',
              'tfoot',
              'kbd',
              'mark',
              'sub',
              'small',
            ],
          ],
        },
        email: {
          type: 'object',
          description: 'Email comment configuration',
          required: ['moderation'],
          additionalProperties: false,
          properties: {
            enabled: {
              type: 'boolean',
              description: 'Disable email comments if false',
              default: true,
            },
            subject: {
              type: 'string',
              enum: ['url'],
              description: 'Subject line handling',
              default: 'url',
              $comment: 'For now only URL is valid',
            },
            comment_separator: {
              type: 'string',
              pattern: '^[\\s\\S]*$',
              default: '\n',
            },
            attachments: {
              type: 'boolean',
              description: 'Allow email attachments',
              default: false,
            },
            max_size_bytes: {
              type: 'integer',
              description: 'Max email size in bytes',
              minimum: 0,
              default: 1048576,
            },
            block_list: {
              type: 'array',
              description: 'Email/ID blocklist (glob patterns)',
              items: { type: 'string', pattern: '^[\\s\\S]*$' },
              default: [],
              examples: ['e8a20d6*', 'mallory@evil.com', '*@spam.com'],
            },
            'comment_{}': {
              type: 'string',
              description: '[Optional] Comment template (inline or URL)',
              pattern: '^[\\s\\S]*$',
            },
            'comment_{}_mime': {
              type: 'string',
              description: '[Optional] Specify mime type for comment template',
              pattern: '^[\\S]*$',
              maxLength: 128,
              default: 'text/plain',
            },
            moderation: { $ref: '#/definitions/moderation_config' },
            notify: {
              $ref: '#/definitions/notify_config',
              default: {
                commenter: true,
                notify_commenter_upon_submission: true,
                'comment_submitted_notif_{}': 'TODO',
                moderator: true,
                notify_moderator_upon_receipt: 'all',
                'comment_received_notif_{}': 'TODO',
              },
            },
            // TODO: figure out why this doesn't work:
            // extra: {
            // 	type: "object",
            // 	additionalProperties: true
            // }
          },
        },
      },
    },
  },
  properties: {
    version: {
      type: 'string',
      enum: ['0.0.1'],
      description: 'The version of the config file.',
    },
    enabled: {
      type: 'boolean',
      description:
        'Comments will not be processed if set to false. Default is true.',
      default: true,
    },
    domain: {
      description: 'The domain that this site is configuring',
      type: 'string',
      format: 'hostname',
      examples: ['lucasarts.com', 'ghosts.lucasarts.com'],
      $comment: 'must match the domain that serves the config',
    },
    r3ply: {
      description: 'The domains this site expects to receive r3plies from',
      type: 'array',
      items: {
        type: 'string',
        format: 'hostname',
      },
      examples: ['r3ply.com', 'my-test-r3ply-server.net'],
      $comment:
        "It is not recommended to accept r3plies from servers you don't know",
    },
    comments: { $ref: '#/definitions/comments_config' },
  },
} as const satisfies JSONSchema
const basic_parser = schemasafe_parser(schema_ts as any, {
  useDefaults: true,
  includeErrors: true,
  allErrors: true,
})
export type TypedParseResult<T> = Omit<ParseResult, 'value'> & {
  value?: T
}
export type R3plySiteConfig = FromSchema<typeof schema_ts>
export const parser = (input: string) => {
  let parse_result = basic_parser(input)
  return parse_result as TypedParseResult<R3plySiteConfig>
}

export const module = `/** This file is generated. DO NOT EDIT. */
import { ParseResult } from '@exodus/schemasafe'
import { FromSchema } from 'json-schema-to-ts'

const schema = ${JSON.stringify(basic_parser.toJSON())} as const;

type TypedParseResult<T> = Omit<ParseResult, 'value'> & {
  value?: T
}

export type R3plySiteConfig = FromSchema<typeof schema>

// The generated raw parser function.
const raw_parser = ${basic_parser.toModule()}

// A wrapper that adds type safety.
export const parser = (input: string): TypedParseResult<R3plySiteConfig> => {
  const parse_result = raw_parser(input) as ParseResult
  return parse_result as TypedParseResult<R3plySiteConfig>
}
`
