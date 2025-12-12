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
  console.log(`🎮 [GAME START] Request from User: ${req.user.id}`);
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

    console.log(`✅ [GAME START] Success - Game: ${gameSession._id}, User: ${req.user.id}`);
    res.json({ gameId: gameSession._id, questions: responseQuestions });
  } catch (err) {
    console.error(`❌ [GAME START] Error for user ${req.user.id}:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/answer/:gameId/:questionId', authenticateAccessToken, async (req, res) => {
  console.log(`✅ [ANSWER] User: ${req.user.id}, Game: ${req.params.gameId}, Question: ${req.params.questionId}`);
  try {
    const { gameId, questionId } = req.params;
    const { selected, timedOut } = req.body;

    const game = await GameSession.findById(gameId);
    if (!game) {
      console.log(`❌ [ANSWER] Game not found: ${gameId}`);
      return res.status(404).json({ message: 'Game not found' });
    }

    const question = game.questions.id(questionId);
    if (!question) {
      console.log(`❌ [ANSWER] Question not found: ${questionId}`);
      return res.status(404).json({ message: 'Question not found' });
    }

    if (question.selected !== null) {
      console.log(`❌ [ANSWER] Question already answered: ${questionId}`);
      return res.status(400).json({ message: 'Question already answered' });
    }

    if (!timedOut) {
      question.selected = Number(selected);
      question.isCorrect = question.correctAnswer === Number(selected);
    } else {
      question.timedOut = true;
      question.selected = null;
      question.isCorrect = false;
    }

    await game.save();
    console.log(`✅ [ANSWER] Saved - Correct: ${question.isCorrect}, TimedOut: ${question.timedOut}`);
    res.json({ success: true });
  } catch (err) {
    console.error(`❌ [ANSWER] Error for game ${req.params.gameId}:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/questions/:gameId', authenticateAccessToken, async (req, res) => {
  console.log(`📝 [GET QUESTIONS] User: ${req.user.id}, Game: ${req.params.gameId}`);
  try {
    const { gameId } = req.params;
    const game = await GameSession.findById(gameId);
    if (!game) {
      console.log(`❌ [GET QUESTIONS] Game not found: ${gameId}`);
      return res.status(404).json({ message: 'Game not found' });
    }

    console.log(`✅ [GET QUESTIONS] Success - Game: ${gameId}`);
    res.json({ game });
  } catch (err) {
    console.error(`❌ [GET QUESTIONS] Error for game ${req.params.gameId}:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/result/:gameId', authenticateAccessToken, async (req, res) => {
  console.log(`🏆 [RESULT] User: ${req.user.id}, Game: ${req.params.gameId}`);
  try {
    const { gameId } = req.params;
    const game = await GameSession.findById(gameId);
    if (!game) {
      console.log(`❌ [RESULT] Game not found: ${gameId}`);
      return res.status(404).json({ message: 'Game not found' });
    }

    const score = game.questions.filter(q => q.isCorrect).length;
    game.score = score;
    await game.save();

    console.log(`✅ [RESULT] Success - Game: ${gameId}, Score: ${score}/10`);
    res.json({ game, score });
  } catch (err) {
    console.error(`❌ [RESULT] Error for game ${req.params.gameId}:`, err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
