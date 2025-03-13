export type ProcessEmailCommentResponse = {
  notify: {
    commentator: {
      from: {
        name: string
      }
      subject: string
      message: {
        mime: { content_type: 'text/plain' } | { content_type: 'text/markdown' } | { content_type: 'text/html' }
        raw: string
      }
      thread: boolean
    }
    moderator: {
      from: {
        name: string
      }
      subject: string
      message: {
        mime: { content_type: 'text/plain' } | { content_type: 'text/markdown' } | { content_type: 'text/html' }
        raw: string
      }
    }
  }
}
