import { Result } from 'oxide.ts'
import { Util } from '../util'
import { CommentSource } from '../r3ply_old'
import { AcceptedEmail } from '../../packages/comments/src/accept'
import { CommentMetadata } from '../../packages/comments/src/prepare'
import { OmitFirstParameter } from '../types/util'
import { ReturnTypeOf } from '@octokit/core/types'

type CommentViaEmailStates =
  | 'accepted'
  | 'deliverable'
  | 'undeliverable'
  | 'prepared'
  | 'unpreparable'
  | 'processed'
  | 'unprocessable'
  | 'delivered'
type PartialCommentViaEmailStates<T extends CommentViaEmailStates> = T

export interface CommentState {
  viaEmail: {
    accept: OmitFirstParameter<typeof accept_new_comment_via_email>
    deliverable: (
      comment_id: string,
      state: PartialCommentViaEmailStates<'deliverable' | 'undeliverable'>,
    ) => ReturnType<typeof update_comment_via_email_state>
    prepared: (
      comment_id: string,
      state: PartialCommentViaEmailStates<'prepared' | 'unpreparable'>,
    ) => ReturnType<typeof update_comment_via_email_state>
    processed: (
      comment_id: string,
      state: PartialCommentViaEmailStates<'processed' | 'unprocessable'>,
    ) => ReturnType<typeof update_comment_via_email_state>
  }
}

export function CommentState(d1: D1Database) {
  return {
    viaEmail: {
      accept: (message_id: string, gist?: { id: string; url: string }) => accept_new_comment_via_email(d1, message_id, gist),
      deliverable: (comment_id: string, deliverability: 'deliverable' | 'undeliverable') =>
        update_comment_via_email_state(d1, comment_id, deliverability),
      prepared: (comment_id: string, preparability: 'prepared' | 'unpreparable') =>
        update_comment_via_email_state(d1, comment_id, preparability),
      processed: (comment_id: string, processability: 'processed' | 'unprocessable') =>
        update_comment_via_email_state(d1, comment_id, processability),
    },
  }
}

async function accept_new_comment_via_email(d1: D1Database, message_id: string, gist?: { id: string; url: string }) {
  const comment_state: CommentViaEmailStates = 'accepted'
  return d1
    .prepare(
      `
		INSERT INTO comments_via_email (id, message_id, state, files_id, files_url)
		VALUES (?1, ?2, ?3, ?4, ?5)
		RETURNING id as comment_id, strftime('%s', created_utc) AS ts_rcvd, files_id as gist_id, files_url as gist_url;`,
    )
    .bind(crypto.randomUUID(), message_id, comment_state, gist?.id ?? null, gist?.url ?? null)
    .run<CommentMetadata & { gist_id: string | null; gist_url: string | null }>()
}

async function update_comment_via_email_state(
  d1: D1Database,
  comment_id: string,
  state: PartialCommentViaEmailStates<'deliverable' | 'undeliverable' | 'prepared' | 'unpreparable' | 'processed' | 'unprocessable'>,
) {
  return d1
    .prepare(`UPDATE comments_via_email SET state = ? WHERE id = ?`)
    .bind(state, comment_id)
    .run()
    .then((_) => Promise.resolve())
}

async function insert_new_comment(d1: D1Database, source: CommentSource, message_id: string | null = null) {
  let id = Util.uuid_v4_unhyphenated()
  let stmt = d1
    .prepare('INSERT INTO comments_via_email (id, message_id, c_source, c_state, c_notif, m_notif) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(id, message_id, source, 'received', 0, 0)
  return Result.safe(
    stmt
      .run()
      .then((_) => {
        return { id }
      })
      .catch((error) => {
        let err_msg = `Error inserting new comment into DB, more info: \n${error}`
        throw new Error(err_msg)
      }),
  )
}

async function insert_new_comment2(d1: D1Database, source: CommentSource, message_id: string, metadata: { id: string; ts_rcvd: string }) {
  let id = crypto.randomUUID()
  let stmt = d1
    .prepare(
      `INSERT INTO comments_via_email (id, message_id, c_source, c_state, c_notif, m_notif) VALUES (?1, ?2, ?3, ?4, ?5, ?6) RETURNING id, created_at, strftime('%s', created_at) AS created_at_epoch;`,
    )
    .bind(id, message_id, source, 'received', 0, 0)
  return Result.safe(
    stmt
      .run()
      .then((_) => {
        return { id }
      })
      .catch((error) => {
        let err_msg = `Error inserting new comment into DB, more info: \n${error}`
        throw new Error(err_msg)
      }),
  )
}

// Update a comment record with a reference to a gist, along with updating its status to 'Stored'
async function update_comment_with_gist(d1: D1Database, comment: { id: string }, gist: { url: string; id: string }) {
  return Result.safe(
    d1
      .prepare(`UPDATE comments_via_email SET c_state = ?, c_files_url = ?, c_files_id = ? WHERE id = ?`)
      .bind('stored', gist.url, gist.id, comment.id)
      .run()
      .catch((error) => {
        let err_msg = `Error updating state in DB to 'Stored', more info: \n${error}`
        throw new Error(err_msg)
      }),
  )
}

// Update a comment record's state to 'Prepared'
async function update_comment_state_to_prepared(d1: D1Database, comment: { id: string }) {
  return Result.safe(
    d1
      .prepare(`UPDATE comments_via_email SET c_state = ? WHERE id = ?`)
      .bind('prepared', comment.id)
      .run()
      .catch((error) => {
        let err_msg = `Error updating state in DB to 'Prepared' in DB, more info: \n${error}`
        throw new Error(err_msg)
      }),
  )
}

// Update a comment record's state to 'Processed'
async function update_comment_state_to_processed(d1: D1Database, comment: { id: string }) {
  return Result.safe(
    d1
      .prepare(`UPDATE comments_via_email SET c_state = ? WHERE id = ?`)
      .bind('processed', comment.id)
      .run()
      .catch((error) => {
        let err_msg = `Error updating state in DB to 'Processed', more info: \n${error}`
        throw new Error(err_msg)
      }),
  )
}

// Update a comment record's notification status (e.g if the commentator or moderator been emailed)
async function update_notification_status(d1: D1Database, comment: { id: string }, person: 'c_notif' | 'm_notif', status: 0 | 1) {
  return d1
    .prepare(`UPDATE comments_via_email SET ${person} = ? WHERE id = ?`)
    .bind(status, comment.id)
    .run()
    .catch((error) => {
      let err_msg = `Error updating notification status of ${person} to '${status}' in DB, more info: \n${error}`
      throw new Error(err_msg)
    })
}

export const d1 = {
  insert_new_comment: insert_new_comment,
  update_comment_with_gist: update_comment_with_gist,
  update_comment_state_to_prepared: update_comment_state_to_prepared,
  update_comment_state_to_processed: update_comment_state_to_processed,
  update_notification_status: update_notification_status,
}
