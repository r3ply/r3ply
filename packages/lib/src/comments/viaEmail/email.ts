import { Addr, DateTime, Message as Email } from '@mail-parser/ts-bindings'
import dayjs from 'dayjs'
import micromatch from 'micromatch'
import { parse_email_bytes } from '@r3ply/wasm'

/**
 * @description Gets a Message-Id or throws an error
 * @param email A parsed Message
 * @returns the Message-Id as a string, e.g. `61EB5D6CD285@example.com`
 * @throws There MUST be exactly one Message-Id and it Must be globally unique.
 * This function can't check the uniqueness part, but it will search all the
 * parts of the email looking for a message id.
 */
export function get_message_id(email: Email) {
  let values: Set<string> = new Set([])
  for (const part of email.parts) {
    let h = part.headers.find((h) => h.name == 'message_id')
    if (h && h.value != 'Empty' && 'Text' in h.value) values.add(h.value.Text)
  }
  if (values.size > 1)
    throw new Error('Emails must not have more than one Message_Id')
  if (values.size == 0)
    throw new Error('`Message_Id` must not be missing from email')
  return [...values][0]
}
export namespace get_message_id {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    // prettier-ignore
    describe('get_message_id', async () => {
      // @ts-ignore
      const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
      // @ts-ignore
      const mal2_000 = await import('../../test-data/eml/malformed2/000.eml?raw')
      // @ts-ignore
      const real_000 = await import('../../test-data/eml/real/000.eml?raw')
      test('Message-ID must not be missing', () => {
        const message = parse_email_bytes(
          new TextEncoder().encode(mal1_001.default),
        )
        expect(() => get_message_id(message)).toThrowError(
          /`Message_Id` must not be missing/,
        )
      })
      test("There must not be multiple Message-ID's", () => {
        const message = parse_email_bytes(
          new TextEncoder().encode(mal2_000.default),
        )
        expect(() => get_message_id(message)).toThrowError(
          /more than one Message_Id/,
        )
      })
      test('Parses Message-ID', () => {
        const message = parse_email_bytes(
          new TextEncoder().encode(real_000.default),
        )
        expect(get_message_id(message)).toBe(
          'FE97A840-9401-4B26-902E-61EB5D6CD285@example.com',
        )
      })
    })
  }
}

/**
 * @description Gets the From header from an email
 * @param email A parsed Message
 * @returns An object of address, name?
 * @throws There MUST be exactly one From value, and it must have an address
 */
export function get_from(email: Email) {
  type AddrWithAddress = { name: string | null; address: string }
  let values: Set<AddrWithAddress> = new Set([])
  for (const part of email.parts) {
    let h = part.headers.find((h) => h.name == 'from')
    if (h && h.value != 'Empty' && 'Address' in h.value) {
      if ('List' in h.value.Address)
        h.value.Address.List.forEach((addr) => {
          if (addr.address)
            values.add({ name: addr.name, address: addr.address })
        })
      if ('Group' in h.value.Address) {
        for (const group of h.value.Address.Group)
          group.addresses.forEach((addr) => {
            if (addr.address)
              values.add({ name: addr.name, address: addr.address })
          })
      }
    }
  }
  if (values.size > 1)
    throw new Error('Emails must not have more than one `From`')
  if (values.size == 0) throw new Error('`From` must not be missing from email')
  return [...values][0]
}
export namespace get_from {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    // prettier-ignore
    describe('get_from', async () => {
      // @ts-ignore
      const real_000 = await import('../../test-data/eml/real/000.eml?raw')
      // @ts-ignore
      const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
      // @ts-ignore
      const mal2_005 = await import('../../test-data/eml/malformed2/005.eml?raw')
      test('Gets an address', () => {
        const message = parse_email_bytes(new TextEncoder().encode(real_000.default))
        expect(get_from(message).address).toBe('test@example.com')
      })
      test('Gets a name', () => {
        const message = parse_email_bytes(new TextEncoder().encode(real_000.default))
        expect(get_from(message).name).toBe('Guybrush Threepwood')
      })
      test('From must not be missing', () => {
        const message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
        expect(() => get_from(message)).toThrowError(/`From` must not be missing/)
      })
      test('There must not be more than one From', () => {
        const message = parse_email_bytes(new TextEncoder().encode(mal2_005.default))
        expect(() => get_from(message)).toThrowError(/more than one `From`/)
      })
    })
  }
}

/**
 * @description Gets all To header values from an Email
 * @param email A parsed Message
 * @returns An an array of objects of address, name
 * @throws There MUST be ate least one To
 */
export function get_to(email: Email) {
  let values: Set<Addr> = new Set([])
  for (const part of email.parts) {
    let h = part.headers.find((h) => h.name == 'to')
    if (h && h.value != 'Empty' && 'Address' in h.value) {
      if ('List' in h.value.Address) {
        h.value.Address.List.forEach((addr) => values.add(addr))
      }
      if ('Group' in h.value.Address) {
        for (const group of h.value.Address.Group) {
          group.addresses.forEach((addr) => values.add(addr))
        }
      }
    }
  }

  if (values.size == 0) throw new Error('`To` must not be missing from email')
  return [...values]
}
export namespace get_to {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    // prettier-ignore
    describe('get_to', async () => {
      // @ts-ignore
      const real_000 = await import('../../test-data/eml/real/000.eml?raw')
      // @ts-ignore
      const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
      // @ts-ignore
      const mal2_005 = await import('../../test-data/eml/malformed2/005.eml?raw')
      test('Get To fields', () => {
        const message = parse_email_bytes(new TextEncoder().encode(real_000.default))
        expect(get_to(message)).toStrictEqual([
          {
            "address": "bob@example.com",
            "name": null,
          },
          {
            "address": "alice@example.com",
            "name": "Alice",
          }
        ])
      })
      test('To field must not be missing', () => {
        const message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
        expect(() => get_to(message)).toThrowError(/`To` must not be missing/)
      })
    })
  }
}

/**
 * @description Get the Date header of an email.
 * @param email A parsed message
 * @returns an object composed of a `DateTime` field, and an rfc3339 string representation
 * @throws There MUST be exactly one Date, and the date must be valid
 */
export function get_date(email: Email) {
  let values: Set<DateTime> = new Set([])
  for (const part of email.parts) {
    let h = part.headers.find((h) => h.name == 'date')
    if (h && h.value != 'Empty' && 'DateTime' in h.value)
      values.add(h.value.DateTime)
  }
  if (values.size > 1)
    throw new Error('Emails must not have more than one Date')
  if (values.size == 0) throw new Error('Date must not be missing from email')
  let result = [...values][0]
  let rfc3339 = util.dt_to_rfc3339(result)
  let parsed_date = dayjs(rfc3339)
  if (!parsed_date.isValid()) throw new Error(`Date is invalid: ${rfc3339}`)
  return { dt: result, rfc3339: util.dt_to_rfc3339(result) }
}
export namespace get_date {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    // prettier-ignore
    describe('get_date', async () => {
      // @ts-ignore
      const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
      // @ts-ignore
      const mal2_002 = await import('../../test-data/eml/malformed2/002.eml?raw')
      // @ts-ignore
      const mal2_003 = await import('../../test-data/eml/malformed2/003.eml?raw')
      // @ts-ignore
      const real_000 = await import('../../test-data/eml/real/000.eml?raw')
      test('Date must not be missing', () => {
        const message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
        expect(() => get_date(message)).toThrowError(/Date must not be missing/)
      })
      test('There must not be more than one date', () => {
        const message = parse_email_bytes(new TextEncoder().encode(mal2_002.default))
        expect(() => get_date(message)).toThrowError(/more than one Date/)
      })
      test('Date must be valid', () => {
        const message = parse_email_bytes(new TextEncoder().encode(mal2_003.default))
        expect(() => get_date(message)).toThrowError(/Date is invalid/)
      })
      test('Get\'s an email\'s Date header', () => {
        const message = parse_email_bytes(new TextEncoder().encode(real_000.default))
        expect(get_date(message).rfc3339).toBe('2023-06-20T20:28:11+02:00')
      })
    })
  }
}

/**
 * @description Checks Authentication-Results for dkim, dmarc, and spf results.
 * @param email A parsed message
 * @returns An object with fields {dkim,dmarc,spf}_pass set to true for each that has "pass" in header
 * @throws if there are multiple Authentication-Results or if there are none. The assumption is this
 * will be running, intially at least, only Cloudflare email workers. When that changes then this
 * needs to change as well.
 *
 * TODO:
 * There is no fool proof way to authenticate an email. Everything depends on whether the servers
 * that are handling the email do so in a way that allows you to authenticate. For most cases this
 * is fine, as most people use popular email providers. However, if r3ply were to be used under
 * the same assumptions of one service provider, for example Cloudflare email workers, then it could
 * lead to potentially unsafe results. I think the best path forward will be for authentication to
 * be implemented as closure by the people operating the r3ply server.
 *
 * What's here is just what works at a bare minimum under a fixed set of assumptions, but it is no
 * way to be considered reliable or safe under all circumstances.
 *
 * A lot of work could be done here in the future to make this better. Most of it would have to be
 * done upstream though in the flow of data. By the time we're actually parsing the email, there
 * might not be a lot that can be done to guarantee authenticity. In other words, one day r3ply
 * could potentially implement some standard upstream, upon receipt of the actual email.
 */
export function get_auth_results(email: Email) {
  let values: Set<{
    dkim_pass: boolean
    dmarc_pass: boolean
    spf_pass: boolean
  }> = new Set([])
  for (const part of email.parts) {
    let h = part.headers.find(
      (h) =>
        typeof h.name === 'object' && h.name.other == 'Authentication-Results',
    )
    if (h && h.value != 'Empty' && 'Text' in h.value) {
      values.add({
        dkim_pass: h.value.Text.includes('dkim=pass'),
        dmarc_pass: h.value.Text.includes('dmarc=pass'),
        spf_pass: h.value.Text.includes('spf=pass'),
      })
    }
  }
  if (values.size > 1)
    throw new Error('Unknown how to handle multiple Authentication-Results')
  if (values.size == 0) {
    return {
      dkim_pass: false,
      dmarc_pass: false,
      spf_pass: false,
    }
  }
  return [...values][0]
}
export namespace get_auth_results {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    // prettier-ignore
    describe('get_auth_results', async () => {
      // @ts-ignore
      const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
      // @ts-ignore
      const mal2_004 = await import('../../test-data/eml/malformed2/004.eml?raw')
      // @ts-ignore
      const real_001 = await import('../../test-data/eml/real/001.eml?raw')
      // @ts-ignore
      const real_002 = await import('../../test-data/eml/real/002.eml?raw')
      test('Get failed authentication results', () => {
        const message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
        expect(get_auth_results(message)).toStrictEqual({
          dkim_pass: false,
          dmarc_pass: false,
          spf_pass: false,
        })
      })
      test('Get passing authentication results', () => {
        const message = parse_email_bytes(new TextEncoder().encode(real_001.default))
        expect(get_auth_results(message)).toStrictEqual({
          dkim_pass: true,
          dmarc_pass: true,
          spf_pass: true,
        })
      })
      test('Get spf failing authentication results', () => {
        const message = parse_email_bytes(new TextEncoder().encode(real_002.default))
        expect(get_auth_results(message)).toStrictEqual({
          dkim_pass: true,
          dmarc_pass: true,
          spf_pass: false,
        })
      })
      test('There must not be more than one authentication results', () => {
        const message = parse_email_bytes(new TextEncoder().encode(mal2_004.default))
        expect(() => get_auth_results(message)).toThrowError(/multiple Authentication-Results/)
      })
    })
  }
}

/**
 * @description Gets the subject line of an email.
 * @param email A parsed Message
 * @returns the Subject as a string, or undefined if there was none
 * @throws There MUST NOT be more than one subjects.
 */
export function get_subject(email: Email) {
  let values: Set<string> = new Set([])
  for (const part of email.parts) {
    let h = part.headers.find((h) => h.name == 'subject')
    if (h && h.value != 'Empty' && 'Text' in h.value) values.add(h.value.Text)
  }
  if (values.size > 1) throw new Error('Emails must not have multiple subjects')
  if (values.size == 1) return [...values][0]
  return undefined
}
export namespace get_subject {
  if (import.meta.vitest) {
    const { describe, test, expect } = import.meta.vitest
    // prettier-ignore
    describe('get_subject', async () => {
      // @ts-ignore
      const mal2_001 = await import('../../test-data/eml/malformed2/001.eml?raw')
      // @ts-ignore
      const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
      // @ts-ignore
      const real_000 = await import('../../test-data/eml/real/000.eml?raw')
      test('Must not have multiple subjects', () => {
        const message = parse_email_bytes(new TextEncoder().encode(mal2_001.default))
        expect(() => get_subject(message)).toThrowError(/must not have multiple subjects/)
      })
      test('Subject header can be missing from email', () => {
        const message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
        expect(get_subject(message)).toBe(undefined)
      })
      test('Gets subject header from email', () => {
        const message = parse_email_bytes(new TextEncoder().encode(real_000.default))
        expect(get_subject(message)).toBe('This is a test email')
      })
    })
  }
}

/**
 * @description This returns all the text parts of the email body.
 * @param email A parsed message
 * @returns All the text parts, concatenated. If there are no parts, an empty string.
 */
export function get_body_txt(email: Email) {
  return email.text_body
    .map((text_idx) => email.parts[text_idx].body)
    .filter((part_type) => 'Text' in part_type)
    .map((part_type_w_text) => part_type_w_text.Text)
    .join('')
}
export namespace get_body_txt {
  if (import.meta.vitest) {
    const { test, expect } = import.meta.vitest
    // prettier-ignore
    test('get_body_txt', async () => {
      // @ts-ignore
      const rfc_000 = await import('../../test-data/eml/rfc/000.eml?raw')
      // @ts-ignore
      const rfc_000_json = await import('../../test-data/eml/rfc/000.json')
      // @ts-ignore
      const mal_014 = await import('../../test-data/eml/malformed/014.eml?raw')
      // @ts-ignore
      const mal_014_json = await import('../../test-data/eml/malformed/014.json')
      // @ts-ignore
      const mal_000 = await import('../../test-data/eml/malformed/000.eml?raw')
      // @ts-ignore
      const mal_000_json = await import('../../test-data/eml/malformed/000.json')
      // @ts-ignore
      const mal_016 = await import('../../test-data/eml/malformed/016.eml?raw')
      // @ts-ignore
      const mal_016_json = await import('../../test-data/eml/malformed/016.json')
      let message = parse_email_bytes(new TextEncoder().encode(rfc_000.default))
      expect(get_body_txt(message)).toBe(
        [1, 2].map((i) => rfc_000_json.parts[i].body.Text).join(''),
      )
      message = parse_email_bytes(new TextEncoder().encode(mal_014.default))
      expect(get_body_txt(message)).toBe(
        [1].map((i) => mal_014_json.parts[i].body.Text).join(''),
      )
      message = parse_email_bytes(new TextEncoder().encode(mal_000.default))
      expect(get_body_txt(message)).toBe('')
      message = parse_email_bytes(new TextEncoder().encode(mal_016.default))
      expect(get_body_txt(message)).toBe(
        [3, 4, 5].map((i) => mal_016_json.parts[i].body.Text).join(''),
      )
    })
  }
}

namespace util {
  /**
   * @description filter an array of address using a glob pattern
   * @param addrs an array of Addr objects
   * @param address_globs a glob pattern that will be used again the .address field of members of addrs
   * @returns a unique Addr
   * @throws Exactly one Addr MUST be returned.
   */
  export function unique_addr(addrs: Addr[], address_globs: string[]) {
    type AddrWithAddress = { name: string | null; address: string }
    if (addrs.length == 0) throw new Error('Parameter "addrs" can not be empty')
    let values: Set<AddrWithAddress> = new Set([])
    addrs
      .filter((addr) => {
        if (addr.address) {
          let matches = micromatch([addr.address], address_globs)
          return matches.length > 0
        }
      })
      .forEach((addr) => {
        if (addr.address) values.add({ name: addr.name, address: addr.address })
      })
    if (values.size > 1) throw new Error('Glob pattern was not unique enough')
    if (values.size == 0) throw new Error('Glob pattern was too unique')
    return [...values][0]
  }
  export namespace unique_addr {
    if (import.meta.vitest) {
      const { describe, test, expect } = import.meta.vitest
      // prettier-ignore
      describe('unique_addr', () => {
        const addresses: Addr[] = [
          { name: 'foo', address: 'bar@a.com' },
          { name: 'baz', address: 'biz@b.com' },
          { name: 'italian foo', address: 'bar@a.com.it' },
        ]
        test('Must not be empty', () => {
          expect(() => util.unique_addr([], ['*'])).toThrowError(/can not be empty/)
        })
        test('Must not return multiple addresses', () => {
          expect(() => util.unique_addr(addresses, ['*.com']).address)
            .toThrowError(/pattern was not unique enough/)
        })
        test('Must return an address', () => {
          expect(() => util.unique_addr(addresses, ['asddasdas']).address)
            .toThrowError(/pattern was too unique/)
        })
        test('Returns a unique address', () => {
          expect(util.unique_addr(addresses, ['*@a.com']).address).toBe('bar@a.com')
        })
      })
    }
  }
  /**
   * @description takes a DateTime object from a parsed email and returns a string formatted as rfc 3339
   * @param dt the DateTime object
   * @returns a rfc 3339 formatted string
   * @see DateTime
   */
  export function dt_to_rfc3339(dt: DateTime) {
    return `${dt.year}-${dt.month.toString().padStart(2, '0')}-${dt.day.toString().padStart(2, '0')}T${dt.hour
      .toString()
      .padStart(
        2,
        '0',
      )}:${dt.minute.toString().padStart(2, '0')}:${dt.second.toString().padStart(2, '0')}${
      dt.tz_before_gmt ? '-' : '+'
    }${dt.tz_hour.toString().padStart(2, '0')}:${dt.tz_minute.toString().padStart(2, '0')}`
  }
  export namespace dt_to_rfc3339 {
    if (import.meta.vitest) {
      const { test, expect } = import.meta.vitest
      // prettier-ignore
      test('dt_to_rfc3339', async () => {
        // @ts-ignore
        const rfc_000 = await import('../../test-data/eml/rfc/000.eml?raw')
        let email: Email = parse_email_bytes(new TextEncoder().encode(rfc_000.default))
        let values: Set<DateTime> = new Set([])
        for (const part of email.parts) {
          let h = part.headers.find((h) => h.name == 'date')
          if (h && h.value != 'Empty' && 'DateTime' in h.value)
            values.add(h.value.DateTime)
        }
        if (values.size > 1)
          throw new Error('Emails must not have more than one Date')
        if (values.size == 0)
          throw new Error('Date must not be missing from email')
        let result = [...values][0]
        const rfc_3339 = dayjs(dt_to_rfc3339(result))
        const parsed_date = dayjs('Fri, 07 Oct 1994 16:15:05 -0700')
        expect(parsed_date.isSame(rfc_3339)).toBe(true)
      })
    }
  }
}
