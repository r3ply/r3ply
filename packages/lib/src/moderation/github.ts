import { match, Result } from 'oxide.ts'
import {
  R3plyModerationConfig,
  R3plyNotifyConfig,
  R3plySiteConfig,
} from '@r3ply/config'
import { CommentTemplateContext } from '../process'
import { tera } from '@r3ply/wasm'
import { Moderation } from './moderation'

// Note: this was copy/pasted from the gh-bot code but it should be considered temporary and the code should be properly packaged and imported from there
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

export interface GitHubModerationContext {
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
      id: number
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

export interface R3plyGithubBot
  extends Moderation<CreateCommentInRepoArgs, GitHubModerationContext & CommentTemplateContext> {}

// F/fetch stuff because often times the default fetch isn't used, e.g. in the context of a 'bound' service in cloudflare
export function R3plyGithubBot<F extends typeof fetch>(
  github_pw: string,
  fetch: F,
): R3plyGithubBot {
  async function send(
    comment: string,
    context: CommentTemplateContext,
    moderationConfig: R3plyModerationConfig,
    notifyConfig?: R3plyNotifyConfig,
  ) {
    // throw early to guarantee thereafter it is always a github moderation config
    if (moderationConfig.type != 'github')
      throw new Error(
        "Moderation type = 'github' is required to use GitHub Moderation",
      )
    // Prepare the arguments supplied to the GitHub bot by resolving any remote template references
    const gh_args = await (async () => {
      const head_branch = moderationConfig['head_branch_{}']
      const file_path = moderationConfig['file_path_{}']
      let commit_msg = moderationConfig['commit_msg_{}'] ?? ''
      const pr_title = moderationConfig['pr_title_{}']
      let pr_body = moderationConfig['pr_body_{}'] ?? ''
      return create_pr_args(comment, context, moderationConfig, {
        head_branch: head_branch,
        file_path,
        commit_msg,
        pr_title,
        pr_body,
      })
    })()

    // note: the origin of the URL is ignored if the fetch belongs to a bound service. A default `fetch` though will in fact use this. TODO: deploy the github app somewhere ontop of the r3ply.com domain.
    const gh_rep = fetch(
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
    ).then((gh_rep) => gh_rep.json())

    const gh_context = await gh_rep.then((gh_rep) => {
      // these properties come from just the GitHub documentation and don't have actual type safety, although they do have a scheme
      const gh_context: GitHubModerationContext = {
        github: {
          repo: {
            owner: gh_args.repo_owner,
            name: gh_args.repo_name,
            url: gh_args.repo_url,
          },
          comment: {
            path: gh_args.new_comment_filepath,
          },
          commit: {
            message: gh_args.commit_msg,
          },
          pr: {
            branch: {
              base: gh_args.source_branch,
              head: gh_args.target_branch,
            },
            id: gh_rep.id,
            url: gh_rep.url,
            html_url: gh_rep.html_url,
            diff_url: gh_rep.diff_url,
            patch_url: gh_rep.patch_url,
            issue_url: gh_rep.issue_url,
            commits_url: gh_rep.commits_url,
            comments_url: gh_rep.comments_url,
            statuses_url: gh_rep.statuses_url,
            number: gh_rep.number,
            state: gh_rep.state,
            title: gh_rep.title,
            body: gh_rep.body,
            created_at: gh_rep.created_at,
            commits: gh_rep.commits,
            additions: gh_rep.additions,
            deletions: gh_rep.deletions,
            changed_files: gh_rep.changed_files,
          },
        },
      }
      return gh_context
    })

    let commenter_notif: string | undefined
    let moderator_notif: string | undefined
    if (notifyConfig) {
      if (notifyConfig.commenter) {
        if (notifyConfig.notify_commenter_upon_submission) {
          let commenter_template = notifyConfig['comment_submitted_notif_{}']
          if (commenter_template) {
            commenter_notif = match(
              Result.safe(() =>
                tera(commenter_template, { ...context, ...gh_context }),
              ),
              {
                Ok: (commenter_notif) => commenter_notif,
                Err: (error) => {
                  console.error(
                    `Error binding commenter notification to context, original message:\n\n${error.message}\n\nContext:\n\n\`\`\`TS\n${JSON.stringify(context, null, 2)}\n\`\`\``,
                  )
                  throw error
                },
              },
            )
          }
        }
      }
      if (notifyConfig.moderator) {
        if (notifyConfig.notify_moderator_upon_receipt) {
          let moderator_template = notifyConfig['comment_received_notif_{}']
          if (moderator_template) {
            moderator_notif = match(
              Result.safe(() =>
                tera(moderator_template, { ...context, ...gh_context }),
              ),
              {
                Ok: (moderator_notif) => moderator_notif,
                Err: (error) => {
                  console.error(
                    `Error binding moderator notification to context, original message:\n\n${error.message}\n\nContext:\n\n\`\`\`TS\n${JSON.stringify(context, null, 2)}\n\`\`\``,
                  )
                  throw error
                },
              },
            )
          }
        }
      }
    }

    return {
      args: gh_args,
      context: { ...context, ...gh_context },
      commenter_notif,
      moderator_notif,
    }
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
  templates: {
    head_branch: string
    file_path: string
    commit_msg: string
    pr_title: string
    pr_body: string
  },
) {
  let { repo_owner, repo_name } = parse_repo(github_config.repo)
  const sanitized_context = JSON.parse(JSON.stringify(context))
  let base_branch = github_config.base_branch
  let head_branch = tera(templates.head_branch, sanitized_context)
  let new_comment_filepath = tera(
    github_config['file_path_{}'],
    sanitized_context,
  )
  let commit_msg = tera(templates.commit_msg, sanitized_context)
  let pr_msg_title = tera(templates.pr_title, sanitized_context)
  let pr_msg_body = tera(templates.pr_body, sanitized_context)
  let gh_args: CreateCommentInRepoArgs = {
    repo_owner,
    repo_name,
    repo_url: github_config.repo,
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
      base_branch: 'main',
      'head_branch_{}': 'comment-{{ comment.author_7 }}-{{ comment.id_8 }}',
      'commit_msg_{}': 'new comment: \n> {{ comment.txt }}\n',
      'pr_title_{}': 'merge comment {{ comment.id_8 }}',
      'pr_body_{}':
        'this is a PR to merge comment from user {{ comment.author_7 }}, with content: \n> {{ comment.txt }}',
    }
    const result = create_pr_args(comment, context, github_moderation, {
      head_branch: github_moderation['head_branch_{}'],
      file_path: github_moderation['file_path_{}'],
      commit_msg: github_moderation['commit_msg_{}'] ?? '',
      pr_title: github_moderation['pr_title_{}'],
      pr_body: github_moderation['pr_body_{}'] ?? '',
    })
    expect(result).toStrictEqual({
      repo_owner: 'example.com',
      repo_name: 'blog',
      repo_url: "https://github.com/example.com/blog/",
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
