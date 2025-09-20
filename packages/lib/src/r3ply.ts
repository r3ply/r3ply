import { R3plySystemConfig } from '@r3ply/config'
import { CommentViaEmailHandler, CommentViaEmail } from './comments/viaEmail/'

/**
 * The main interface for implementing r3ply.
 *
 * @see mk_r3ply for a convenience function to obtain an instance of this interface.
 */
export interface R3ply {
  /**
   * Each of the comment sources is represented under `comments`, e.g. `viaEmail`.
   *
   * They work by accepting dependencies to form a handler of that comment source.
   *
   * A comment handler is a function that accepts a comment event and returns a response.
   *
   * @example `viaEmail` requires master anonymization and encryption keys, to safeguard the commenter's email address, along with implementations of various moderation channels that it chooses to support. When `viaEmail` is called with these things it will return an email handler that can respond to each email event, which consist of an email and config of the recipient site.
   */
  comments: {
    viaEmail: (
      anonymize_key: string,
      encrypt_key: string,
    ) => CommentViaEmailHandler
  }
}
export const R3ply = mk_r3ply

/**
 * A helper function to construct an object that conforms to the `R3ply` interface.
 *
 * It's useful for creating instances of the R3ply, such as a server or CLI tool.
 *
 * @param system the underlying configuration of this r3ply instance
 * @returns a R3ply instance
 */
function mk_r3ply(system: R3plySystemConfig): R3ply {
  return {
    comments: {
      viaEmail: (anonymize_key: string, encrypt_key: string) =>
        CommentViaEmail(system, anonymize_key, encrypt_key),
    },
  }
}

// TODO 1: for some reason this is breaking my cloudflare builds...
// TODO 2: commented out while refactoring
// if (import.meta.vitest) {
//   const { test, expect } = import.meta.vitest
//   const signet_key = '5yT6DjMzqTxRp1mU1eEZJhcXlWMbE6ws9LhdXjjPYgM='
//   const encrypt_email_key = 'C+CGDjjwO20erclXqpqbixlm2n8v5zR0w8LRabSNSww='
//   test('make', async () => {
//     const { siteConfigParser, systemConfigParser } = await import(
//       '@r3ply/config'
//     )
//     const TOML = await import('@iarna/toml')
//     // @ts-ignore todo: figure out how to get vscode to recognize these vitest raw imports
//     const real_001 = await import('../../test-data/eml/real/001.eml?raw')
//     let email_bytes = new TextEncoder().encode(real_001.default)
//     let system_config = systemConfigParser(
//       JSON.stringify(
//         TOML.parse(`
//     version = "0.0.1"
//     domains = ["r3ply.com"]

//     [[admin]]
//     name = "Guybrush Threepwood"
//     email = "guybrush@example.com"
//     `),
//       ),
//     ).value!
//     const { signet, issued } = await Signet.issue(signet_key, system_config)(
//       'spenc.es',
//       'r3ply.com',
//       '2025-08-25',
//     )
//     let site_config = siteConfigParser(
//       JSON.stringify(
//         TOML.parse(`
// version = "0.0.1"
// [[site]]
// domain = "spenc.es"
// r3ply = "r3ply.com"
// signet = "${signet}"
// issued = ${issued}

// [comments.email]
// "comment_{}" = """
// +++
// render = false
// author = "{{ author.pseudonym[:7] }}"
// date = {{ email.date }}
// slug = "{{ comment.id[:8] }}"

// [taxonomies]
// comment = ["{{ comment.id[:8] }}"]
// comments = ["{{ comment.subject.path }}"]
// commenters = ["{{ author.pseudonym[:7] }}"]
// threads = ["all"]
// replies = ["0", "{{ comment.id[:8] }}"]

// [extra]
// object_path = "{{ comment.subject.path }}"
// filename = "{{ comment.ts_rcvd }}_{{ comment.id[:8] }}-{{ author.pseudonym[:7] }}.md"
// dt_written = {{ email.date }}
// ts_rcvd = {{ comment.ts_rcvd }}
// parent = "0"
// comment_id = "{{ comment.id[:8] }}"
// comment_id_full = "{{ comment.id }}"
// commenter_id = "{{ author.pseudonym[:7] }}"
// email_hash = "{{ author.pseudonym }}"
// email_hash_version = "1.0.0"
// auth = {{ email.auth.pass }}
// dkim_pass = {{ email.auth.dkim }}
// dmarc_pass = {{ email.auth.dmarc }}
// spf_pass = {{ email.auth.spf  }}
// +++

// {{ comment.txt }}
// """

// [comments.email.moderation]
// type = 'webhook'
// url = "https://example.com/comments"
// `),
//       ),
//     )
//     let r3ply = R3ply(system_config)

//     let email_handler = r3ply.comments.viaEmail(signet_key, encrypt_email_key)
//     await expect(
//       email_handler([site_config.value!, email_bytes]),
//     ).resolves.not.toThrowError()
//   })
// }
