const User = require('../models/User');
const Category = require('../models/Category');

const seedDB = async () => {
  try {
    // 1. Seed Categories if empty
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      const defaultCategories = [
        { name: 'Software Development', description: 'Web Development, App Development, Python, JavaScript, DevOps, databases etc.' },
        { name: 'Design & Creative', description: 'UI/UX design, Graphic Design, Video Editing, 3D Modelling, Animation.' },
        { name: 'Business & Marketing', description: 'Digital Marketing, SEO, Copywriting, Sales, Entrepreneurship, Finance.' },
        { name: 'Languages & Academics', description: 'English, Spanish, Mandarin, Mathematics, Physics, Chemistry.' },
        { name: 'Music & Arts', description: 'Guitar playing, Piano, Singing, Digital Art, Painting, Photography.' }
      ];
      await Category.insertMany(defaultCategories);
      console.log('Database seeded with default skill categories.');
    }

    // 2. Seed Admin User if empty
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        email: 'admin@skillexchange.com',
        password: 'adminpassword123', // Will be hashed by pre-save middleware
        role: 'admin',
        bio: 'Platform administration account.',
        skillsToTeach: ['Administration'],
        skillsToLearn: [],
        mentorStatus: 'none'
      });
      console.log('Database seeded with default Admin user: admin@skillexchange.com / adminpassword123');
    }
  } catch (error) {
    console.error(`Database seeding error: ${error.message}`);
  }
};

module.exports = seedDB;
