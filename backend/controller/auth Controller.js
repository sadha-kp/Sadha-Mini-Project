const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretkeyforplatformskillexchange123!@#', {
    expiresIn: '30d'
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, bio, skillsToTeach, skillsToLearn, certificates } = req.body;

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Determine initial mentor status if registering as a mentor
    let mentorStatus = 'none';
    if (role === 'mentor') {
      mentorStatus = 'pending';
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'beginner',
      bio: bio || '',
      skillsToTeach: skillsToTeach || [],
      skillsToLearn: skillsToLearn || [],
      mentorStatus,
      certificates: certificates || []
    });

    if (user) {
      res.status(201).json({
        success: true,
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        skillsToTeach: user.skillsToTeach,
        skillsToLearn: user.skillsToLearn,
        mentorStatus: user.mentorStatus,
        certificates: user.certificates,
        token: generateToken(user._id)
      });
    } else {
      res.status(400).json({ success: false, message: 'Invalid user data' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate a user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      bio: user.bio,
      skillsToTeach: user.skillsToTeach,
      skillsToLearn: user.skillsToLearn,
      mentorStatus: user.mentorStatus,
      certificates: user.certificates,
      ratings: user.ratings,
      reviewCount: user.reviewCount,
      token: generateToken(user._id)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json({
        success: true,
        data: user
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.bio = req.body.bio !== undefined ? req.body.bio : user.bio;
      user.skillsToTeach = req.body.skillsToTeach || user.skillsToTeach;
      user.skillsToLearn = req.body.skillsToLearn || user.skillsToLearn;
      
      // If user wants to upgrade role
      if (req.body.role && ['beginner', 'skilled_user', 'mentor'].includes(req.body.role)) {
        if (req.body.role === 'mentor' && user.role !== 'mentor') {
          user.role = 'mentor';
          user.mentorStatus = 'pending'; // Requires admin review again
        } else if (req.body.role === 'skilled_user' && user.role === 'beginner') {
          user.role = 'skilled_user';
        }
      }

      // If user uploads certificate
      if (req.body.certificates) {
        user.certificates = req.body.certificates;
        if (user.role === 'mentor' && user.mentorStatus === 'none') {
          user.mentorStatus = 'pending';
        }
      }

      const updatedUser = await user.save();

      res.json({
        success: true,
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        bio: updatedUser.bio,
        skillsToTeach: updatedUser.skillsToTeach,
        skillsToLearn: updatedUser.skillsToLearn,
        mentorStatus: updatedUser.mentorStatus,
        certificates: updatedUser.certificates,
        ratings: updatedUser.ratings,
        reviewCount: updatedUser.reviewCount,
        token: generateToken(updatedUser._id)
      });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
