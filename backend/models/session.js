const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a session title'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please add a session description']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  duration: {
    type: String,
    required: [true, 'Please add duration (e.g., 1 hour, 45 minutes)']
  },
  slots: {
    type: [String],
    default: []
  },
  type: {
    type: String,
    enum: ['paid', 'exchange'],
    default: 'paid'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Session', sessionSchema);
