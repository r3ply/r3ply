import { Result } from 'oxide.ts'
import { CommentSource } from '../r3ply_old'

// TODO: one day comments will come from other sources. the schemas should reflect that.
async function insert_new_comment_via_email(id: string, message_id: string, d1: D1Database) {
  let stmt = d1
    .prepare('INSERT INTO comments_via_email (id, message_id, c_source, c_state, c_notif, m_notif) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
    .bind(id, message_id, CommentSource.EMAIL, 'received', 0, 0)
  return Result.safe(stmt.run())
}
