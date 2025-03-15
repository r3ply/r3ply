// @ts-nocheck
/** This file is generated. DO NOT EDIT. */
import { ParseResult } from '@exodus/schemasafe'
import { FromSchema } from 'json-schema-to-ts'

const schema = {
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
        '\ncommenter = true\nnotify_commenter_upon_submission = true\n"comment_submitted_notif_{}" = """\nYour comment was submitted\n"""\nmoderator = true\n"comment_received_notif_{}" = """\nA new comment has been received\n"""\n',
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
      discriminator: { propertyName: 'type' },
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
            url: { type: 'string', format: 'uri' },
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
      items: { type: 'string', format: 'hostname' },
      examples: ['r3ply.com', 'my-test-r3ply-server.net'],
      $comment:
        "It is not recommended to accept r3plies from servers you don't know",
    },
    comments: { $ref: '#/definitions/comments_config' },
  },
} as const

type TypedParseResult<T> = Omit<ParseResult, 'value'> & {
  value?: T
}

export type R3plySiteConfig = FromSchema<typeof schema>

// The generated raw parser function.
const raw_parser = (function () {
  'use strict'
  const hasOwn = Function.prototype.call.bind(Object.prototype.hasOwnProperty)
  const format0 = (input) => {
    if (input.length > (input.endsWith('.') ? 254 : 253)) return false
    const hostname =
      /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.?$/i
    return hostname.test(input)
  }
  const stringLength = (string) =>
    /[\uD800-\uDFFF]/.test(string) ? [...string].length : string.length
  const pattern0 = new RegExp('^[\\S]*$', 'u')
  const pattern1 = new RegExp('^[\\S]+$', 'u')
  const pattern2 = new RegExp('^(?!\\s*\\/)[\\s\\S]*$', 'u')
  const pointerPart = (s) =>
    /~\//.test(s) ? `${s}`.replace(/~/g, '~0').replace(/\//g, '~1') : s
  const format1 = new RegExp(
    "^[a-z][a-z0-9+\\-.]*:(?:\\/?\\/(?:(?:[a-z0-9\\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d\\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|v[0-9a-f]+\\.[a-z0-9\\-._~!$&'()*+,;=:]+)\\]|(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d\\d?)|(?:[a-z0-9\\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\\d*)?(?:\\/(?:[a-z0-9\\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\\/?(?:(?:[a-z0-9\\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\\/(?:[a-z0-9\\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?)(?:\\?(?:[a-z0-9\\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$",
    'i',
  )
  const ref2 = function validate(data) {
    validate.errors = null
    let errorCount = 0
    if (!(typeof data === 'object' && data && !Array.isArray(data))) {
      if (validate.errors === null) validate.errors = []
      validate.errors.push({ keywordLocation: '#/type', instanceLocation: '#' })
      errorCount++
    } else {
      if (!(data.type !== undefined && hasOwn(data, 'type'))) {
        if (validate.errors === null) validate.errors = []
        validate.errors.push({
          keywordLocation: '#/required',
          instanceLocation: '#/type',
        })
        errorCount++
      }
      if (typeof data === 'object' && data && !Array.isArray(data)) {
        if (data.type !== undefined && hasOwn(data, 'type')) {
          switch (data.type) {
            case 'github':
              if (!(data.repo !== undefined && hasOwn(data, 'repo'))) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/oneOf/0/required',
                  instanceLocation: '#/repo',
                })
                errorCount++
              }
              if (!(data.type !== undefined && hasOwn(data, 'type'))) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/oneOf/0/required',
                  instanceLocation: '#/type',
                })
                errorCount++
              }
              if (
                !(
                  data['file_path_{}'] !== undefined &&
                  hasOwn(data, 'file_path_{}')
                )
              ) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/oneOf/0/required',
                  instanceLocation: '#/file_path_{}',
                })
                errorCount++
              }
              if (data.enabled !== undefined && hasOwn(data, 'enabled')) {
                if (!(typeof data.enabled === 'boolean')) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/0/properties/enabled/type',
                    instanceLocation: '#/enabled',
                  })
                  errorCount++
                }
              } else data.enabled = true
              if (data.allow_list !== undefined && hasOwn(data, 'allow_list')) {
                if (!Array.isArray(data.allow_list)) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/0/properties/allow_list/type',
                    instanceLocation: '#/allow_list',
                  })
                  errorCount++
                } else {
                  for (let m = 0; m < data.allow_list.length; m++) {
                    if (
                      data.allow_list[m] !== undefined &&
                      hasOwn(data.allow_list, m)
                    ) {
                      if (!(typeof data.allow_list[m] === 'string')) {
                        if (validate.errors === null) validate.errors = []
                        validate.errors.push({
                          keywordLocation:
                            '#/oneOf/0/properties/allow_list/items/type',
                          instanceLocation: '#/allow_list/' + m,
                        })
                        errorCount++
                      } else {
                        if (
                          data.allow_list[m].length > 256 &&
                          stringLength(data.allow_list[m]) > 256
                        ) {
                          if (validate.errors === null) validate.errors = []
                          validate.errors.push({
                            keywordLocation:
                              '#/oneOf/0/properties/allow_list/items/maxLength',
                            instanceLocation: '#/allow_list/' + m,
                          })
                          errorCount++
                        }
                      }
                    }
                  }
                }
              } else data.allow_list = []
              if (data.repo !== undefined && hasOwn(data, 'repo')) {
                if (!(typeof data.repo === 'string')) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/0/properties/repo/type',
                    instanceLocation: '#/repo',
                  })
                  errorCount++
                } else {
                  const prev3 = errorCount
                  if (
                    data.repo.length > 1024 &&
                    stringLength(data.repo) > 1024
                  ) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation: '#/oneOf/0/properties/repo/maxLength',
                      instanceLocation: '#/repo',
                    })
                    errorCount++
                  }
                  if (errorCount === prev3) {
                    if (!pattern1.test(data.repo)) {
                      if (validate.errors === null) validate.errors = []
                      validate.errors.push({
                        keywordLocation: '#/oneOf/0/properties/repo/pattern',
                        instanceLocation: '#/repo',
                      })
                      errorCount++
                    }
                  }
                }
              }
              if (
                data.source_branch !== undefined &&
                hasOwn(data, 'source_branch')
              ) {
                if (!(typeof data.source_branch === 'string')) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/0/properties/source_branch/type',
                    instanceLocation: '#/source_branch',
                  })
                  errorCount++
                } else {
                  const prev4 = errorCount
                  if (
                    data.source_branch.length > 128 &&
                    stringLength(data.source_branch) > 128
                  ) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/oneOf/0/properties/source_branch/maxLength',
                      instanceLocation: '#/source_branch',
                    })
                    errorCount++
                  }
                  if (errorCount === prev4) {
                    if (!pattern0.test(data.source_branch)) {
                      if (validate.errors === null) validate.errors = []
                      validate.errors.push({
                        keywordLocation:
                          '#/oneOf/0/properties/source_branch/pattern',
                        instanceLocation: '#/source_branch',
                      })
                      errorCount++
                    }
                  }
                }
              } else data.source_branch = 'main'
              if (
                data['target_branch_{}'] !== undefined &&
                hasOwn(data, 'target_branch_{}')
              ) {
                if (!(typeof data['target_branch_{}'] === 'string')) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation:
                      '#/oneOf/0/properties/target_branch_{}/type',
                    instanceLocation: '#/target_branch_{}',
                  })
                  errorCount++
                } else {
                  if (
                    data['target_branch_{}'].length > 256 &&
                    stringLength(data['target_branch_{}']) > 256
                  ) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/oneOf/0/properties/target_branch_{}/maxLength',
                      instanceLocation: '#/target_branch_{}',
                    })
                    errorCount++
                  }
                }
              } else
                data['target_branch_{}'] =
                  'comment-{{ comment.ts_rcvd }}-{{ comment.id_8 }}.md'
              if (
                data['file_path_{}'] !== undefined &&
                hasOwn(data, 'file_path_{}')
              ) {
                if (!(typeof data['file_path_{}'] === 'string')) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/0/properties/file_path_{}/type',
                    instanceLocation: '#/file_path_{}',
                  })
                  errorCount++
                } else {
                  const prev5 = errorCount
                  if (
                    data['file_path_{}'].length > 1024 &&
                    stringLength(data['file_path_{}']) > 1024
                  ) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/oneOf/0/properties/file_path_{}/maxLength',
                      instanceLocation: '#/file_path_{}',
                    })
                    errorCount++
                  }
                  if (errorCount === prev5) {
                    if (!pattern2.test(data['file_path_{}'])) {
                      if (validate.errors === null) validate.errors = []
                      validate.errors.push({
                        keywordLocation:
                          '#/oneOf/0/properties/file_path_{}/pattern',
                        instanceLocation: '#/file_path_{}',
                      })
                      errorCount++
                    }
                  }
                }
              }
              if (
                data['commit_msg_{}'] !== undefined &&
                hasOwn(data, 'commit_msg_{}')
              ) {
                if (!(typeof data['commit_msg_{}'] === 'string')) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/0/properties/commit_msg_{}/type',
                    instanceLocation: '#/commit_msg_{}',
                  })
                  errorCount++
                } else {
                  if (
                    data['commit_msg_{}'].length > 2096 &&
                    stringLength(data['commit_msg_{}']) > 2096
                  ) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/oneOf/0/properties/commit_msg_{}/maxLength',
                      instanceLocation: '#/commit_msg_{}',
                    })
                    errorCount++
                  }
                }
              } else data['commit_msg_{}'] = 'TODO'
              if (
                data['pr_title_{}'] !== undefined &&
                hasOwn(data, 'pr_title_{}')
              ) {
                if (!(typeof data['pr_title_{}'] === 'string')) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/0/properties/pr_title_{}/type',
                    instanceLocation: '#/pr_title_{}',
                  })
                  errorCount++
                } else {
                  if (
                    data['pr_title_{}'].length > 1024 &&
                    stringLength(data['pr_title_{}']) > 1024
                  ) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/oneOf/0/properties/pr_title_{}/maxLength',
                      instanceLocation: '#/pr_title_{}',
                    })
                    errorCount++
                  }
                }
              } else data['pr_title_{}'] = 'TODO'
              if (
                data['pr_body_{}'] !== undefined &&
                hasOwn(data, 'pr_body_{}')
              ) {
                if (!(typeof data['pr_body_{}'] === 'string')) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/0/properties/pr_body_{}/type',
                    instanceLocation: '#/pr_body_{}',
                  })
                  errorCount++
                } else {
                  if (
                    data['pr_body_{}'].length > 2096 &&
                    stringLength(data['pr_body_{}']) > 2096
                  ) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/oneOf/0/properties/pr_body_{}/maxLength',
                      instanceLocation: '#/pr_body_{}',
                    })
                    errorCount++
                  }
                }
              } else data['pr_body_{}'] = 'TODO'
              for (const key0 of Object.keys(data)) {
                if (
                  key0 !== 'enabled' &&
                  key0 !== 'allow_list' &&
                  key0 !== 'type' &&
                  key0 !== 'repo' &&
                  key0 !== 'source_branch' &&
                  key0 !== 'target_branch_{}' &&
                  key0 !== 'file_path_{}' &&
                  key0 !== 'commit_msg_{}' &&
                  key0 !== 'pr_title_{}' &&
                  key0 !== 'pr_body_{}'
                ) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/0/additionalProperties',
                    instanceLocation: '#/' + pointerPart(key0),
                  })
                  errorCount++
                }
              }
              break
            case 'webhook':
              if (!(data.type !== undefined && hasOwn(data, 'type'))) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/oneOf/1/required',
                  instanceLocation: '#/type',
                })
                errorCount++
              }
              if (!(data.url !== undefined && hasOwn(data, 'url'))) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/oneOf/1/required',
                  instanceLocation: '#/url',
                })
                errorCount++
              }
              if (data.enabled !== undefined && hasOwn(data, 'enabled')) {
                if (!(typeof data.enabled === 'boolean')) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/1/properties/enabled/type',
                    instanceLocation: '#/enabled',
                  })
                  errorCount++
                }
              } else data.enabled = true
              if (data.allow_list !== undefined && hasOwn(data, 'allow_list')) {
                if (!Array.isArray(data.allow_list)) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/1/properties/allow_list/type',
                    instanceLocation: '#/allow_list',
                  })
                  errorCount++
                } else {
                  for (let n = 0; n < data.allow_list.length; n++) {
                    if (
                      data.allow_list[n] !== undefined &&
                      hasOwn(data.allow_list, n)
                    ) {
                      if (!(typeof data.allow_list[n] === 'string')) {
                        if (validate.errors === null) validate.errors = []
                        validate.errors.push({
                          keywordLocation:
                            '#/oneOf/1/properties/allow_list/items/type',
                          instanceLocation: '#/allow_list/' + n,
                        })
                        errorCount++
                      } else {
                        if (
                          data.allow_list[n].length > 256 &&
                          stringLength(data.allow_list[n]) > 256
                        ) {
                          if (validate.errors === null) validate.errors = []
                          validate.errors.push({
                            keywordLocation:
                              '#/oneOf/1/properties/allow_list/items/maxLength',
                            instanceLocation: '#/allow_list/' + n,
                          })
                          errorCount++
                        }
                      }
                    }
                  }
                }
              } else data.allow_list = []
              if (data.url !== undefined && hasOwn(data, 'url')) {
                if (!(typeof data.url === 'string')) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/1/properties/url/type',
                    instanceLocation: '#/url',
                  })
                  errorCount++
                } else {
                  const prev6 = errorCount
                  if (errorCount === prev6) {
                    if (!format1.test(data.url)) {
                      if (validate.errors === null) validate.errors = []
                      validate.errors.push({
                        keywordLocation: '#/oneOf/1/properties/url/format',
                        instanceLocation: '#/url',
                      })
                      errorCount++
                    }
                  }
                }
              }
              for (const key1 of Object.keys(data)) {
                if (
                  key1 !== 'enabled' &&
                  key1 !== 'type' &&
                  key1 !== 'allow_list' &&
                  key1 !== 'url'
                ) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation: '#/oneOf/1/additionalProperties',
                    instanceLocation: '#/' + pointerPart(key1),
                  })
                  errorCount++
                }
              }
              break
            default:
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/oneOf',
                instanceLocation: '#',
              })
              errorCount++
          }
        } else {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/discriminator/propertyName',
            instanceLocation: '#/type',
          })
          errorCount++
        }
      } else {
        if (validate.errors === null) validate.errors = []
        validate.errors.push({
          keywordLocation: '#/discriminator',
          instanceLocation: '#',
        })
        errorCount++
      }
    }
    return errorCount === 0
  }
  const errorMerge = (
    { keywordLocation, instanceLocation },
    schemaBase,
    dataBase,
  ) => ({
    keywordLocation: `${schemaBase}${keywordLocation.slice(1)}`,
    instanceLocation: `${dataBase}${instanceLocation.slice(1)}`,
  })
  const ref3 = function validate(data) {
    validate.errors = null
    let errorCount = 0
    if (!(typeof data === 'object' && data && !Array.isArray(data))) {
      if (validate.errors === null) validate.errors = []
      validate.errors.push({ keywordLocation: '#/type', instanceLocation: '#' })
      errorCount++
    } else {
      if (data.commenter !== undefined && hasOwn(data, 'commenter')) {
        if (!(typeof data.commenter === 'boolean')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/commenter/type',
            instanceLocation: '#/commenter',
          })
          errorCount++
        }
      } else data.commenter = true
      if (
        data.notify_commenter_upon_submission !== undefined &&
        hasOwn(data, 'notify_commenter_upon_submission')
      ) {
        if (!(typeof data.notify_commenter_upon_submission === 'boolean')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation:
              '#/properties/notify_commenter_upon_submission/type',
            instanceLocation: '#/notify_commenter_upon_submission',
          })
          errorCount++
        }
      } else data.notify_commenter_upon_submission = true
      if (
        data['comment_submitted_notif_{}'] !== undefined &&
        hasOwn(data, 'comment_submitted_notif_{}')
      ) {
        if (!(typeof data['comment_submitted_notif_{}'] === 'string')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/comment_submitted_notif_{}/type',
            instanceLocation: '#/comment_submitted_notif_{}',
          })
          errorCount++
        }
      } else data['comment_submitted_notif_{}'] = 'TODO'
      if (data.moderator !== undefined && hasOwn(data, 'moderator')) {
        if (!(typeof data.moderator === 'boolean')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/moderator/type',
            instanceLocation: '#/moderator',
          })
          errorCount++
        }
      } else data.moderator = true
      if (
        data.notify_moderator_upon_receipt !== undefined &&
        hasOwn(data, 'notify_moderator_upon_receipt')
      ) {
        if (!(typeof data.notify_moderator_upon_receipt === 'string')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/notify_moderator_upon_receipt/type',
            instanceLocation: '#/notify_moderator_upon_receipt',
          })
          errorCount++
        } else {
          if (
            !(
              data.notify_moderator_upon_receipt === 'all' ||
              data.notify_moderator_upon_receipt === 'approval_required' ||
              data.notify_moderator_upon_receipt === 'none'
            )
          ) {
            if (validate.errors === null) validate.errors = []
            validate.errors.push({
              keywordLocation:
                '#/properties/notify_moderator_upon_receipt/enum',
              instanceLocation: '#/notify_moderator_upon_receipt',
            })
            errorCount++
          }
        }
      } else data.notify_moderator_upon_receipt = 'all'
      if (
        data['comment_received_notif_{}'] !== undefined &&
        hasOwn(data, 'comment_received_notif_{}')
      ) {
        if (!(typeof data['comment_received_notif_{}'] === 'string')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/comment_received_notif_{}/type',
            instanceLocation: '#/comment_received_notif_{}',
          })
          errorCount++
        }
      } else data['comment_received_notif_{}'] = 'TODO'
      for (const key2 of Object.keys(data)) {
        if (
          key2 !== 'commenter' &&
          key2 !== 'notify_commenter_upon_submission' &&
          key2 !== 'comment_submitted_notif_{}' &&
          key2 !== 'moderator' &&
          key2 !== 'notify_moderator_upon_receipt' &&
          key2 !== 'comment_received_notif_{}'
        ) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/additionalProperties',
            instanceLocation: '#/' + pointerPart(key2),
          })
          errorCount++
        }
      }
    }
    return errorCount === 0
  }
  const ref1 = function validate(data) {
    validate.errors = null
    let errorCount = 0
    if (!(typeof data === 'object' && data && !Array.isArray(data))) {
      if (validate.errors === null) validate.errors = []
      validate.errors.push({ keywordLocation: '#/type', instanceLocation: '#' })
      errorCount++
    } else {
      if (!(data.email !== undefined && hasOwn(data, 'email'))) {
        if (validate.errors === null) validate.errors = []
        validate.errors.push({
          keywordLocation: '#/required',
          instanceLocation: '#/email',
        })
        errorCount++
      }
      if (data.enabled !== undefined && hasOwn(data, 'enabled')) {
        if (!(typeof data.enabled === 'boolean')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/enabled/type',
            instanceLocation: '#/enabled',
          })
          errorCount++
        }
      } else data.enabled = true
      if (data.paths !== undefined && hasOwn(data, 'paths')) {
        if (!Array.isArray(data.paths)) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/paths/type',
            instanceLocation: '#/paths',
          })
          errorCount++
        } else {
          for (let j = 0; j < data.paths.length; j++) {
            if (data.paths[j] !== undefined && hasOwn(data.paths, j)) {
              if (!(typeof data.paths[j] === 'string')) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/properties/paths/items/type',
                  instanceLocation: '#/paths/' + j,
                })
                errorCount++
              }
            }
          }
        }
      } else data.paths = ['/**']
      if (data.cache !== undefined && hasOwn(data, 'cache')) {
        if (!(typeof data.cache === 'boolean')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/cache/type',
            instanceLocation: '#/cache',
          })
          errorCount++
        }
      } else data.cache = true
      if (data.md_to_html !== undefined && hasOwn(data, 'md_to_html')) {
        if (!(typeof data.md_to_html === 'boolean')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/md_to_html/type',
            instanceLocation: '#/md_to_html',
          })
          errorCount++
        }
      } else data.md_to_html = true
      if (data.sanitize_html !== undefined && hasOwn(data, 'sanitize_html')) {
        if (!(typeof data.sanitize_html === 'boolean')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/sanitize_html/type',
            instanceLocation: '#/sanitize_html',
          })
          errorCount++
        }
      } else data.sanitize_html = true
      if (data.allow_tags !== undefined && hasOwn(data, 'allow_tags')) {
        if (!Array.isArray(data.allow_tags)) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/allow_tags/type',
            instanceLocation: '#/allow_tags',
          })
          errorCount++
        } else {
          for (let k = 0; k < data.allow_tags.length; k++) {
            if (
              data.allow_tags[k] !== undefined &&
              hasOwn(data.allow_tags, k)
            ) {
              if (!(typeof data.allow_tags[k] === 'string')) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/properties/allow_tags/items/type',
                  instanceLocation: '#/allow_tags/' + k,
                })
                errorCount++
              }
            }
          }
        }
      } else
        data.allow_tags = [
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
        ]
      if (data.email !== undefined && hasOwn(data, 'email')) {
        if (
          !(
            typeof data.email === 'object' &&
            data.email &&
            !Array.isArray(data.email)
          )
        ) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/email/type',
            instanceLocation: '#/email',
          })
          errorCount++
        } else {
          if (
            !(
              data.email.moderation !== undefined &&
              hasOwn(data.email, 'moderation')
            )
          ) {
            if (validate.errors === null) validate.errors = []
            validate.errors.push({
              keywordLocation: '#/properties/email/required',
              instanceLocation: '#/email/moderation',
            })
            errorCount++
          }
          if (
            data.email.enabled !== undefined &&
            hasOwn(data.email, 'enabled')
          ) {
            if (!(typeof data.email.enabled === 'boolean')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/properties/email/properties/enabled/type',
                instanceLocation: '#/email/enabled',
              })
              errorCount++
            }
          } else data.email.enabled = true
          if (
            data.email.subject !== undefined &&
            hasOwn(data.email, 'subject')
          ) {
            if (!(typeof data.email.subject === 'string')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/properties/email/properties/subject/type',
                instanceLocation: '#/email/subject',
              })
              errorCount++
            } else {
              if (!(data.email.subject === 'url')) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/properties/email/properties/subject/enum',
                  instanceLocation: '#/email/subject',
                })
                errorCount++
              }
            }
          } else data.email.subject = 'url'
          if (
            data.email.comment_separator !== undefined &&
            hasOwn(data.email, 'comment_separator')
          ) {
            if (!(typeof data.email.comment_separator === 'string')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/comment_separator/type',
                instanceLocation: '#/email/comment_separator',
              })
              errorCount++
            }
          } else data.email.comment_separator = '\n'
          if (
            data.email.attachments !== undefined &&
            hasOwn(data.email, 'attachments')
          ) {
            if (!(typeof data.email.attachments === 'boolean')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/attachments/type',
                instanceLocation: '#/email/attachments',
              })
              errorCount++
            }
          } else data.email.attachments = false
          if (
            data.email.max_size_bytes !== undefined &&
            hasOwn(data.email, 'max_size_bytes')
          ) {
            if (!Number.isInteger(data.email.max_size_bytes)) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/max_size_bytes/type',
                instanceLocation: '#/email/max_size_bytes',
              })
              errorCount++
            } else {
              if (!(0 <= data.email.max_size_bytes)) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation:
                    '#/properties/email/properties/max_size_bytes/minimum',
                  instanceLocation: '#/email/max_size_bytes',
                })
                errorCount++
              }
            }
          } else data.email.max_size_bytes = 1048576
          if (
            data.email.block_list !== undefined &&
            hasOwn(data.email, 'block_list')
          ) {
            if (!Array.isArray(data.email.block_list)) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/block_list/type',
                instanceLocation: '#/email/block_list',
              })
              errorCount++
            } else {
              for (let l = 0; l < data.email.block_list.length; l++) {
                if (
                  data.email.block_list[l] !== undefined &&
                  hasOwn(data.email.block_list, l)
                ) {
                  if (!(typeof data.email.block_list[l] === 'string')) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation:
                        '#/properties/email/properties/block_list/items/type',
                      instanceLocation: '#/email/block_list/' + l,
                    })
                    errorCount++
                  }
                }
              }
            }
          } else data.email.block_list = []
          if (
            data.email['comment_{}'] !== undefined &&
            hasOwn(data.email, 'comment_{}')
          ) {
            if (!(typeof data.email['comment_{}'] === 'string')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/comment_{}/type',
                instanceLocation: '#/email/comment_{}',
              })
              errorCount++
            }
          }
          if (
            data.email['comment_{}_mime'] !== undefined &&
            hasOwn(data.email, 'comment_{}_mime')
          ) {
            if (!(typeof data.email['comment_{}_mime'] === 'string')) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation:
                  '#/properties/email/properties/comment_{}_mime/type',
                instanceLocation: '#/email/comment_{}_mime',
              })
              errorCount++
            } else {
              const prev2 = errorCount
              if (
                data.email['comment_{}_mime'].length > 128 &&
                stringLength(data.email['comment_{}_mime']) > 128
              ) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation:
                    '#/properties/email/properties/comment_{}_mime/maxLength',
                  instanceLocation: '#/email/comment_{}_mime',
                })
                errorCount++
              }
              if (errorCount === prev2) {
                if (!pattern0.test(data.email['comment_{}_mime'])) {
                  if (validate.errors === null) validate.errors = []
                  validate.errors.push({
                    keywordLocation:
                      '#/properties/email/properties/comment_{}_mime/pattern',
                    instanceLocation: '#/email/comment_{}_mime',
                  })
                  errorCount++
                }
              }
            }
          } else data.email['comment_{}_mime'] = 'text/plain'
          if (
            data.email.moderation !== undefined &&
            hasOwn(data.email, 'moderation')
          ) {
            const err0 = validate.errors
            const res0 = ref2(data.email.moderation)
            const suberr0 = ref2.errors
            validate.errors = err0
            if (!res0) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push(
                ...suberr0.map((e) =>
                  errorMerge(
                    e,
                    '#/properties/email/properties/moderation/$ref',
                    '#/email/moderation',
                  ),
                ),
              )
              errorCount++
            }
          }
          if (data.email.notify !== undefined && hasOwn(data.email, 'notify')) {
            const err1 = validate.errors
            const res1 = ref3(data.email.notify)
            const suberr1 = ref3.errors
            validate.errors = err1
            if (!res1) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push(
                ...suberr1.map((e) =>
                  errorMerge(
                    e,
                    '#/properties/email/properties/notify/$ref',
                    '#/email/notify',
                  ),
                ),
              )
              errorCount++
            }
          } else
            data.email.notify = {
              commenter: true,
              notify_commenter_upon_submission: true,
              'comment_submitted_notif_{}': 'TODO',
              moderator: true,
              notify_moderator_upon_receipt: 'all',
              'comment_received_notif_{}': 'TODO',
            }
          for (const key3 of Object.keys(data.email)) {
            if (
              key3 !== 'enabled' &&
              key3 !== 'subject' &&
              key3 !== 'comment_separator' &&
              key3 !== 'attachments' &&
              key3 !== 'max_size_bytes' &&
              key3 !== 'block_list' &&
              key3 !== 'comment_{}' &&
              key3 !== 'comment_{}_mime' &&
              key3 !== 'moderation' &&
              key3 !== 'notify'
            ) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/properties/email/additionalProperties',
                instanceLocation: '#/email/' + pointerPart(key3),
              })
              errorCount++
            }
          }
        }
      }
      for (const key4 of Object.keys(data)) {
        if (
          key4 !== 'enabled' &&
          key4 !== 'paths' &&
          key4 !== 'cache' &&
          key4 !== 'md_to_html' &&
          key4 !== 'sanitize_html' &&
          key4 !== 'allow_tags' &&
          key4 !== 'email'
        ) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/additionalProperties',
            instanceLocation: '#/' + pointerPart(key4),
          })
          errorCount++
        }
      }
    }
    return errorCount === 0
  }
  const ref0 = function validate(data) {
    validate.errors = null
    let errorCount = 0
    if (!(typeof data === 'object' && data && !Array.isArray(data))) {
      if (validate.errors === null) validate.errors = []
      validate.errors.push({ keywordLocation: '#/type', instanceLocation: '#' })
      errorCount++
    } else {
      if (!(data.version !== undefined && hasOwn(data, 'version'))) {
        if (validate.errors === null) validate.errors = []
        validate.errors.push({
          keywordLocation: '#/required',
          instanceLocation: '#/version',
        })
        errorCount++
      }
      if (!(data.domain !== undefined && hasOwn(data, 'domain'))) {
        if (validate.errors === null) validate.errors = []
        validate.errors.push({
          keywordLocation: '#/required',
          instanceLocation: '#/domain',
        })
        errorCount++
      }
      if (!(data.r3ply !== undefined && hasOwn(data, 'r3ply'))) {
        if (validate.errors === null) validate.errors = []
        validate.errors.push({
          keywordLocation: '#/required',
          instanceLocation: '#/r3ply',
        })
        errorCount++
      }
      if (!(data.comments !== undefined && hasOwn(data, 'comments'))) {
        if (validate.errors === null) validate.errors = []
        validate.errors.push({
          keywordLocation: '#/required',
          instanceLocation: '#/comments',
        })
        errorCount++
      }
      if (data.version !== undefined && hasOwn(data, 'version')) {
        if (!(typeof data.version === 'string')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/version/type',
            instanceLocation: '#/version',
          })
          errorCount++
        } else {
          if (!(data.version === '0.0.1')) {
            if (validate.errors === null) validate.errors = []
            validate.errors.push({
              keywordLocation: '#/properties/version/enum',
              instanceLocation: '#/version',
            })
            errorCount++
          }
        }
      }
      if (data.enabled !== undefined && hasOwn(data, 'enabled')) {
        if (!(typeof data.enabled === 'boolean')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/enabled/type',
            instanceLocation: '#/enabled',
          })
          errorCount++
        }
      } else data.enabled = true
      if (data.domain !== undefined && hasOwn(data, 'domain')) {
        if (!(typeof data.domain === 'string')) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/domain/type',
            instanceLocation: '#/domain',
          })
          errorCount++
        } else {
          const prev0 = errorCount
          if (errorCount === prev0) {
            if (!format0(data.domain)) {
              if (validate.errors === null) validate.errors = []
              validate.errors.push({
                keywordLocation: '#/properties/domain/format',
                instanceLocation: '#/domain',
              })
              errorCount++
            }
          }
        }
      }
      if (data.r3ply !== undefined && hasOwn(data, 'r3ply')) {
        if (!Array.isArray(data.r3ply)) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/properties/r3ply/type',
            instanceLocation: '#/r3ply',
          })
          errorCount++
        } else {
          for (let i = 0; i < data.r3ply.length; i++) {
            if (data.r3ply[i] !== undefined && hasOwn(data.r3ply, i)) {
              if (!(typeof data.r3ply[i] === 'string')) {
                if (validate.errors === null) validate.errors = []
                validate.errors.push({
                  keywordLocation: '#/properties/r3ply/items/type',
                  instanceLocation: '#/r3ply/' + i,
                })
                errorCount++
              } else {
                const prev1 = errorCount
                if (errorCount === prev1) {
                  if (!format0(data.r3ply[i])) {
                    if (validate.errors === null) validate.errors = []
                    validate.errors.push({
                      keywordLocation: '#/properties/r3ply/items/format',
                      instanceLocation: '#/r3ply/' + i,
                    })
                    errorCount++
                  }
                }
              }
            }
          }
        }
      }
      if (data.comments !== undefined && hasOwn(data, 'comments')) {
        const err2 = validate.errors
        const res2 = ref1(data.comments)
        const suberr2 = ref1.errors
        validate.errors = err2
        if (!res2) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push(
            ...suberr2.map((e) =>
              errorMerge(e, '#/properties/comments/$ref', '#/comments'),
            ),
          )
          errorCount++
        }
      }
      for (const key5 of Object.keys(data)) {
        if (
          key5 !== 'version' &&
          key5 !== 'enabled' &&
          key5 !== 'domain' &&
          key5 !== 'r3ply' &&
          key5 !== 'comments'
        ) {
          if (validate.errors === null) validate.errors = []
          validate.errors.push({
            keywordLocation: '#/additionalProperties',
            instanceLocation: '#/' + pointerPart(key5),
          })
          errorCount++
        }
      }
    }
    return errorCount === 0
  }
  const parseWrap = (validate) => (src) => {
    if (typeof src !== 'string')
      return { valid: false, error: 'Input is not a string' }
    try {
      const value = JSON.parse(src)
      if (!validate(value)) {
        const { keywordLocation, instanceLocation } = validate.errors[0]
        const keyword = keywordLocation.slice(
          keywordLocation.lastIndexOf('/') + 1,
        )
        const error = `JSON validation failed for ${keyword} at ${instanceLocation}`
        return { valid: false, error, errors: validate.errors }
      }
      return { valid: true, value }
    } catch ({ message }) {
      return { valid: false, error: message }
    }
  }
  return parseWrap(ref0)
})()

// A wrapper that adds type safety.
export const parser = (input: string): TypedParseResult<R3plySiteConfig> => {
  const parse_result = raw_parser(input) as ParseResult
  return parse_result as TypedParseResult<R3plySiteConfig>
}
