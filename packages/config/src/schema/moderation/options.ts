import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const options = {
  title: 'Moderation options',
  description: 'Shared options across all moderation channels',
  $id: 'https://r3ply.com/schemas/v0.0.1/config/moderation/options.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  required: [],
  unevaluatedProperties: false,
  properties: {
    enabled: {
      title: 'Toggle on/off',
      description: 'If false, the moderation channel is off. Default is true.',
      type: 'boolean',
      default: true,
    },
    'allow*': {
      title: 'Allow list for this moderation channel',
      description:
        'If a comment author matches this list, e.g. their pseudonym, then that information will be passed to whatever is handling the moderation. Usually this will result in comment bypassing moderation, although it depends on how the moderation channel is implemented. The name that is matched against will depend on the upstream commenting channel. For example, comments via email will be a pseudo-anonymized string of the commenter\'s email address. The "allow*" name means glob syntax is allowed. Default is `[]`.',
      type: 'array',
      items: { type: 'string', pattern: '^[\\s\\S]*$', maxLength: 256 },
      default: [],
      examples: ['*@alice.com', 'bob@example.com'],
      $comment: 'Glob pattern.',
    },
    comments: {
      title: 'Comment sources',
      description:
        'Specify which commenting sources to allow for this moderation channel. Default is all comment sources.',
      type: 'array',
      items: {
        enum: ['email'],
      },
      default: ['email'],
    },
    'filter*': {
      title: 'Filter site',
      description:
        "Specifies which sites, by label, will have comments moderated. The 'filter*' name means a glob pattern can be provided. See `site` config key for more details. Default is ['**'] (all sites).",
      type: 'array',
      items: { type: 'string', pattern: '^[\\s\\S]*$' },
      default: ['**'],
      examples: ['test*', '!local'],
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyModerationOptions = FromSchema<typeof options>
