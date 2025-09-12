import { Schema } from '@exodus/schemasafe'
import { FromSchema, JSONSchema } from 'json-schema-to-ts'

export const github = {
  $id: 'https://r3ply.com/schemas/v0.0.1/config/moderation/github.v0.0.1.json',
  $schema: 'http://json-schema.org/draft-04/schema#',
  title: 'Github moderation',
  description: 'Specify how comments should be sent to GitHub for moderation.',
  type: 'object',
  required: ['owner', 'repo', 'file_path_{}'],
  unevaluatedProperties: false,
  properties: {
    owner: {
      title: 'Repo owner',
      description: 'This should be the user or org name.',
      type: 'string',
      pattern: '^[\\S]+$',
      maxLength: 1024,
      examples: ['asimpletune', 'r3ply'],
    },
    repo: {
      title: 'Repo name',
      description: 'Name of GitHub repository.',
      type: 'string',
      pattern: '^[\\S]+$',
      maxLength: 1024,
      examples: ['yoursite'],
    },
    'file_path_{}': {
      title: 'File path template (string)',
      description:
        'Specifies the file path of the new comment. The "file_path_{}" name means the string will be interpreted as a template. Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
      pattern: '^(?!\\s*/)[\\s\\S]*$',
      maxLength: 1024,
      examples: ['content/comments/{{ comment.id | slice(end=8) }}.md'],
      $comment: 'Template string. Can never begin with a `/`.',
    },
    'base_branch_{}': {
      title: 'Base branch template (string)',
      description:
        'Specifies the base branch of the new comment. The "base_branch_{}" name means the string will be interpreted as a template. Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
      pattern: '^[\\s\\S]*$',
      maxLength: 128,
      default: 'main',
      $comment: 'Template string.',
    },
    'head_branch_{}': {
      title: 'Head branch template (string)',
      description:
        'Specifies the head branch of the new comment. The "head_branch_{}" name means the string will be interpreted as a template. Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
      pattern: '^[\\s\\S]*$',
      maxLength: 256,
      default: 'comment-{{ comment.ts_rcvd }}-{{ comment.id[:8] }}.md',
      examples: ['{{ comment.id[:8] }}-{{ comment.ts_rcvd }}'],
      $comment: 'Template string.',
    },
    'commit_msg_{}': {
      title: 'Commit message template (string)',
      description:
        'Specifies the commit message of the new comment. The "commit_msg_{}" name means the string will be interpreted as a template. Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
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
      title: 'Commit message template (file)',
      description:
        'Specifies the commit message of the new comment. The "&commit_msg_{}" name means the string will be interpreted as reference to a file that contains a string template. Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
      format: 'uri-reference',
      $comment: 'This is a file reference.',
    },
    'pr_title_{}': {
      title: 'PR title template (string)',
      description:
        'Specifies the PR title of the new comment. The "pr_title_{}" name means the string will be interpreted as a template. Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
      pattern: '^[\\s\\S]*$',
      maxLength: 1024,
      default:
        'New comment ({{ comment.id[:8] }}) on {{ comment.subject.url }} by author `{{ author.pseudonym[:7] }}`',
      $comment: 'Template string.',
    },
    'pr_body_{}': {
      title: 'PR body template (string)',
      description:
        'Specifies the PR body of the new comment. The "pr_body_{}" name means the string will be interpreted as a template. Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
      pattern: '^[\\s\\S]*$',
      maxLength: 2096,
      default: '',
      $comment: 'Template string.',
    },
    '&pr_body_{}': {
      title: 'PR body (file)',
      description:
        'Specifies the PR body of the new comment. The "&pr_body_{}" name means the string will be interpreted as reference to a file that contains a string template. Tera 2 is the templating engine. See the r3ply or tera docs for more info.',
      type: 'string',
      format: 'uri-reference',
      $comment: 'File reference.',
    },
    github_host: {
      title: 'Github host',
      description: 'Only useful for enterprise instances of GitHub.',
      type: 'string',
      format: 'hostname',
      default: 'github.com',
      $comment: "You probable don't want to change this.",
    },
  },
} as const satisfies JSONSchema & Schema
export type R3plyGithubConfig = FromSchema<typeof github>
