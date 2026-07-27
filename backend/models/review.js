const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  reviewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reviewee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: [true, 'Please add a rating between 1 and 5'],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: [true, 'Please add a comment']
  }
}, {
  timestamps: true
});

// Update the user's average rating and reviewCount after review is saved
reviewSchema.statics.calculateAverageRating = async function(userId) {
  const obj = await this.aggregate([
    { $match: { reviewee: userId } },
    {
      $group: {
        _id: '$reviewee',
        averageRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  try {
    if (obj.length > 0) {
      await mongoose.model('User').findByIdAndUpdate(userId, {
        ratings: Math.round(obj[0].averageRating * 10) / 10,
        reviewCount: obj[0].reviewCount
      });
    } else {
      await mongoose.model('User').findByIdAndUpdate(userId, {
        ratings: 0,
        reviewCount: 0
      });
    }
  } catch (err) {
    console.error(err);
  }
};

// Call calculateAverageRating after save
reviewSchema.post('save', async function() {
  await this.constructor.calculateAverageRating(this.reviewee);
});

module.exports = mongoose.model('Review', reviewSchema);
