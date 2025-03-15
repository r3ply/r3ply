import { Result } from 'oxide.ts'
import { R3plySiteConfig } from '../../../config/dist/index.cjs'
import { CommentTemplateContext } from '../process'
import { tera } from '@r3ply/wasm'
import { Moderation } from './moderation'

// Note: this was copy/pasted from the gh-bot code but it should be considered temporary and the code should be properly packaged and imported from there
interface CreateCommentInRepoArgs {
  repo_owner: string
  repo_name: string
  source_branch: string
  target_branch: string
  comment_data: string
  new_comment_filepath: string
  commit_msg: string
  pr:
    | undefined
    | {
        msg_title: string
        msg_body: string
      }
}

interface R3plyGithubBot extends Moderation {}

// F/fetch stuff because often times the default fetch isn't used, e.g. in the context of a 'bound' service in cloudflare
export function R3plyGithubBot<F extends typeof fetch>(
  github_pw: string,
  fetch: F,
): R3plyGithubBot {
  async function send(
    comment: string,
    context: CommentTemplateContext,
    siteConfig: R3plySiteConfig,
  ) {
    if (siteConfig.comments.email.moderation.type != 'github')
      throw new Error(
        "Moderation type = 'github' is required to use GitHub Moderation",
      )
    const gh_args = create_pr_args(
      comment,
      context,
      siteConfig.comments.email.moderation,
    )
    // note: the origin of the URL is ignored if the fetch belongs to a bound service. A default `fetch` though will in fact use this. TODO: deploy the github app somewhere ontop of the r3ply.com domain.
    return fetch(
      new Request(
        'https://r3ply-github-app.spence.workers.dev/comments?strategy=GitHub:repo&open_pr=true',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${github_pw}`,
          },
          body: JSON.stringify(gh_args),
        },
      ),
    )
  }
  return {
    send: send,
  }
}

// separate function so it can be tested
function parse_repo(repo_url: string) {
  let repo_as_url = Result.safe(() => new URL(repo_url)).expect(
    `Unable to parse GitHub repo as URL: ${repo_url}`,
  )
  let [owner, repo] = Result.safe(() =>
    repo_as_url.pathname.match(/^\/(.+?)\/(.+?)\/?$/)!.slice(1, 3),
  ).expect('Unable to parse GitHub owner/name of repo')
  return { repo_owner: owner, repo_name: repo }
}

type R3plySiteConfigWithGithubModeration = R3plySiteConfig & {
  comments: { email: { moderation: { type: 'github' } } }
}
type GithubModerationConfig =
  R3plySiteConfigWithGithubModeration['comments']['email']['moderation']

// separate function so it can be tested
function create_pr_args(
  comment: string,
  context: CommentTemplateContext,
  github_config: GithubModerationConfig,
) {
  let { repo_owner, repo_name } = parse_repo(github_config.repo)
  const sanitized_context = JSON.parse(JSON.stringify(context))
  let source_branch = github_config.source_branch
  let target_branch = tera(github_config['target_branch_{}'], sanitized_context)
  let new_comment_filepath = tera(
    github_config['file_path_{}'],
    sanitized_context,
  )
  let commit_msg = tera(github_config['commit_msg_{}'], sanitized_context)
  let pr_msg_title = tera(github_config['pr_title_{}'], sanitized_context)
  let pr_msg_body = tera(github_config['pr_body_{}'], sanitized_context)
  let gh_args: CreateCommentInRepoArgs = {
    repo_owner,
    repo_name,
    source_branch,
    target_branch,
    comment_data: comment,
    new_comment_filepath,
    commit_msg,
    pr: {
      msg_title: pr_msg_title,
      msg_body: pr_msg_body,
    },
  }
  return gh_args
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('parse_repo', () => {
    expect(parse_repo('https://github.com/asimpletune/spenc.es')).toStrictEqual(
      { repo_owner: 'asimpletune', repo_name: 'spenc.es' },
    )
    expect(() => parse_repo('github.com/asimpletune/spenc.es')).toThrowError(
      /Unable to parse GitHub repo as URL/,
    )
    expect(() => parse_repo('https://github.com/')).toThrowError(
      /Unable to parse GitHub owner\/name of repo/,
    )
    expect(parse_repo('https://github.com/a/b/c/d/e/f')).toStrictEqual({
      repo_owner: 'a',
      repo_name: 'b/c/d/e/f',
    })
  })
  test('create_pr_args', () => {
    const comment = 'This is a comment'
    const context: CommentTemplateContext = {
      r3ply: {
        config_version: '0.0.1',
        server: 'r3ply.com',
        site: 'example.com',
      },
      comment: {
        id: '1234567890',
        id_8: '12345678',
        ts_rcvd: Math.floor(Date.now() / 1000).toString(),
        author: '9876543210',
        author_7: '7654321',
        subject: {
          url: 'https://example.com/blog/post/',
          origin: 'https://example.com',
          protocol: 'https:',
          hostname: 'example.com',
          path: '/blog/post',
          queryParams: undefined,
          fragment: undefined,
        },
        txt: 'this is a comment',
        md: undefined,
        html: undefined,
      },
    }
    const github_moderation: GithubModerationConfig = {
      enabled: true,
      type: 'github',
      repo: 'https://github.com/example.com/blog/',
      'file_path_{}': 'content/comments/{{ comment.id }}.txt',
      allow_list: ['*'],
      source_branch: 'main',
      'target_branch_{}': 'comment-{{ comment.author_7 }}-{{ comment.id_8 }}',
      'commit_msg_{}': 'new comment: \n> {{ comment.txt }}\n',
      'pr_title_{}': 'merge comment {{ comment.id_8 }}',
      'pr_body_{}':
        'this is a PR to merge comment from user {{ comment.author_7 }}, with content: \n> {{ comment.txt }}',
    }
    const result = create_pr_args(comment, context, github_moderation)
    expect(result).toStrictEqual({
      repo_owner: 'example.com',
      repo_name: 'blog',
      source_branch: 'main',
      target_branch: 'comment-7654321-12345678',
      comment_data: 'This is a comment',
      new_comment_filepath: 'content/comments/1234567890.txt',
      commit_msg: 'new comment: \n> this is a comment\n',
      pr: {
        msg_title: 'merge comment 12345678',
        msg_body:
          'this is a PR to merge comment from user 7654321, with content: \n' +
          '> this is a comment',
      },
    })
  })
}
