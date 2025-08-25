/**
 * Just a simple wrapper used to indicate that something has been redacted
 */
export interface Redacted<T> {
  value: T
}
export function Redacted<T>(value: T): Redacted<T> {
  return { value }
}

/**
 * Just a simple wrapper used to indicated that something is secret
 */
export interface Secret<T> {
  value: T
}
export function Secret<T>(value: T): Secret<T> {
  return { value }
}
