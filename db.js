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
import { User } from './models/User.js';
import { News } from './models/News.js';
import { Category } from './models/Category.js';
import { Activity } from './models/Activity.js';

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
