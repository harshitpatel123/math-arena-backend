const express = require('express');
const router = express.Router();
const GameSession = require('../models/GameSession');
const { authenticateAccessToken } = require('../middleware/authMiddleware');

const operators = ['+', '-', 'x', '/'];

function generateQuestion() {
  let a = Math.floor(Math.random() * 10);
  let b = Math.floor(Math.random() * 10);
  let op = operators[Math.floor(Math.random() * 4)];

  // Avoid division by zero
  if (op === '/' && b === 0) b = 1;

  let correctAnswer;
  switch (op) {
    case '+': correctAnswer = a + b; break;
    case '-': correctAnswer = a - b; break;
    case 'x': correctAnswer = a * b; break;
    case '/': correctAnswer = parseFloat((a / b).toFixed(2)); break;
  }

  // Generate 3 random choices besides correct one
  let choices = new Set([correctAnswer]);
  while (choices.size < 4) {
    choices.add(Math.floor(Math.random() * 20));
  }

  choices = Array.from(choices).sort(() => Math.random() - 0.5); // shuffle

  return { a, op, b, choices, correctAnswer };
}

router.post('/start', authenticateAccessToken, async (req, res) => {
  try {
    let questions = [];
    const existingEquations = new Set();

    while (questions.length < 10) {
      const q = generateQuestion();
      const key = `${q.a}${q.op}${q.b}`;
      if (!existingEquations.has(key)) {
        existingEquations.add(key);
        questions.push(q);
      }
    }

    const gameSession = new GameSession({
      user: req.user.id,
      questions
    });

    await gameSession.save();

    const responseQuestions = questions.map(q => ({
      id: q._id,
      a: q.a,
      op: q.op,
      b: q.b,
      choices: q.choices
    }));

    res.json({ gameId: gameSession._id, questions: responseQuestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/answer/:gameId/:questionId', authenticateAccessToken, async (req, res) => {
  try {
    const { gameId, questionId } = req.params;
    const { selected, timedOut } = req.body;

    const game = await GameSession.findById(gameId);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const question = game.questions.id(questionId);
    if (!question) return res.status(404).json({ message: 'Question not found' });

    if (question.selected !== null)
      return res.status(400).json({ message: 'Question already answered' });

    if (!timedOut) {
      question.selected = Number(selected);
      question.isCorrect = question.correctAnswer === Number(selected);
    } else {
      question.timedOut = true;
      question.selected = null;
      question.isCorrect = false;
    }

    await game.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/questions/:gameId', authenticateAccessToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await GameSession.findById(gameId);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    res.json({ game });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/result/:gameId', authenticateAccessToken, async (req, res) => {
  try {
    const { gameId } = req.params;
    const game = await GameSession.findById(gameId);
    if (!game) return res.status(404).json({ message: 'Game not found' });

    const score = game.questions.filter(q => q.isCorrect).length;
    game.score = score;
    await game.save();

    res.json({ game, score });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
