import { comments, moderation } from '@r3ply/lib'
import { Option, Result } from 'oxide.ts'
import { CommentState } from './state/d1'

export function mk_cf_receive(
  source: 'email',
  comment_state: Option<CommentState>,
) {
  const receive: typeof comments.receive = async () => {
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

export function mk_cf_accept(
  message_id: string,
  comment_state: Option<CommentState>,
) {
  const accept: typeof comments.email.accept = async (...params) => {
    const [, { metadata }] = params
    const accepted_email = comments.email.accept(...params)
    return Result.safe(accepted_email).then((accepted_email_result) => {
      const db_result = comment_state.map((comment_state) => {
        return comment_state.viaEmail.accepted(
          metadata.comment_id,
          message_id,
          accepted_email_result.isOk() ? 'accepted' : 'unacceptable',
        )
      })
      return db_result.into()?.then((_) => accepted_email) ?? accepted_email
    })
  }
  return accept
}

export function mk_cf_deliverable(comment_state: Option<CommentState>) {
  const deliverable: typeof comments.email.deliverable = async (
    ...params: Parameters<typeof deliverable>
  ) => {
    const [, { metadata }] = params
    const deliverable = comments.email.deliverable(...params)
    return Result.safe(deliverable).then((deliverable_result) => {
      const db_result = comment_state.map((comment_state) => {
        return comment_state.viaEmail.deliverable(
          metadata.comment_id,
          deliverable_result.isOk() ? 'deliverable' : 'undeliverable',
        )
      })
      return db_result.into()?.then((_) => deliverable) ?? deliverable
    })
  }
  return deliverable
}

export function mk_cf_prepare(comment_state: Option<CommentState>) {
  const prepare: typeof comments.email.prepare = async (
    ...params: Parameters<typeof prepare>
  ) => {
    const [, { metadata }] = params
    const prepared = comments.email.prepare(...params)
    return Result.safe(prepared).then((prepared_result) => {
      const db_result = comment_state.map((comment_state) => {
        return comment_state.viaEmail.prepared(
          metadata.comment_id,
          prepared_result.isOk() ? 'prepared' : 'unpreparable',
        )
      })
      return db_result.into()?.then((_) => prepared) ?? prepared
    })
  }
  return prepare
}

export function mk_cf_process(comment_state: Option<CommentState>) {
  const process: typeof comments.process = async (
    ...params: Parameters<typeof process>
  ) => {
    const [, { metadata }] = params
    const proccessed = comments.process(...params)

    return Result.safe(proccessed).then((processed_result) => {
      const db_result = comment_state.map((comment_state) => {
        return comment_state.viaEmail.processed(
          metadata.comment_id,
          processed_result.isOk() ? 'processed' : 'unprocessable',
        )
      })
      return db_result.into()?.then((_) => proccessed) ?? proccessed
    })
  }
  return process
}

/**
 * Partially applies password to GitHub bot dependency to perform API call
 *
 * @param github_pw the password to access the r3ply GitHub bot
 * @returns A dependency for performing API calls to the r3ply GitHub bot
 */
export function github_api_fetcher(
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
