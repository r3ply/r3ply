import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const github = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/github.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  type: 'object',
  required: ['owner', 'repo', 'file_path_{}'],
  unevaluatedProperties: false,
  properties: {
    owner: {
      type: 'string',
      description: 'Name of GitHub owner.',
      pattern: '^[\\S]+$',
      maxLength: 1024,
      examples: ['asimpletune'],
    },
    repo: {
      type: 'string',
      description: 'Name of GitHub repository.',
      pattern: '^[\\S]+$',
      maxLength: 1024,
      examples: ['yoursite'],
    },
    'file_path_{}': {
      type: 'string',
      description: 'File path template of new comment.',
      pattern: '^(?!\\s*/)[\\s\\S]*$',
      maxLength: 1024,
      examples: ['content/comments/{{ comment.id | slice(end=8) }}.md'],
      $comment: 'Template string. Can never begin with a `/`.',
    },
    'base_branch_{}': {
      type: 'string',
      description: 'Name of the base branch.',
      pattern: '^[\\s\\S]*$',
      maxLength: 128,
      default: 'main',
      $comment: 'Template string.',
    },
    'head_branch_{}': {
      type: 'string',
      description: 'Name of head branch.',
      pattern: '^[\\s\\S]*$',
      maxLength: 256,
      default: 'comment-{{ comment.ts_rcvd }}-{{ comment.id[:8] }}.md',
      examples: ['{{ comment.id[:8] }}-{{ comment.ts_rcvd }}'],
      $comment: 'Template string.',
    },
    'commit_msg_{}': {
      type: 'string',
      description: 'Commit message template.',
      pattern: '^[\\s\\S]*$',
      maxLength: 2096,
      default: `Comment submitted:
Sender: {{ author.pseudonym }}
Timestamp: {{ comment.ts_rcvd }}
Subject: {{ comment.subject.url }}
Comment: > {{ comment.txt | split(pat="\n") | join(sep="> ") }}`,
      $comment: 'Template string.',
    },
    '&commit_msg_{}': {
      type: 'string',
      description: 'Commit message template.',
      format: 'uri-reference',
      $comment: 'This is a file reference.',
    },
    'pr_title_{}': {
      type: 'string',
      description: 'Pull request title template.',
      pattern: '^[\\s\\S]*$',
      maxLength: 1024,
      default:
        'New comment ({{ comment.id[:8] }}) on {{ comment.subject.url }} by author `{{ author.pseudonym[:7] }}`',
      $comment: 'Template string.',
    },
    'pr_body_{}': {
      type: 'string',
      description: 'Pull request body template.',
      pattern: '^[\\s\\S]*$',
      maxLength: 2096,
      default: '',
      $comment: 'Template string.',
    },
    '&pr_body_{}': {
      type: 'string',
      description: 'Pull request body template.',
      format: 'uri-reference',
      $comment: 'File reference.',
    },
    github_host: {
      type: 'string',
      format: 'hostname',
      description: 'The hostname of the github service.',
      default: 'github.com',
      $comment: "You probable don't want to change this.",
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyGithubConfig = FromSchema<typeof github>
