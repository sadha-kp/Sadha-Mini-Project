const Session = require('../models/Session');
const User = require('../models/User');

// @desc    Create a new session
// @route   POST /api/sessions
// @access  Private (Skilled Users & Mentors)
exports.createSession = async (req, res) => {
  try {
    const { title, description, category, price, duration, slots, type } = req.body;

    // Check user role permission
    if (!['skilled_user', 'mentor', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only skilled users, mentors, or admins can create sessions'
      });
    }

    // If role is mentor, check verification status
    if (req.user.role === 'mentor' && req.user.mentorStatus !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your mentor certificate must be approved by the admin to create sessions'
      });
    }

    // Set correct session type
    // Mentors only create paid sessions by default, but skilled users can do exchange or paid
    const sessionType = type || (req.user.role === 'mentor' ? 'paid' : 'exchange');

    const session = await Session.create({
      title,
      description,
      category,
      creator: req.user._id,
      price: sessionType === 'exchange' ? 0 : (price || 0),
      duration,
      slots: slots || [],
      type: sessionType
    });

    res.status(201).json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all sessions (with filters & search)
// @route   GET /api/sessions
// @access  Public
exports.getSessions = async (req, res) => {
  try {
    const { category, type, search, minPrice, maxPrice } = req.query;
    let query = {};

    if (category) {
      query.category = category;
    }

    if (type) {
      query.type = type;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const sessions = await Session.find(query)
      .populate('category')
      .populate('creator', 'name role bio ratings reviewCount mentorStatus')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single session
// @route   GET /api/sessions/:id
// @access  Public
exports.getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('category')
      .populate('creator', 'name role bio ratings reviewCount mentorStatus');

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a session
// @route   PUT /api/sessions/:id
// @access  Private (Creator only)
exports.updateSession = async (req, res) => {
  try {
    let session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Make sure user is the session creator or admin
    if (session.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to update this session' });
    }

    session = await Session.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a session
// @route   DELETE /api/sessions/:id
// @access  Private (Creator only)
exports.deleteSession = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    // Make sure user is session creator or admin
    if (session.creator.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(401).json({ success: false, message: 'Not authorized to delete this session' });
    }

    await session.deleteOne();

    res.json({
      success: true,
      message: 'Session removed'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
