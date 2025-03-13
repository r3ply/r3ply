export type R3plyUserConfig = {
  site: string
  r3ply_email: string
  moderator_email: string
  allow_list: string[]
  block_list: string[]
  max_allowed_email_bytes: number
  comment_processor: {
    type: 'URL' | 'function' | 'TODO'
    value: string
  }
  pw_to_process_comment: string | undefined
  waf_security_token: string | undefined
}
