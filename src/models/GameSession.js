const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  a: { type: Number, required: true, min: 0, max: 9 },
  op: { type: String, required: true, enum: ['+', '-', 'x', '/'] },
  b: { type: Number, required: true, min: 0, max: 9 },
  choices: [Number],
  correctAnswer: Number,
  selected: { type: Number, default: null },
  isCorrect: { type: Boolean, default: false },
  timedOut: { type: Boolean, default: false }
});

const gameSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [questionSchema],
  score: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('GameSession', gameSessionSchema);