import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const signet = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/signet.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  $anchor: 'signet',
  description:
    'Configuration for each site, including domain, r3ply server, and signet information.',
  type: 'object',
  required: ['domain', 'r3ply', 'signet', 'issued'],
  properties: {
    domain: {
      type: 'string',
      format: 'hostname',
      description:
        "The domain that this configuration applies to. Wildcards are allowed (e.g., '*.example.com').",
    },
    r3ply: {
      type: 'string',
      format: 'hostname',
      description:
        "The r3ply server that this site expects to receive comments from. Wildcards are allowed (e.g., '*.r3ply.com').",
    },
    signet: {
      type: 'string',
      description:
        'The service-issued signet key used to generate deterministic HMAC identities for commenters.',
      pattern: '^[A-Za-z0-9_-]{22}$',
      examples: ['qhQ6YSUvQNLb1lCdw3kDRg'],
    },
    issued: {
      type: 'string',
      format: 'date',
      description:
        'The date this signet was issued. Used for rotation and versioning.',
      examples: ['2025-08-22'],
    },
    label: {
      title: 'Site label',
      description:
        'A human readable label of a site that. Useful for filtering further downstream. Note: while uniqueness is not technically required it is recommended.',
      type: 'string',
      pattern: '^[\\s\\S]+$',
      maxLength: 256,
      examples: ['test', 'test #1', 'production', 'website'],
    },
  },
  additionalProperties: false,
  examples: [
    {
      domain: 'site.local.test',
      r3ply: 'cli.r3ply.test',
      signet: 'J9cDuB3tBit3WDGQmvbCIw',
      issued: '2025-08-20',
    },
    {
      domain: 'spenc.es',
      r3ply: 'r3ply.com',
      signet: 'qhQ6YSUvQNLb1lCdw3kDRg',
      issued: '2025-08-22',
    },
  ],
} as const satisfies JSONSchema & Schema
export type R3plySignetConfig = FromSchema<typeof signet>
