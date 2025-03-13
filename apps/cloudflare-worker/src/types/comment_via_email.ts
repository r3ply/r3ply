/**
 * A type wrapper for a UUID_v4 string, with hyphens removed
 */
type SHA256 = string
type RFC3399_Datetime = string
type UnixEpoch = string
export type CommentViaEmail = {
  api_version: '0.0.1'
  comment_id: SHA256
  ts_rcvd: UnixEpoch
  commentator: {
    id: SHA256
    version: string
  }
  email_details: {
    to: string
    subject: string
    date: RFC3399_Datetime
    email_body_txt: string
    auth_details: {
      dkim_check: boolean
      dmarc_check: boolean
      spf_check: boolean
    }
  }
}
