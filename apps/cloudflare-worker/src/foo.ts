import { R3ply, comments, util, moderation } from '@r3ply/lib'
import { GistClient, GistFiles } from './state/gist'
import { Option } from 'oxide.ts'
import { CommentState } from './state/d1'

export function foo(
  r3ply: R3ply,
  deps: {
    anonymize_key: string
    encrypt_key: string
    github_pw: string
    comment_state: Option<CommentState>
    gist_client: Option<GistClient>
  },
) {
  const github_moderation_channel = moderation.GitHubModeration(
    github_api_fetcher(deps.github_pw),
  )
  const email_handler = r3ply.comments.viaEmail(
    deps.anonymize_key,
    deps.encrypt_key,
    {
      receive: mk_cf_receive('email', deps.comment_state),
      accept: mk_cf_accept(deps.gist_client, deps.comment_state),
    },
    [github_moderation_channel],
  )
  return email_handler
}

function mk_cf_receive(source: 'email', comment_state: Option<CommentState>) {
  const receive: typeof comments.receive = () => {
    const lib_result = comments.receive()
    const db_result = comment_state.map((comment_state) => {
      return comment_state.receive_comment(source).then((result) => {
        if (result.error) {
          console.error(
            `Error receiving comment, defaulting to library. Message: ${result.error}`,
          )
          return lib_result
        } else return result.results[0]
      })
    })
    return db_result.unwrapOr(lib_result)
  }
  return receive
}

function mk_cf_accept(
  gist_client: Option<GistClient>,
  comment_state: Option<CommentState>,
) {
  const accept: typeof comments.email.accept = async (
    email_bytes: Uint8Array,
    metadata: comments.CommentMetadata,
  ): Promise<comments.email.AcceptedEmail> => {
    // Accept email by calling the r3ply library's accept function
    const accepted_email = await comments.email.accept(email_bytes, metadata)
    // If there's a gist client, use it, and return its results while logging any errors
    const accepted_gist_result = gist_client.map((r3ply_gist_client) => {
      // Create list of files
      const accepted_files: GistFiles = {
        [accepted_email.messageId + '.eml']: {
          content: new TextDecoder('utf-8').decode(email_bytes),
        },
      }
      // Use the gist client to create a gist with accepted files
      const accepted_gist_result = r3ply_gist_client
        .create_gist(
          accepted_files,
          `comment via email from: ${accepted_email.from.value}, to:${JSON.stringify(accepted_email.to.map((to) => `${to.name} <${to.address}>`))}`,
        )
        // Then console.error any issues
        .then((gist_result) => {
          if (gist_result.isErr()) {
            console.error(
              `Gist result error for Message-ID '${accepted_email.messageId}'! ${gist_result.unwrapErr().message}`,
            )
          }
          return gist_result
        })
      // Return gist results
      return accepted_gist_result
    })
    // If there's a db client, use it
    const update_state = comment_state.map(async (comment_state) => {
      const gist_result = await accepted_gist_result
        .into()
        ?.then((result) => result.into())
      const accept_db_result = await comment_state.viaEmail.accept(
        metadata.comment_id,
        accepted_email.messageId,
        gist_result,
      )
      if (accept_db_result.error) {
        console.error(
          `issue updating DB with accept result for Message-ID '${accepted_email.messageId}'! ${accept_db_result.error}`,
        )
      }
      return accepted_email
    })

    // Wait and return accepted email after updating state, or return it right away
    return update_state.into() ?? accepted_email
  }
  return accept
}

/**
 * Partially applies password to GitHub bot dependency to perform API call
 *
 * @param github_pw the password to access the r3ply GitHub bot
 * @returns A dependency for performing API calls to the r3ply GitHub bot
 */
function github_api_fetcher(
  github_pw: string,
): moderation.PerformGitHubApiFetch {
  const result: moderation.PerformGitHubApiFetch = async (
    args: moderation.CreateCommentInRepoArgs,
  ) => {
    const request = new Request(
      // the origin of the URL is ignored if the fetch belongs to a bound service.
      'https://r3ply-github-app.spence.workers.dev/comments?strategy=GitHub:repo&open_pr=true',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${github_pw}`,
        },
        body: JSON.stringify(args),
      },
    )
    return fetch(request).then((response) => response.json())
  }
  return result
}
