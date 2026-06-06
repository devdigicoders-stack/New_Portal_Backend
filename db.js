import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/NewsPortal';

// Connect to MongoDB
export async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB successfully.');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
}

// ----------------- SCHEMAS & MODELS -----------------

// 1. User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'reporter', 'editor', 'admin'], default: 'user' },
  isApproved: { type: Boolean, default: true },
  savedNews: [{ type: Number }], // Array of integer IDs for card compatibility
  likedNews: [{ type: Number }]
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);

// 2. News Schema
const commentSchema = new mongoose.Schema({
  id: { type: Number, default: () => Date.now() },
  user: { type: String, required: true },
  text: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] }
});

const newsSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  title: { type: String, required: true, minlength: 5, maxlength: 200 },
  summary: { type: String, required: true, minlength: 10, maxlength: 500 },
  content: { type: String, required: true, minlength: 50 },
  category: { type: String, required: true },
  tags: [{ type: String }],
  author: { type: String, required: true },
  date: { type: String, default: () => new Date().toISOString().split('T')[0] },
  image: { type: String, default: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800' },
  video: { type: String, default: null },
  trending: { type: Boolean, default: false },
  breaking: { type: Boolean, default: false },
  status: { type: String, enum: ['draft', 'pending', 'approved', 'rejected', 'scheduled'], default: 'draft' },
  rejectionReason: { type: String, default: null },
  feedback: { type: String, default: null },
  scheduledPublishDate: { type: Date, default: null },
  approvedBy: { type: String, default: null },
  rejectedBy: { type: String, default: null },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  comments: [commentSchema]
}, { timestamps: true });

newsSchema.index({ author: 1, status: 1 });
newsSchema.index({ status: 1, createdAt: -1 });
newsSchema.index({ category: 1 });
newsSchema.index({ title: 'text', summary: 'text', content: 'text' });

export const News = mongoose.model('News', newsSchema);

// 3. Category Schema
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
}, { timestamps: true });

export const Category = mongoose.model('Category', categorySchema);

// 4. Activity Schema
const activitySchema = new mongoose.Schema({
  user: { type: String, required: true },
  action: { type: String, required: true },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

export const Activity = mongoose.model('Activity', activitySchema);

// ----------------- SEEDER LOGIC -----------------

const initialNewsSeed = [];

export async function seedDatabase() {
  // 1. Seed categories
  const categoriesCount = await Category.countDocuments();
  if (categoriesCount === 0) {
    const list = [
      'Politics', 'Sports', 'Technology', 'Business', 'Entertainment', 'Health', 'World', 'Lifestyle', 'Auto', 'Education'
    ].map(name => ({ name }));
    await Category.insertMany(list);
    console.log('🌱 Seeded news categories.');
  }

  // 2. No default users - SuperAdmin must be created via API
  const usersCount = await User.countDocuments();
  if (usersCount === 0) {
    console.log('🌱 No default users seeded. Create SuperAdmin via POST /users/create-superadmin');
  }

  // 3. Seed news articles
  const newsCount = await News.countDocuments();
  if (newsCount === 0) {
    await News.insertMany(initialNewsSeed);
    console.log('🌱 Seeded initial news articles.');
  }

  // 4. Seed activities
  const activitiesCount = await Activity.countDocuments();
  if (activitiesCount === 0) {
    await Activity.create({
      user: 'Super Admin',
      action: 'System initialized and seeded MongoDB database.'
    });
    console.log('🌱 Seeded activity audit trail.');
  }
}
