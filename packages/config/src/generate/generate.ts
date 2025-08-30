import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { raw_site_parser } from '../schema/site.config.0.0.1'

// prepare directory
mkdirSync('./src/generated2', { recursive: true })

// read in site template and substitute dependencies
const site_template = readFileSync('./src/generate/site.ts')
  .toString()
  .replace(`'<RAW_SITE_PARSER_MODULE>'`, raw_site_parser.toModule())

// write rendered template to target directory, to be compiled next
writeFileSync('./src/generated2/site.ts', `// @ts-nocheck\n${site_template}`)

// export everything with an index file
writeFileSync('./src/generated2/index.ts', `export * from './site'`)
