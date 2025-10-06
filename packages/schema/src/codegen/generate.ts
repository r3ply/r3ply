import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { raw_site_parser, raw_system_parser } from '../config'

// prepare directory
mkdirSync('./src/generated', { recursive: true })

// read in site templates and substitute dependencies
const site_template = readFileSync('./src/codegen/site.ts')
  .toString()
  .replace(`'<RAW_SITE_PARSER_MODULE>'`, raw_site_parser.toModule())
const system_template = readFileSync('./src/codegen/r3ply.ts')
  .toString()
  .replace(`'<RAW_SYSTEM_PARSER_MODULE>'`, raw_system_parser.toModule())

// write rendered templates to target directory, to be compiled next
writeFileSync('./src/generated/site.ts', `// @ts-nocheck\n${site_template}`)
writeFileSync('./src/generated/r3ply.ts', `// @ts-nocheck\n${system_template}`)

// export everything with an index file
writeFileSync(
  './src/generated/index.ts',
  readFileSync('./src/codegen/index.ts'),
)
