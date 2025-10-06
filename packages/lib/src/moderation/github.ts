import { Result } from 'oxide.ts'
import { R3plyGithubConfig } from '@r3ply/schema/config/moderation'
import { CommentTemplateContext } from '../comments/process'
import { tera } from '@r3ply/wasm'
import {
  ModerationChannel,
  ModerationChannelHandler,
  ModerationRequest,
  ModerationTicket,
} from '.'

/**
 * The arguments that are sent to the r3ply GitHub bot to create a PR.
 *
 * TODO: the args args should probably be left generic so people can use any GitHub bot they like
 * TODO: this was copy/pasted from the gh-bot code but it should be considered temporary and the code should be properly versioned, packaged, and imported from there
 */
export interface CreateCommentInRepoArgs {
  repo_owner: string
  repo_name: string
  repo_url: string
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

/**
 * The result from a request for moderation via the r3ply github bot.
 *
 * This is expected to be mixed-in via the intersection `&` operator, for further template processing, i.e. processing notifications.
 */
export type GitHubModerationContext = {
  github: {
    repo: {
      owner: string
      name: string
      url: string
    }
    comment: {
      path: string
    }
    commit: {
      message: string
    }
    pr: {
      branch: {
        base: string
        head: string
      }
      url: string
      html_url: string
      diff_url: string
      patch_url: string
      issue_url: string
      commits_url: string
      comments_url: string
      statuses_url: string
      number: number
      state: 'open' | 'closed'
      title: string
      body: string | null
      created_at: string
      commits: number
      additions: number
      deletions: number
      changed_files: number
    }
  }
}

/**
 * A request for moderation via the r3ply GitHub bot
 */
export type GitHubModerationRequest = ModerationRequest<
  'github',
  CreateCommentInRepoArgs,
  GitHubModerationContext,
  Error
>

/**
 * A ticket acknowledging a request for moderation
 */
export type GitHubModerationTicket = ModerationTicket<
  'github',
  GitHubModerationContext,
  Error
>

/**
 * A function that performs the API call to the r3ply GitHub bot.
 *
 * You will have to partially apply in advance a request that has the github_app password.
 *
 * @example
 *
 *  const api_fetcher: PerformGitHubApiFetch = (args: CreateCommentInRepoArgs) => {
 *    const request = new Request(
 *    // the origin of the URL is ignored if the fetch belongs to a bound service.
 *    'https://r3ply-github-app.spence.workers.dev/comments?strategy=GitHub:repo&open_pr=true',
 *    {
 *      method: 'POST',
 *      headers: {
 *        'Content-Type': 'application/json',
 *        Authorization: `Bearer ${github_pw}`,
 *      },
 *      body: JSON.stringify(args)
 *    })
 *    ...
 *  }
 *
 * Then for example you can fetch the request and further process the response
 *
 * @see CreateCommentInRepoArgs
 * @see GitHubModerationContext
 */
export type PerformGitHubApiFetch = (
  args: CreateCommentInRepoArgs,
) => Promise<GitHubModerationContext['github']>

/**
 * A GitHub moderation channel
 *
 * @see ModerationChannel
 */
export interface GitHubModeration<InCtx extends CommentTemplateContext>
  extends ModerationChannel<
    'github',
    InCtx,
    CreateCommentInRepoArgs,
    GitHubModerationContext,
    Error
  > {}

/**
 * A GitHub moderation channel handler
 *
 * @see ModerationChannelHandler
 */
export interface GitHubModerationHandler<InCtx extends CommentTemplateContext>
  extends ModerationChannelHandler<
    'github',
    InCtx,
    CreateCommentInRepoArgs,
    GitHubModerationContext,
    Error
  > {}

/**
 * Convenience function to create an instance of a GitHub moderation channel
 *
 * @param api_caller a dependency to perform the api call
 * @returns an instance of GitHubModeration
 *
 * @see PerformGitHubApiFetch
 */
export function GitHubModeration<InCtx extends CommentTemplateContext>(
  api_caller: PerformGitHubApiFetch,
): GitHubModeration<InCtx> {
  const result: GitHubModeration<InCtx> = {
    type: 'github',
    handler: function (
      config: R3plyGithubConfig,
    ): ModerationChannelHandler<
      'github',
      InCtx,
      CreateCommentInRepoArgs,
      GitHubModerationContext,
      Error
    > {
      return mk_gh_mod_handler(api_caller, config)
    },
  }
  return result
}

/**
 * Internal implementation for creating a GitHubModerationHandler
 *
 * @param api_call a dependency to perform the api call
 * @param config the configuration for how to handle the moderation request
 * @returns an instance of a GitHubModerationHandler
 */
function mk_gh_mod_handler<InCtx extends CommentTemplateContext>(
  api_call: PerformGitHubApiFetch,
  config: R3plyGithubConfig,
): GitHubModerationHandler<InCtx> {
  const result: GitHubModerationHandler<InCtx> = {
    type: 'github',
    config,
    prepare: function (
      comment: string,
      context: InCtx,
      bypass: boolean,
    ): GitHubModerationRequest {
      const request: GitHubModerationRequest = {
        type: 'github',
        args: create_pr_args(comment, context, config),
        bypass,
        send: function (): Promise<GitHubModerationTicket> {
          return Result.safe(api_call(this.args))
            .then((r) => r.map((rep) => ({ github: rep })))
            .then((details) => ({ type: 'github', details }))
        },
      }
      return request
    },
  }
  return result
}

/**
 * Internal implementation for creating PR arguments. Separate so it can more easily be tested.
 *
 * @param comment the comment
 * @param context the template context
 * @param config the github moderation config
 * @returns
 */
function create_pr_args(
  comment: string,
  context: CommentTemplateContext,
  config: R3plyGithubConfig,
): CreateCommentInRepoArgs {
  const sanitized_context = JSON.parse(JSON.stringify(context))
  let base_branch = tera(config['base_branch_{}'], sanitized_context)
  let head_branch = tera(config['head_branch_{}'], sanitized_context)
  let new_comment_filepath = tera(config['file_path_{}'], sanitized_context)
  let commit_msg = tera(config['commit_msg_{}'], sanitized_context)
  let pr_msg_title = tera(config['pr_title_{}'], sanitized_context)
  let pr_msg_body = tera(config['pr_body_{}'], sanitized_context)

  return {
    repo_owner: config.owner,
    repo_name: config.repo,
    repo_url: `https://github.com/${config.owner}/${config.repo}`,
    source_branch: base_branch,
    target_branch: head_branch,
    comment_data: comment,
    new_comment_filepath,
    commit_msg,
    pr: {
      msg_title: pr_msg_title,
      msg_body: pr_msg_body,
    },
  }
}

if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  test('create PR args', () => {
    const context: CommentTemplateContext = {
      r3ply: {
        config_version: '0.0.1',
        server: 'r3ply.com',
        site: 'spenc.es',
        signet: 'a'.repeat(22),
        issued: '2025-10-04',
      },
      author: {
        pseudonym: 'shakesp34r',
        token: 'abc123',
      },
      comment: {
        id: 'xyz789',
        ts_rcvd: '123',
        subject: {
          url: 'https://example.com/',
          origin: 'https://example.com',
          protocol: 'https:',
          hostname: 'example.com',
          path: '/',
          queryParams: undefined,
          fragment: undefined,
        },
        txt: 'test comment',
        md: undefined,
        html: undefined,
      },
    }
    const config: R3plyGithubConfig = {
      enabled: false,
      'allow*': [],
      owner: 'asimpletune',
      repo: 'spenc.es',
      'file_path_{}': 'twinkle/twinkle',
      'base_branch_{}': 'little',
      'head_branch_{}': 'star',
      'commit_msg_{}': 'how I',
      'pr_title_{}': 'wonder',
      'pr_body_{}': 'what you are',
      github_host: 'github.com',
    }
    const expected = {
      repo_owner: 'asimpletune',
      repo_name: 'spenc.es',
      repo_url: 'https://github.com/asimpletune/spenc.es',
      source_branch: 'little',
      target_branch: 'star',
      comment_data: 'test comment',
      new_comment_filepath: 'twinkle/twinkle',
      commit_msg: 'how I',
      pr: { msg_title: 'wonder', msg_body: 'what you are' },
    }
    expect(create_pr_args('test comment', context, config)).toStrictEqual(
      expected,
    )
  })
}
