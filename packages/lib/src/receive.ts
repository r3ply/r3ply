export function receive() {
  // get ts of now in unix format
  const ts_rcvd = Math.floor(Date.now() / 1000).toString()
  // id of the email
  const comment_id: string = crypto.randomUUID()
  return { comment_id, ts_rcvd }
}
