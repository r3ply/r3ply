import { RiTa } from 'rita'
import fs from 'fs'

// Note: most of these are commented out because at the moment small models seem to be good enough but are also much more performant
// TODO: in the future I should spend more time filtering and preprocessing the data.
const input_files = [
  './src/comments/training_data/hackernews_parents_10000000.comments.json',
  // './src/comments/training_data/hackernews_parents_10500000.comments.json',
  // './src/comments/training_data/hackernews_parents_11000000.comments.json',
  // './src/comments/training_data/hackernews_parents_11500000.comments.json',
  // './src/comments/training_data/hackernews_parents_12000000.comments.json',
  // './src/comments/training_data/hackernews_parents_12500000.comments.json',
  // './src/comments/training_data/hackernews_parents_13000000.comments.json',
  // './src/comments/training_data/hackernews_parents_13500000.comments.json',
  // './src/comments/training_data/hackernews_parents_14000000.comments.json',
  // './src/comments/training_data/hackernews_parents_14500000.comments.json',
  // './src/comments/training_data/hackernews_parents_15500000.comments.json',
  // './src/comments/training_data/hackernews_parents_16000000.comments.json',
  // './src/comments/training_data/hackernews_parents_16500000.comments.json',
  // './src/comments/training_data/hackernews_parents_17000000.comments.json',
  // './src/comments/training_data/hackernews_parents_17500000.comments.json',
  // './src/comments/training_data/hackernews_parents_18000000.comments.json',
  // './src/comments/training_data/hackernews_parents_18500000.comments.json',
  // './src/comments/training_data/hackernews_parents_19000000.comments.json',
  // './src/comments/training_data/hackernews_parents_19500000.comments.json',
  // './src/comments/training_data/hackernews_parents_20000000.comments.json',
  // './src/comments/training_data/hackernews_parents_20500000.comments.json',
  // './src/comments/training_data/hackernews_parents_21000000.comments.json',
  // './src/comments/training_data/hackernews_parents_21500000.comments.json',
  // './src/comments/training_data/hackernews_parents_22000000.comments.json',
  // './src/comments/training_data/hackernews_parents_22500000.comments.json',
  // './src/comments/training_data/hackernews_parents_23000000.comments.json',
  // './src/comments/training_data/hackernews_parents_23500000.comments.json',
  // './src/comments/training_data/hackernews_parents_24000000.comments.json',
  // './src/comments/training_data/hackernews_parents_24500000.comments.json',
  // './src/comments/training_data/hackernews_parents_25000000.comments.json'
]

// Initialize the model
const markov = RiTa.markov(5)

// Read the file and add each comment to the model
function train_on_file(input_file_path: string) {
  console.log(`processing file: ${input_file_path}`)
  const comments: string[] = JSON.parse(
    fs.readFileSync(input_file_path).toString(),
  )
  // comments.forEach(comment => markov.addText(comment))
  markov.addText(comments)
}

// Iterate through each file and train on it
console.log('Beginning training...')
input_files.forEach(train_on_file)

// Save the trained model to a file
console.log('writing model to file')
fs.writeFileSync('src/comments/comments-markov-model.json', markov.toJSON())
console.log('Model saved to src/comments/comments-markov-model.json')
