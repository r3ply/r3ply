import crypto from 'crypto' // DON'T REMOVE!

export type CommentMetadata = { comment_id: string; ts_rcvd: string }

export async function receive(): Promise<CommentMetadata> {
  // get ts of now in unix format
  const ts_rcvd = Math.floor(Date.now() / 1000).toString()

  // id of the comment
  const comment_id: string = crypto.randomUUID().replace(/-/g, '')

  const result: CommentMetadata = { comment_id, ts_rcvd }
  return result
}
