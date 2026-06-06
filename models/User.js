import mongoose from 'mongoose';

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
