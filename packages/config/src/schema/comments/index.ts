import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { notify } from '../notify'
import { email } from './email'
import { moderation, github, webhook, local } from '../moderation'
export * from './email'

export const comments = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/comments.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Comments configuration',
  description: 'Configure the various commenting channels, e.g. "email"',
  type: 'object',
  required: ['email'],
  additionalProperties: false,
  properties: {
    enabled: {
      title: 'Toggle on/off',
      description:
        'Comments will not be processed if set to false. Default is true.',
      type: 'boolean',
      default: true,
    },
    'paths*': {
      title: 'Site paths',
      type: 'array',
      description:
        'Specifies which path to allow comments on. The "paths*" name means glob patterns can be used.',
      $comment: 'glob patterns can be used',
      items: { type: 'string', pattern: '^[\\s\\S]*$' },
      default: ['/**'],
      examples: ['/**', '!/private'],
    },
    cache: {
      title: 'Cache pending comments',
      description:
        "Enable comment caching on r3ply server. Cached comments can be fetched via front end javascript. They will only be cached for a short amount of time. See your r3ply server's confgiuration for more details as to how long.",
      type: 'boolean',
      default: false,
      $comment: 'the pending comments cache is very unstable still',
    },
    md_to_html: {
      title: 'Markdown to HTML conversion',
      description:
        'Converts markdown syntax to HTML tags. See also `sanitize_html`.',
      type: 'boolean',
      default: true,
    },
    sanitize_html: {
      title: 'Sanitize HTML',
      description:
        "HTML from comments should not be trusted. Only disable this if you reall know what you're doing. See also `allow_tags`.",
      type: 'boolean',
      default: true,
    },
    allow_tags: {
      title: 'HTML Tags to allow',
      description:
        'Only tags listed here will be allowed by the HTML sanitizer.',
      type: 'array',
      items: { type: 'string', pattern: '^[\\s\\S]*$' },
      // prettier-ignore
      default: ['a','br','p','span','strong','s','del','em','u','ul','ol','li','blockquote','hr','code','pre','table','tr','td','th','caption','thead','tbody','tfoot','kbd','mark','sub','small',],
      // prettier-ignore
      examples: [
        ['a','br','p','span','strong','s','del','em','u','ul','ol','li','blockquote','hr','code','pre','table','tr','td','th','caption','thead','tbody','tfoot','kbd','mark','sub','small',],
      ],
    },
    email: {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/comments/email.v0.0.1.json',
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyCommentsConfig = FromSchema<
  typeof comments,
  {
    references: [
      typeof email,
      typeof moderation,
      typeof github,
      typeof webhook,
      typeof local,
      typeof notify,
    ]
  }
>
