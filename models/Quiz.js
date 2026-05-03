const mongoose = require('mongoose');

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questions: [{
    text: { type: String, required: true },
    options: [String],
    correctIndex: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Quiz', quizSchema);
