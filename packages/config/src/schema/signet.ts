import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'
import { extra } from './extra'

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
      title: 'Site domain',
      description:
        'The domain that this configuration applies to. Hostname only, protocol, port, or path.',
      type: 'string',
      format: 'hostname',
    },
    r3ply: {
      title: 'r3ply service',
      description:
        'The r3ply server that this site expects to receive comments from. Hostname only, protocol, port, or path (note: you have to add a new site config item in order to add another r3ply service for the same site domain).',
      type: 'string',
      format: 'hostname',
    },
    signet: {
      title: 'signet',
      description:
        'The r3ply-issued signet key. It is only valid per site x r3ply service x issue date. See docs for more info.',
      type: 'string',
      pattern: '^[A-Za-z0-9_-]{22}$',
      examples: ['qhQ6YSUvQNLb1lCdw3kDRg'],
    },
    issued: {
      title: 'Issue date (of signet)',
      description:
        'The date this signet was issued. Used for rotation and versioning of signet key.',
      type: 'string',
      format: 'date',
      examples: ['2025-08-22'],
    },
    label: {
      title: 'Site label',
      description:
        'A human readable label of a site that. Useful for filtering further downstream (note: while uniqueness is not technically required it is recommended).',
      type: 'string',
      pattern: '^[\\s\\S]+$',
      maxLength: 256,
      examples: ['test', 'test #1', 'production', 'website'],
    },
    extra: {
      $ref: 'https://r3ply.com/schemas/v0.0.1/config/extra.v0.0.1.json',
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
export type R3plySignetConfig = FromSchema<
  typeof signet,
  {
    references: [typeof extra]
  }
>
