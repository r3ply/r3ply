import { writeFileSync, mkdirSync, readFileSync } from 'fs'
import { raw_site_parser, site_schema } from '../schema/site'
import { raw_system_parser, system_schema } from '../schema/r3ply'

// prepare directory
mkdirSync('./src/generated', { recursive: true })

// read in site template and substitute dependencies
const site_template = readFileSync('./src/codegen/site.ts')
  .toString()
  .replace(`'<RAW_SITE_PARSER_MODULE>'`, raw_site_parser.toModule())

// read in system template and substitute dependencies
const system_template = readFileSync('./src/codegen/r3ply.ts')
  .toString()
  .replace(`'<RAW_SYSTEM_PARSER_MODULE>'`, raw_system_parser.toModule())

// write rendered template to target directory, to be compiled next
writeFileSync('./src/generated/site.ts', `// @ts-nocheck\n${site_template}`)
writeFileSync('./src/generated/site.v0.0.1.json', JSON.stringify(site_schema))

// write rendered template to target directory, to be compiled next
writeFileSync('./src/generated/r3ply.ts', `// @ts-nocheck\n${system_template}`)
writeFileSync(
  './src/generated/r3ply.v0.0.1.json',
  JSON.stringify(system_schema),
)

// export everything with an index file
writeFileSync(
  './src/generated/index.ts',
  readFileSync('./src/codegen/index.ts').toString(),
)
