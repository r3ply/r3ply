import { util } from '@r3ply/lib'
import { createMimeMessage } from 'mimetext'
import { Option } from 'oxide.ts'
import { EmailMessage } from 'cloudflare:email'

/**
 * Use this to curry dependencies.
 * e.g. with `OmitFirstParameter<typeof update_gist>` then:
 * `update_gist(gist_token: string, gist_id: string, files: GistFiles)`
 * becomes...
 * `update_gist(gist_id: string, files: GistFiles)`
 */
export type OmitFirstParameter<T extends (...args: any) => any> = T extends (
  arg1: any,
  ...rest: infer P
) => infer R
  ? (...args: P) => R
  : never

/**
 * Dereference a file located at a URL relative to a base URL
 *
 * @param base_url
 * @param file_uri_ref
 *
 * @returns the contents of the file or undefined
 */
export const DereferenceFileAtURL: util.config.DerferenceFile = async (
  base_url: string,
  file_uri_ref?: string,
) => {
  if (file_uri_ref) {
    return fetch(
      url_path_relative_to_base(
        file_uri_ref,
        new URL(
          base_url.startsWith('https://') ? base_url : 'https://' + base_url,
        ),
      ),
    ).then((response) => response.text())
  } else {
    return Promise.resolve(undefined)
  }
}

export function url_path_relative_to_base(path: string, base: URL) {
  if (path.startsWith('/')) return new URL(path, base)
  else return new URL('./' + path, base)
}

export function create_reply_email(
  msg: ForwardableEmailMessage,
  {
    sender_name,
    rcpt_name,
    subject,
    body,
  }: {
    sender_name?: string
    rcpt_name?: string
    subject?: string
    body: string
  },
) {
  const msg_reply = createMimeMessage()
  msg_reply.setHeader(
    'In-Reply-To',
    Option(msg.headers.get('Message-ID')).expect(
      'No Message-ID found. This should not happen.',
    ),
  )
  msg_reply.setSender({ name: sender_name, addr: msg.to, type: 'From' })
  msg_reply.setRecipient({ name: rcpt_name, addr: msg.from, type: 'To' })
  msg_reply.setSubject(subject ?? `Re: ${msg.headers.get('Subject')}`)
  msg_reply.addMessage({
    contentType: 'text/plain',
    data: body,
  })

  return new EmailMessage(msg.to, msg.from, msg_reply.asRaw())
}

if (import.meta.vitest) {
  const { test, expect, describe } = import.meta.vitest

  describe('url path relative to base', () => {
    const config_url = new URL(
      'https://example.com/.well-known/r3ply/config.toml',
    )
    const test_fn = url_path_relative_to_base
    test('file path local to base', () => {
      expect(test_fn('file.txt', config_url).pathname).toBe(
        '/.well-known/r3ply/file.txt',
      )
    })
    test('file path nested under base', () => {
      expect(test_fn('a/b/c/file.txt', config_url).pathname).toBe(
        '/.well-known/r3ply/a/b/c/file.txt',
      )
    })
    test('file path above base', () => {
      expect(test_fn('../file.txt', config_url).pathname).toBe(
        '/.well-known/file.txt',
      )
    })
    test('file path sibling of base', () => {
      expect(test_fn('../sibling/file.txt', config_url).pathname).toBe(
        '/.well-known/sibling/file.txt',
      )
    })
    test('file path relative to root', () => {
      expect(test_fn('/a/b/c/file.txt', config_url).pathname).toBe(
        '/a/b/c/file.txt',
      )
    })
    test('file path is a URL', () => {
      const url = test_fn('https://evil.com/a/b/c/file.txt', config_url)
      expect(url.pathname).toBe(
        '/.well-known/r3ply/https://evil.com/a/b/c/file.txt',
      )
      expect(url.hostname).toBe(config_url.hostname)
    })
    test('file path has a hostname', () => {
      const url = test_fn('evil.com/a/b/c/file.txt', config_url)
      expect(url.pathname).toBe('/.well-known/r3ply/evil.com/a/b/c/file.txt')
      expect(url.hostname).toBe(config_url.hostname)
    })
  })
}
