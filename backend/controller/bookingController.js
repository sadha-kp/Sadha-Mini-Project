const Booking = require('../models/Booking');
const Session = require('../models/Session');
const ExchangeRequest = require('../models/ExchangeRequest');
const Review = require('../models/Review');
const User = require('../models/User');

// ==========================================
// BOOKING CONTROLLERS
// ==========================================

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    const { sessionId, scheduledTime } = req.body;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Check if user is trying to book their own session
    if (session.creator.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot book your own session' });
    }

    // Set payment details based on session type
    const isExchange = session.type === 'exchange';
    const amount = isExchange ? 0 : session.price;
    const initialPaymentStatus = isExchange ? 'paid' : 'pending';

    const booking = await Booking.create({
      session: sessionId,
      learner: req.user._id,
      mentor: session.creator,
      scheduledTime,
      paymentStatus: initialPaymentStatus,
      amountPaid: amount,
      status: 'pending' // pending approval from host
    });

    res.status(201).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get bookings of current user (both as learner and mentor)
// @route   GET /api/bookings
// @access  Private
exports.getMyBookings = async (req, res) => {
  try {
    const { as } = req.query; // 'learner' or 'mentor'
    let query = {};

    if (as === 'learner') {
      query.learner = req.user._id;
    } else if (as === 'mentor') {
      query.mentor = req.user._id;
    } else {
      query = {
        $or: [{ learner: req.user._id }, { mentor: req.user._id }]
      };
    }

    const bookings = await Booking.find(query)
      .populate('session')
      .populate('learner', 'name email role bio ratings')
      .populate('mentor', 'name email role bio ratings')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Simulate payment for a booking
// @route   POST /api/bookings/:id/pay
// @access  Private
exports.processSimulatedPayment = async (req, res) => {
  try {
    const { cardNumber, cardHolder, expiry, cvv } = req.body;
    
    // Quick validation simulation
    if (!cardNumber || !cardHolder || !expiry || !cvv) {
      return res.status(400).json({ success: false, message: 'Please provide all payment fields' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.learner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to pay for this booking' });
    }

    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({ success: false, message: 'Booking is already paid' });
    }

    // Simulate successful transaction
    booking.paymentStatus = 'paid';
    booking.paymentId = 'SIM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    await booking.save();

    res.json({
      success: true,
      message: 'Simulated payment successful',
      data: booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update booking status (Approve, Reject, Complete)
// @route   PUT /api/bookings/:id/status
// @access  Private
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'approved', 'rejected', 'completed'
    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isMentor = booking.mentor.toString() === req.user._id.toString();
    const isLearner = booking.learner.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // Business Logic for status updates:
    // Mentors can approve/reject pending bookings.
    // Learners or mentors can complete approved bookings.
    if (status === 'approved' || status === 'rejected') {
      if (!isMentor && !isAdmin) {
        return res.status(401).json({ success: false, message: 'Only the session host can approve or reject' });
      }
    }

    if (status === 'completed') {
      if (!isLearner && !isMentor && !isAdmin) {
        return res.status(401).json({ success: false, message: 'Only session participants can mark it as completed' });
      }
      if (booking.status !== 'approved') {
        return res.status(400).json({ success: false, message: 'Only approved bookings can be completed' });
      }
    }

    booking.status = status;
    await booking.save();

    res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      data: booking
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// REVIEW CONTROLLERS
// ==========================================

// @desc    Submit a review for a booking
// @route   POST /api/bookings/:id/review
// @access  Private
exports.createReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: 'Please provide rating and comment' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Verify current user is the learner who booked the session
    if (booking.learner.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Only the learner can review this booking' });
    }

    // Verify session is marked completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'You can only review completed sessions' });
    }

    // Check if review already exists for this booking
    const existingReview = await Review.findOne({ booking: req.params.id });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this booking' });
    }

    const review = await Review.create({
      booking: req.params.id,
      reviewer: req.user._id,
      reviewee: booking.mentor,
      rating,
      comment
    });

    res.status(201).json({
      success: true,
      data: review
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SKILL EXCHANGE REQUESTS CONTROLLERS
// ==========================================

// @desc    Send skill exchange request to another user
// @route   POST /api/exchanges
// @access  Private
exports.sendExchangeRequest = async (req, res) => {
  try {
    const { receiverId, offeredSkill, requestedSkill, message } = req.body;

    if (!receiverId || !offeredSkill || !requestedSkill) {
      return res.status(400).json({ success: false, message: 'Please provide receiver, offered skill, and requested skill' });
    }

    if (receiverId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot request skill exchange with yourself' });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ success: false, message: 'Receiver user not found' });
    }

    const exchangeRequest = await ExchangeRequest.create({
      sender: req.user._id,
      receiver: receiverId,
      offeredSkill,
      requestedSkill,
      message: message || '',
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: exchangeRequest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all exchange requests involving current user
// @route   GET /api/exchanges
// @access  Private
exports.getMyExchangeRequests = async (req, res) => {
  try {
    const requests = await ExchangeRequest.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }]
    })
      .populate('sender', 'name email role bio ratings skillsToTeach skillsToLearn')
      .populate('receiver', 'name email role bio ratings skillsToTeach skillsToLearn')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: requests
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update exchange request status (Approve, Reject)
// @route   PUT /api/exchanges/:id
// @access  Private
exports.updateExchangeRequestStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'approved', 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update' });
    }

    const request = await ExchangeRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Exchange request not found' });
    }

    // Verify current user is receiver
    if (request.receiver.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized to update this exchange request' });
    }

    request.status = status;
    await request.save();

    res.json({
      success: true,
      message: `Exchange request ${status}`,
      data: request
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
