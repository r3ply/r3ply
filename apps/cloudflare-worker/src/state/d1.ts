import { comments } from '@r3ply/lib'
import { OmitFirstParameter, url_path_relative_to_base } from '../util'

type CommentViaEmailStates =
  | 'accepted'
  | 'deliverable'
  | 'undeliverable'
  | 'prepared'
  | 'unpreparable'
  | 'processed'
  | 'unprocessable'
type PartialCommentViaEmailStates<T extends CommentViaEmailStates> = T

export interface CommentState {
  receive_comment: OmitFirstParameter<typeof receive_comment>
  viaEmail: {
    accepted: OmitFirstParameter<typeof accept_new_comment_via_email>
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
    backedup: OmitFirstParameter<typeof update_comment_via_email_file_reference>
  }
  cache: CommentCache
}

export function CommentState(d1: D1Database): CommentState {
  return {
    receive_comment: (source: 'email') => receive_comment(d1, source),
    viaEmail: {
      accepted: (...params) => accept_new_comment_via_email(d1, ...params),
      deliverable: (...params) => update_comment_via_email_state(d1, ...params),
      prepared: (...params) => update_comment_via_email_state(d1, ...params),
      processed: (...params) => update_comment_via_email_state(d1, ...params),
      backedup: (...params) =>
        update_comment_via_email_file_reference(d1, ...params),
    },
    cache: CommentCache(d1),
  }
}

////////////////////////////////////
////// BEGIN GENERAL COMMENTS //////
////////////////////////////////////
async function receive_comment(d1: D1Database, source: 'email') {
  // there is automatically a `rowid` in sqlite
  const create_table = `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY, -- UUID stored as TEXT without formatting
    created_utc DATETIME DEFAULT CURRENT_TIMESTAMP, -- Auto-generated timestamp for when the record was created
    source TEXT NOT NULL CHECK(source IN ('email'))
  );`
  return d1
    .prepare(
      `
    ${create_table}
    INSERT INTO comments (id, source)
    VALUES (?1, ?2)
    RETURNING id AS comment_id, strftime('%s', created_utc) AS ts_rcvd`,
    )
    .bind(crypto.randomUUID().replace(/-/g, ''), source)
    .run<comments.CommentMetadata>()
}
////////////////////////////////////
/////// END GENERAL COMMENTS ///////
////////////////////////////////////

////////////////////////////////////
///// BEGIN COMMENTS VIA EMAIL /////
////////////////////////////////////
export type CommentViaEmailRow = {
  comment_id: string
  message_id: string
  state: string
  ts_rcvd: string
  files_id: string | null
  files_url: string | null
}
async function accept_new_comment_via_email(
  d1: D1Database,
  comment_id: string,
  message_id: string,
  acceptability: 'accepted' | 'unacceptable',
) {
  // Note 1: there is automatically a `rowid` in sqlite
  // Note 2: UNIQUE columns have indices created automatically
  const create_table = `CREATE TABLE IF NOT EXISTS comments_via_email (
      comment_id TEXT PRIMARY KEY REFERENCES comments(id), -- UUID stored as TEXT without formatting
      message_id TEXT UNIQUE NOT NULL, -- Email Message-ID must be globally unique
      created_utc DATETIME DEFAULT CURRENT_TIMESTAMP, -- Auto-generated timestamp for when the record was created
      state TEXT NOT NULL CHECK(state IN ('accepted', 'unacceptable', 'deliverable', 'undeliverable', 'prepared', 'unpreparable', 'processed', 'unprocessable')), -- comment state, note: comments are always in exactly one state
      files_id TEXT UNIQUE, -- comment files ID, E.g. gist, S3, R2
      files_url TEXT UNIQUE -- comment files URL, E.g. gist, S3, R2
  );`
  return d1
    .prepare(
      `
      ${create_table}
      INSERT INTO comments_via_email (comment_id, message_id, state)
      VALUES (?1, ?2, ?3)
      RETURNING comment_id, message_id, state, strftime('%s', created_utc) AS ts_rcvd, files_id, files_url`,
    )
    .bind(comment_id, message_id, acceptability)
    .run<CommentViaEmailRow>()
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
    .prepare(
      `
      UPDATE comments_via_email SET state = ?
      WHERE comment_id = ?
      RETURNING comment_id, message_id, state, strftime('%s', created_utc) AS ts_rcvd, files_id, files_url`,
    )
    .bind(state, comment_id)
    .run<CommentViaEmailRow>()
}

async function update_comment_via_email_file_reference(
  d1: D1Database,
  index: string,
  type: 'comment_id' | 'message_id',
  files_id: string,
  files_url: string,
) {
  return d1
    .prepare(
      `
    UPDATE comments_via_email SET files_id = ?1, files_url = ?2
    WHERE ${type} = ?3
    RETURNING comment_id, message_id, state, strftime('%s', created_utc) AS ts_rcvd, files_id, files_url`,
    )
    .bind(files_id, files_url, index)
    .run<CommentViaEmailRow>()
}
////////////////////////////////////
////// END COMMENTS VIA EMAIL //////
////////////////////////////////////

////////////////////////////////////
/////// BEGIN CACHE COMMENTS ///////
////////////////////////////////////
export interface CachedComment {
  domain: string
  path: string
  comment_id: string
  created_utc: string
  comment_json: any
}

export interface CommentCache {
  get(domain: string, path: string): Promise<CachedComment[]>
  set(
    domain: string,
    path: string,
    comment_id: string,
    comment: any,
    created_utc?: string,
  ): Promise<D1Result<void>>
  all(domain: string): Promise<CachedComment[]>
  clear(): Promise<void>
  evict(max_age_seconds: number): Promise<void>
}

export function CommentCache(d1: D1Database): CommentCache {
  const drop_table = `drop table IF EXISTS pending_comments;`
  const create_table = `CREATE TABLE IF NOT EXISTS pending_comments (
    domain TEXT, -- e.g. example-blog.com
    path TEXT, -- e.g. /posts/my-great-vacation
    comment_id TEXT PRIMARY KEY NOT NULL, -- UUID stored as TEXT
    created_utc DATETIME DEFAULT CURRENT_TIMESTAMP, -- ts auto-generated upon insertion
    comment_json JSON);`

  return {
    set: async function (
      domain: string,
      path: string,
      comment_id: string,
      comment: any,
      created_utc?: string,
    ): Promise<D1Result<void>> {
      const url = url_path_relative_to_base(
        path,
        new URL('https://example.com'),
      )
      url.host = domain
      const prepared = d1.prepare(
        created_utc
          ? `${create_table}
            INSERT INTO pending_comments (domain, path, comment_id, comment_json, created_utc)
            VALUES (?1, ?2, ?3, ?4, ?5);`
          : `${create_table}
            INSERT INTO pending_comments (domain, path, comment_id, comment_json)
            VALUES (?1, ?2, ?3, ?4);`,
      )
      return created_utc
        ? prepared
            .bind(
              url.host,
              url.pathname,
              comment_id,
              JSON.stringify(comment),
              created_utc,
            )
            .run<void>()
        : prepared
            .bind(url.host, url.pathname, comment_id, JSON.stringify(comment))
            .run<void>()
    },
    get: async function (
      domain: string,
      path: string,
    ): Promise<CachedComment[]> {
      const url = url_path_relative_to_base(
        path,
        new URL('https://example.com'),
      )
      url.host = domain
      return d1
        .prepare(
          `${create_table}\nSELECT * FROM pending_comments WHERE domain = ? AND path = ?;`,
        )
        .bind(url.hostname, url.pathname)
        .run<CachedComment>()
        .then((db_rep) => db_rep.results)
    },
    all: async function (domain: string): Promise<CachedComment[]> {
      const url = new URL('https://example.com')
      url.host = domain
      return d1
        .prepare(
          `
        ${create_table}
        SELECT * FROM pending_comments WHERE domain = ?;`,
        )
        .bind(url.hostname)
        .run<CachedComment>()
        .then((db_rep) => db_rep.results)
    },
    clear: async function (): Promise<void> {
      return d1
        .prepare(`${drop_table}\n${create_table}`)
        .run()
        .then((_) => Promise.resolve())
    },
    evict: async function (max_age_seconds): Promise<void> {
      d1
        .prepare(
          `DELETE FROM pending_comments WHERE created_utc < datetime('now', '-' || ? || ' seconds')`,
        )
        .bind(max_age_seconds)
        .run() as Promise<D1Result<void>>
    },
  }
}
////////////////////////////////////
//////// END CACHE COMMENTS ////////
////////////////////////////////////
