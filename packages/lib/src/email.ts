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
  let rfc3339 = Util.dt_to_rfc3339(result)
  let parsed_date = dayjs(rfc3339)
  if (!parsed_date.isValid()) throw new Error(`Date is invalid: ${rfc3339}`)
  return { dt: result, rfc3339: Util.dt_to_rfc3339(result) }
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
 * be implemented as closure by the people operation the service.
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
  if (values.size == 0)
    return {
      dkim_pass: false,
      dmarc_pass: false,
      spf_pass: false,
    }
  return [...values][0]
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

export namespace Util {
  /**
   * @description filter an array of address using a glob pattern
   * @param addrs an array of Addr objects
   * @param address_glob a glob pattern that will be used again the .address field of members of addrs
   * @returns a unique Addr
   * @throws Exactly one Addr MUST be returned.
   */
  export function unique_addr(addrs: Addr[], address_glob: string) {
    type AddrWithAddress = { name: string | null; address: string }
    if (addrs.length == 0) throw new Error('Parameter "addrs" can not be empty')
    let values: Set<AddrWithAddress> = new Set([])
    addrs
      .filter((addr) => {
        if (addr.address) {
          let matches = micromatch([addr.address], address_glob)
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
}

// TODO: for some reason this is breaking my cloudflare build
if (import.meta.vitest) {
  const { test, expect } = import.meta.vitest
  // @ts-ignore
  const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
  // @ts-ignore
  const mal2_000 = await import('../../test-data/eml/malformed2/000.eml?raw')
  // @ts-ignore
  const real_000 = await import('../../test-data/eml/real/000.eml?raw')
  test('get_message_id', () => {
    let message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
    expect(() => get_message_id(message)).toThrowError(
      /`Message_Id` must not be missing/,
    )
    message = parse_email_bytes(new TextEncoder().encode(mal2_000.default))
    expect(() => get_message_id(message)).toThrowError(
      /more than one Message_Id/,
    )
    message = parse_email_bytes(new TextEncoder().encode(real_000.default))
    expect(get_message_id(message)).toBe(
      'FE97A840-9401-4B26-902E-61EB5D6CD285@example.com',
    )
  })
  test('get_from', async () => {
    // @ts-ignore
    const real_000 = await import('../../test-data/eml/real/000.eml?raw')
    // @ts-ignore
    const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
    // @ts-ignore
    const mal2_005 = await import('../../test-data/eml/malformed2/005.eml?raw')
    // @ts-ignore
    const mal2_006 = await import('../../test-data/eml/malformed2/006.eml?raw')
    let message = parse_email_bytes(new TextEncoder().encode(real_000.default))
    expect(get_from(message).address).toBe('test@example.com')
    expect(get_from(message).name).toBe('Guybrush Threepwood')
    message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
    expect(() => get_from(message)).toThrowError(/`From` must not be missing/)
    message = parse_email_bytes(new TextEncoder().encode(mal2_005.default))
    expect(() => get_from(message)).toThrowError(/more than one `From`/)
    message = parse_email_bytes(new TextEncoder().encode(mal2_006.default))
    expect(() => get_from(message)).toThrowError(/`From` must not be missing/)
  })
  test('get_to', async () => {
    // @ts-ignore
    const real_000 = await import('../../test-data/eml/real/000.eml?raw')
    // @ts-ignore
    const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
    // @ts-ignore
    const mal2_005 = await import('../../test-data/eml/malformed2/005.eml?raw')
    let message = parse_email_bytes(new TextEncoder().encode(real_000.default))
    expect(get_to(message).map((addr) => addr.address)).toStrictEqual([
      'bob@example.com',
      'alice@example.com',
    ])
    message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
    expect(() => get_to(message)).toThrowError(/`To` must not be missing/)
  })
  test('unique_addr', () => {
    expect(() => Util.unique_addr([], '*')).toThrowError(/can not be empty/)
    let addresses: Addr[] = [
      { name: 'foo', address: 'bar@a.com' },
      { name: 'baz', address: 'biz@b.com' },
      { name: 'italian foo', address: 'bar@a.com.it' },
    ]
    expect(Util.unique_addr(addresses, '*@a.com').address).toBe('bar@a.com')
    expect(() => Util.unique_addr(addresses, '*.com').address).toThrowError(
      /pattern was not unique enough/,
    )
    expect(() => Util.unique_addr(addresses, 'asddasdas').address).toThrowError(
      /pattern was too unique/,
    )
  })
  test('get_date', async () => {
    // @ts-ignore
    const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
    // @ts-ignore
    const mal2_002 = await import('../../test-data/eml/malformed2/002.eml?raw')
    // @ts-ignore
    const mal2_003 = await import('../../test-data/eml/malformed2/003.eml?raw')
    // @ts-ignore
    const real_000 = await import('../../test-data/eml/real/000.eml?raw')
    let message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
    expect(() => get_date(message)).toThrowError(/Date must not be missing/)
    message = parse_email_bytes(new TextEncoder().encode(mal2_002.default))
    expect(() => get_date(message)).toThrowError(/more than one Date/)
    message = parse_email_bytes(new TextEncoder().encode(mal2_003.default))
    expect(() => get_date(message)).toThrowError(/Date is invalid/)
    message = parse_email_bytes(new TextEncoder().encode(real_000.default))
    expect(get_date(message).rfc3339).toBe('2023-06-20T20:28:11+02:00')
  })
  test('get_auth_results', async () => {
    // @ts-ignore
    const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
    // @ts-ignore
    const mal2_004 = await import('../../test-data/eml/malformed2/004.eml?raw')
    // @ts-ignore
    const real_001 = await import('../../test-data/eml/real/001.eml?raw')
    // @ts-ignore
    const real_002 = await import('../../test-data/eml/real/002.eml?raw')
    let message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
    expect(get_auth_results(message)).toStrictEqual({
      dkim_pass: false,
      dmarc_pass: false,
      spf_pass: false,
    })
    message = parse_email_bytes(new TextEncoder().encode(mal2_004.default))
    expect(() => get_auth_results(message)).toThrowError(
      /multiple Authentication-Results/,
    )
    message = parse_email_bytes(new TextEncoder().encode(real_001.default))
    expect(get_auth_results(message)).toStrictEqual({
      dkim_pass: true,
      dmarc_pass: true,
      spf_pass: true,
    })
    message = parse_email_bytes(new TextEncoder().encode(real_002.default))
    expect(get_auth_results(message)).toStrictEqual({
      dkim_pass: true,
      dmarc_pass: true,
      spf_pass: false,
    })
  })
  test('get_subject', async () => {
    // @ts-ignore
    const mal2_001 = await import('../../test-data/eml/malformed2/001.eml?raw')
    // @ts-ignore
    const mal1_001 = await import('../../test-data/eml/malformed/001.eml?raw')
    // @ts-ignore
    const real_000 = await import('../../test-data/eml/real/000.eml?raw')
    let message = parse_email_bytes(new TextEncoder().encode(mal2_001.default))
    expect(() => get_subject(message)).toThrowError(
      /must not have multiple subjects/,
    )
    message = parse_email_bytes(new TextEncoder().encode(mal1_001.default))
    expect(get_subject(message)).toBe(undefined)
    message = parse_email_bytes(new TextEncoder().encode(real_000.default))
    expect(get_subject(message)).toBe('This is a test email')
  })
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
