import { CommentMetadata } from '@r3ply/lib'
import { OmitFirstParameter } from '../util'

////////////////////////////////////
///// BEGIN COMMENTS VIA EMAIL /////
////////////////////////////////////
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

export function CommentState(d1: D1Database): CommentState {
  return {
    viaEmail: {
      accept: (message_id: string, gist?: { id: string; url: string }) =>
        accept_new_comment_via_email(d1, message_id, gist),
      deliverable: (
        comment_id: string,
        deliverability: 'deliverable' | 'undeliverable',
      ) => update_comment_via_email_state(d1, comment_id, deliverability),
      prepared: (
        comment_id: string,
        preparability: 'prepared' | 'unpreparable',
      ) => update_comment_via_email_state(d1, comment_id, preparability),
      processed: (
        comment_id: string,
        processability: 'processed' | 'unprocessable',
      ) => update_comment_via_email_state(d1, comment_id, processability),
    },
  }
}

async function accept_new_comment_via_email(
  d1: D1Database,
  message_id: string,
  gist?: { id: string; url: string },
) {
  const comment_state: CommentViaEmailStates = 'accepted'
  return d1
    .prepare(
      `
		INSERT INTO comments_via_email (id, message_id, state, files_id, files_url)
		VALUES (?1, ?2, ?3, ?4, ?5)
		RETURNING id as comment_id, strftime('%s', created_utc) AS ts_rcvd, files_id as gist_id, files_url as gist_url;`,
    )
    .bind(
      crypto.randomUUID(),
      message_id,
      comment_state,
      gist?.id ?? null,
      gist?.url ?? null,
    )
    .run<
      CommentMetadata & { gist_id: string | null; gist_url: string | null }
    >()
}

async function update_comment_via_email_state(
  d1: D1Database,
  comment_id: string,
  state: PartialCommentViaEmailStates<
    | 'deliverable'
    | 'undeliverable'
    | 'prepared'
    | 'unpreparable'
    | 'processed'
    | 'unprocessable'
  >,
) {
  return d1
    .prepare(`UPDATE comments_via_email SET state = ? WHERE id = ?`)
    .bind(state, comment_id)
    .run()
    .then((_) => Promise.resolve())
}
////////////////////////////////////
////// END COMMENTS VIA EMAIL //////
////////////////////////////////////

////////////////////////////////////
/////// BEGIN CACHE COMMENTS ///////
////////////////////////////////////
export interface CachedComment {
  domain: string,
  path: string,
  comment_id: string,
  created_utc: string,
  comment_json: any
}
/**
 *  get(key): Value | null
    set(key, value, ttl = None): void
    delete(key): void
    has(key): bool
    clear(): void  # Optional
 */
export interface CommentCache {
  get(domain: string, path: string, comment_id?: string): Promise<CachedComment[]>
  set(domain: string, path:  string, comment_id: string, comment: any): Promise<void>
  // delete(domain: string, path:  string, comment_id?: string): Promise<void>
  // has(domain: string, path:  string, comment_id?: string): Promise<boolean>
  // clear(domain?: string, path?:  string): Promise<void>
}

export function CommentCache(d1: D1Database): CommentCache {
  return {
  set: async function (domain: string, path: string, comment_id: string, comment: any): Promise<void> {
      return d1
        .prepare(`
          INSERT INTO pending_comments (domain, path, comment_id, comment_json)
          VALUES (?1, ?2, ?3, ?4);
        `)
        .bind(domain, path, comment_id, JSON.stringify(comment))
        .run()
        .then((_) => Promise.resolve())
      throw new Error('Function not implemented.')
    },
    get: function (domain: string, path: string, comment_id?: string): Promise<CachedComment[]> {
      if (comment_id) {
        return d1
          .prepare("SELECT * from pending_comments WHERE comment_id = ? AND domain = ? AND path = ?;")
          .bind(comment_id, domain, path)
          .run<CachedComment>()
          .then(db_rep => db_rep.results)
      }
      else {
        return d1
          .prepare("SELECT * from pending_comments WHERE domain = ? AND path = ?;")
          .bind(domain, path)
          .run<CachedComment>()
          .then(db_rep => db_rep.results)
      }
    }
  }
}