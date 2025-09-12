import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { notify } from '../notify'
import { email } from './email'
import { moderation, github, webhook, local } from '../moderation'
export * from './email'

export const comments = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/comments.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
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
    'paths*': {
      type: 'array',
      description: 'specifies which path to allow comments on',
      $comment: 'glob patterns can be used',
      items: { type: 'string', pattern: '^[\\s\\S]*$' },
      default: ['/**'],
      examples: ['/**', '!/private'],
    },
    cache: {
      type: 'boolean',
      description: 'Enable comment caching on r3ply server',
      default: false,
      $comment: 'the pending comments cache is very unstable still',
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
