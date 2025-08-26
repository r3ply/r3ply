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
