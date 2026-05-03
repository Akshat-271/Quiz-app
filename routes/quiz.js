const express = require('express');
const Quiz = require('../models/Quiz');
const { verifyToken } = require('../middleware/auth');
const router = express.Router();

router.use(verifyToken);

router.get('/', async (req, res) => {
  try {
    const quizzes = await Quiz.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const count = await Quiz.countDocuments({ ownerId: req.user.id });
    if (count >= 5) return res.status(400).json({ error: 'Maximum 5 quizzes allowed' });
    const quiz = await Quiz.create({ ...req.body, ownerId: req.user.id });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user.id },
      { title: req.body.title, questions: req.body.questions },
      { new: true }
    );
    if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Quiz.findOneAndDelete({ _id: req.params.id, ownerId: req.user.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
