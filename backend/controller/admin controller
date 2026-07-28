const User = require('../models/User');
const Session = require('../models/Session');
const Booking = require('../models/Booking');
const Category = require('../models/Category');
const Review = require('../models/Review');

// @desc    Get dashboard metrics & stats
// @route   GET /api/admin/stats
// @access  Private (Admin only)
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBeginners = await User.countDocuments({ role: 'beginner' });
    const totalSkilledUsers = await User.countDocuments({ role: 'skilled_user' });
    const totalMentors = await User.countDocuments({ role: 'mentor' });
    const totalBookings = await Booking.countDocuments();

    // Calculate simulated earnings from paid bookings
    const paidBookingsResult = await Booking.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $group: { _id: null, totalEarnings: { $sum: '$amountPaid' } } }
    ]);
    const totalEarnings = paidBookingsResult.length > 0 ? paidBookingsResult[0].totalEarnings : 0;

    const totalCategories = await Category.countDocuments();
    const pendingMentorsCount = await User.countDocuments({ mentorStatus: 'pending' });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalBeginners,
        totalSkilledUsers,
        totalMentors,
        totalBookings,
        totalEarnings,
        totalCategories,
        pendingMentorsCount
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users list
// @route   GET /api/admin/users
// @access  Private (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user role or delete user
// @route   PUT /api/admin/users/:id
// @access  Private (Admin only)
exports.updateUserRole = async (req, res) => {
  try {
    const { role, mentorStatus } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (role) {
      user.role = role;
    }
    if (mentorStatus) {
      user.mentorStatus = mentorStatus;
    }

    await user.save();

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting itself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Admin cannot delete themselves' });
    }

    await user.deleteOne();
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all pending mentor applications
// @route   GET /api/admin/mentors/pending
// @access  Private (Admin only)
exports.getPendingMentors = async (req, res) => {
  try {
    const pendingMentors = await User.find({ mentorStatus: 'pending' }).sort({ createdAt: -1 });
    res.json({
      success: true,
      count: pendingMentors.length,
      data: pendingMentors
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify and Approve/Reject mentor registration
// @route   POST /api/admin/mentors/:id/verify
// @access  Private (Admin only)
exports.verifyMentor = async (req, res) => {
  try {
    const { action } = req.body; // 'approve' or 'reject'
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Invalid action. Use approve or reject' });
    }

    const mentor = await User.findById(req.params.id);
    if (!mentor) {
      return res.status(404).json({ success: false, message: 'Mentor not found' });
    }

    if (action === 'approve') {
      mentor.mentorStatus = 'approved';
      mentor.role = 'mentor'; // upgrade role to mentor on approval
    } else {
      mentor.mentorStatus = 'rejected';
      // keep original role or reset to beginner
    }

    await mentor.save();

    res.json({
      success: true,
      message: `Mentor certificate ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      data: mentor
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a category
// @route   POST /api/admin/categories
// @access  Private (Admin only)
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !description) {
      return res.status(400).json({ success: false, message: 'Please provide category name and description' });
    }

    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    const category = await Category.create({ name, description });

    res.status(201).json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all categories (public route, but placing here or controller is fine)
// @route   GET /api/admin/categories
// @access  Public
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a category
// @route   DELETE /api/admin/categories/:id
// @access  Private (Admin only)
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    await category.deleteOne();
    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all payment records and reviews
// @route   GET /api/admin/records
// @access  Private (Admin only)
exports.getRecords = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('session')
      .populate('learner', 'name email')
      .populate('mentor', 'name email')
      .sort({ createdAt: -1 });

    const reviews = await Review.find()
      .populate('reviewer', 'name')
      .populate('reviewee', 'name')
      .populate('booking')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        bookings,
        reviews
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
