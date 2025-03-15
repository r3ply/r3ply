import fs from 'fs'
import readline from 'readline'
import { sanitize_html, unescape_html } from '@r3ply/wasm'

const inputFiles = [
  './src/comments/training_data/hackernews_parents_10000000.json',
  './src/comments/training_data/hackernews_parents_10500000.json',
  './src/comments/training_data/hackernews_parents_11000000.json',
  './src/comments/training_data/hackernews_parents_11500000.json',
  './src/comments/training_data/hackernews_parents_12000000.json',
  './src/comments/training_data/hackernews_parents_12500000.json',
  './src/comments/training_data/hackernews_parents_13000000.json',
  './src/comments/training_data/hackernews_parents_13500000.json',
  './src/comments/training_data/hackernews_parents_14000000.json',
  './src/comments/training_data/hackernews_parents_14500000.json',
  './src/comments/training_data/hackernews_parents_15500000.json',
  './src/comments/training_data/hackernews_parents_16000000.json',
  './src/comments/training_data/hackernews_parents_16500000.json',
  './src/comments/training_data/hackernews_parents_17000000.json',
  './src/comments/training_data/hackernews_parents_17500000.json',
  './src/comments/training_data/hackernews_parents_18000000.json',
  './src/comments/training_data/hackernews_parents_18500000.json',
  './src/comments/training_data/hackernews_parents_19000000.json',
  './src/comments/training_data/hackernews_parents_19500000.json',
  './src/comments/training_data/hackernews_parents_20000000.json',
  './src/comments/training_data/hackernews_parents_20500000.json',
  './src/comments/training_data/hackernews_parents_21000000.json',
  './src/comments/training_data/hackernews_parents_21500000.json',
  './src/comments/training_data/hackernews_parents_22000000.json',
  './src/comments/training_data/hackernews_parents_22500000.json',
  './src/comments/training_data/hackernews_parents_23000000.json',
  './src/comments/training_data/hackernews_parents_23500000.json',
  './src/comments/training_data/hackernews_parents_24000000.json',
  './src/comments/training_data/hackernews_parents_24500000.json',
  './src/comments/training_data/hackernews_parents_25000000.json',
]

function prepare_file_for_training(input_path: string, output_path: string) {
  const data = JSON.parse(fs.readFileSync(input_path).toString())
    .filter((el: any) => {
      if (el.by == 'whoishiring') return false
      if (new RegExp(/Who wants to be hired/i).test(el.title)) return false
      if (el.text) return true
      return false
    })
    .map((el: any) => unescape_html(el.text))
    .filter((comment: string) => {
      return comment.length >= 10 && !comment.includes('http')
    })
    .map((comment: string) => {
      return sanitize_html(comment, [])
        .replace(/[“”]/g, '"') // Normalize quotes
        .replace(/[‘’]/g, "'")
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim()
    })
    .filter((comment: string) => {
      const disallow_list = [
        /["'\(\)\[\]{}:]/i,
        /(www|\.com|\.net|\.io|\.org)/i,
        /(job|hire|salary|money|earn|use this format)/i,
        /\S\.\S/,
      ]
      return !disallow_list.some((regex) => regex.test(comment))
    })
  fs.writeFileSync(output_path, JSON.stringify(data, null, 2))
}

inputFiles.forEach((input_file_path) => {
  const output_file_path = input_file_path.replace('.json', '.comments.json')
  prepare_file_for_training(input_file_path, output_file_path)
})

console.log('done preparing files')
