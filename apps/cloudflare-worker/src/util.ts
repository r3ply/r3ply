import { DateTime as ParsedDatetime } from '@mail-parser/ts-bindings'
import { Err, Ok, Result } from 'oxide.ts'

const Util = {
  tryUrl(str: string) {
    try {
      return new URL(str)
    } catch (error) {
      return undefined
    }
  },

  async sha256(str: string) {
    const encoded = new TextEncoder().encode(str)
    return crypto.subtle.digest({ name: 'SHA-256' }, encoded).then((hashed_buffer) => {
      const hashArray = new Uint8Array(hashed_buffer)
      const hashHex = Array.prototype.map
        .call(hashArray, (byte: number) => {
          return ('00' + byte.toString(16)).slice(-2)
        })
        .join('')
      return hashHex
    })
  },

  async sha256_b64(str: string) {
    const encoded = new TextEncoder().encode(str)
    const hashedBuffer = await crypto.subtle.digest({ name: 'SHA-256' }, encoded)
    const hashBase64 = btoa(String.fromCharCode(...new Uint8Array(hashedBuffer)))
    return hashBase64
  },

  uuid_v4_unhyphenated() {
    // Generate UUIDv4
    const uuid: string = crypto.randomUUID()

    // Remove dashes from the UUID string
    return uuid.replace(/-/g, '')
  },

  // Note: I have to use the parsed email because Cloudflare's internal `Date` object does not perserve timezone when parsing datetime strings
  parsed_email_datetime_to_rfc3339(dt: ParsedDatetime) {
    return `${dt.year}-${dt.month.toString().padStart(2, '0')}-${dt.day.toString().padStart(2, '0')}T${dt.hour
      .toString()
      .padStart(2, '0')}:${dt.minute.toString().padStart(2, '0')}:${dt.second.toString().padStart(2, '0')}${
      dt.tz_before_gmt ? '-' : '+'
    }${dt.tz_hour.toString().padStart(2, '0')}:${dt.tz_minute.toString().padStart(2, '0')}`
  },

  // Used to fold headers to get around problematic MS Outlook + Cloudflare bug
  foldHeader(key: string, value: string) {
    let str = `${key}: ${value}`
    let folded_str = Util.foldLines(str)
    let header_value = folded_str
      .split(key + ':')
      .slice(1)
      .join()
    return {
      key: key,
      value: header_value,
      header: folded_str,
    }
  },

  /**
   * From https://github.com/nodemailer/libmime/blob/3075051660e703afad1a8196fb2782c3d4f287df/lib/libmime.js#L789C1-L824C6
   * @param str
   * @param lineLength
   * @param afterSpace
   * @returns
   */
  foldLines(str: string, lineLength: number = 76, afterSpace: boolean = false, linebreak: '\r\n' | '\n' = '\n') {
    str = (str || '').toString()
    lineLength = lineLength || 76

    let pos = 0,
      len = str.length,
      result = '',
      line,
      match

    while (pos < len) {
      line = str.substr(pos, lineLength)
      if (line.length < lineLength) {
        result += line
        break
      }
      if ((match = line.match(/^[^\n\r]*(\r?\n|\r)/))) {
        line = match[0]
        result += line
        pos += line.length
        continue
      } else if ((match = line.match(/(\s+)[^\s]*$/)) && match[0].length - (afterSpace ? (match[1] || '').length : 0) < line.length) {
        line = line.substr(0, line.length - (match[0].length - (afterSpace ? (match[1] || '').length : 0)))
      } else if ((match = str.substr(pos + line.length).match(/^[^\s]+(\s*)/))) {
        line = line + match[0].substr(0, match[0].length - (!afterSpace ? (match[1] || '').length : 0))
      }

      result += line
      pos += line.length
      if (pos < len) {
        result += linebreak
      }
    }

    return result
  },

  base64Encode(arrayBuffer: ArrayBuffer): string {
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  },

  base64Decode(base64: string): ArrayBuffer {
    const binary = atob(base64)
    const length = binary.length
    const bytes = new Uint8Array(length)
    for (let i = 0; i < length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes.buffer
  },

  // TODO: I still haven't tested/integrated this code but it might be useful one day
  calculateThreadIndex(originalThreadIndex: string): string {
    // Decode the original Thread-Index from base64
    const originalIndexBytes = new Uint8Array(Util.base64Decode(originalThreadIndex))

    // Get the current time in ticks (100-nanosecond intervals since 1601-01-01)
    const currentTime = Date.now()
    const ticks = BigInt(currentTime) * BigInt(10000) // Convert to 100-nanosecond intervals

    // Convert ticks to a 5-byte array
    const ticksBuffer = new ArrayBuffer(8)
    const ticksView = new DataView(ticksBuffer)
    ticksView.setBigUint64(0, ticks)
    const newIndexBytes = new Uint8Array(ticksBuffer.slice(3)) // Take the last 5 bytes

    // Append the 5 new bytes to the original 22 bytes
    const newThreadIndexBytes = new Uint8Array(27)
    newThreadIndexBytes.set(originalIndexBytes, 0)
    newThreadIndexBytes.set(newIndexBytes, 22)

    // Encode the new Thread-Index to base64
    const newThreadIndex = Util.base64Encode(newThreadIndexBytes.buffer)

    return newThreadIndex
  },

  // Invert a Result<Promise<T>, E> into a Promise<Result<T, E>>
  invert_promise<T, E>(result: Result<Promise<T>, E>): Promise<Result<T, E>> {
    if (result.isOk()) {
      return result.unwrap().then((value) => Ok(value))
    } else {
      return Promise.resolve(Err(result.unwrapErr()))
    }
  },

  // Makes Result<Promise<Result<T, E1>>, E2>  into Promise<Result, E1 | E2>
  comprehend_res<T, E1, E2>(result: Result<Promise<Result<T, E1>>, E2>): Promise<Result<T, E1 | E2>> {
    return this.invert_promise(result).then((result) => result.flatten())
  },

  // Makes Promise<Result<Promise<T>, E>> into Promise<Result<T, E>>
  async comprehend_fut<T, E>(promise: Promise<Result<Promise<T>, E>>): Promise<Result<T, E>> {
    return promise.then((result) => this.invert_promise(result))
  },
}

export { Util }
