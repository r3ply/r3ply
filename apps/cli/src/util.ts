import path from 'path'
import fs from 'fs'
import { Result } from 'oxide.ts'

export namespace util {
  export type OkType<R> = R extends Result<infer O, any> ? O : never
  export type ErrType<R> = R extends Result<any, infer E> ? E : never

  /**
   * Used to distinguish expected errors from unexpected
   */
  export class CLIError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'CLIError'
    }
  }

  export async function find_up(
    filename: string,
    cwd: string = process.cwd(),
  ): Promise<string | undefined> {
    let currentDir = cwd

    do {
      const file_path = path.join(currentDir, filename)
      // Awaiting is fine here because fs.promises.access is inherently non-blocking
      const result = await Result.safe(fs.promises.access(file_path))
      if (result.isOk()) return file_path
      currentDir = path.dirname(currentDir)
    } while (currentDir !== path.dirname(currentDir))

    return undefined
  }

  /**
   * Unwraps a result or else it throws the underlying error
   * @param result
   * @returns
   */
  export function unsafeUnwrap<T, E = Error>(result: Result<T, E>): T {
    return result.unwrapOrElse(() => {
      throw new CLIError((result.unwrapErr() as any)?.message ?? String(result.unwrapErr()))
    })
  }

  export async function read_stdin(): Promise<string | undefined> {
    if (process.stdin.isTTY) return '' // nothing piped
    const chunks = []
    for await (const chunk of process.stdin) {
      chunks.push(chunk)
    }
    return Buffer.concat(
      chunks.map((c) => (Buffer.isBuffer(c) ? c : Buffer.from(c))),
    ).toString('utf8')
  }

  /**
   * chooses a number between ceiling and floor, suitable for picking random elements from an array
   * @param ceiling exclusive
   * @param floor inclusive
   * @returns
   */
  export function random_int(ceiling: number, floor: number = 0) {
    return Math.floor(Math.random() * (ceiling - floor)) + floor
  }

  /**
   * used with command options to accumulate the same option repeated into an array
   * @example `cmd.option('--to <email>', 'to header of email', util.collect_opts, [])`
   * @example `mailto --to bob@example.com --to alice@example.com`
   * @param value
   * @param previous
   * @returns
   */
  export function collect_opts(value: string, previous: string[] = []) {
    return previous.concat([value])
  }

  /**
   * used with a command option to receive a comma separate list and turn it into an array
   * @example `--quiet email,moderation,config`
   * @param value
   * @returns
   */
  export function split_list(param: string): string[] {
    return param.split(',').map((item) => item.trim())
  }

  export function print_w_quiet_and_filter_opts(
    params: {
      quiet?: undefined | boolean | string[]
      filter?: undefined | boolean | string[]
    },
    condition: string,
  ): boolean {
    const { quiet, filter } = params
    if (filter) {
      // filter == true means filter nothing, otherwise only allow if `condition` is included
      if (
        filter == true ||
        filter.some((stage) => {
          if (condition.includes('=')) {
            return condition.includes(stage)
          } else {
            return stage.startsWith(condition)
          }
        })
      ) {
        // quiet overrides filter
        return print_w_quiet(quiet, condition)
      } else {
        return false
      }
    }
    return print_w_quiet(quiet, condition)
  }
  function print_w_quiet(
    quiet: undefined | boolean | string[],
    condition: string,
  ): boolean {
    if (quiet) {
      // quiet == true means silence everything, otherwise only silence if `condition` is included
      if (quiet == true) {
        return false
      } else {
        // if one the stages in quiet matches the condition, then check the match more closely
        if (
          quiet.some((stage) => {
            if (condition.startsWith(stage)) {
              if (condition.includes('=')) {
                return condition == stage
              } else {
                return true
              }
            } else {
              return false
            }
          })
        ) {
          return false
        } else return true
      }
    } else {
      return true
    }
  }
}
