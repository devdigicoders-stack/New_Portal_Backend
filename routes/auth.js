import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Activity } from '../models/Activity.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'newsportal_super_secret_key';

// User Registration
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required registration details.' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user', // Defaults to normal reader
      savedNews: [],
      likedNews: []
    });

    // Sign JWT immediately
    const token = jwt.sign(
      { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful!',
      token,
      user: {
        id: newUser._id, // Keep standard MongoDB id in response but map to id in client
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        savedNews: newUser.savedNews,
        likedNews: newUser.likedNews
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error processing registration.' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
    }

    // Reporter Admin Approval enforcement check
    if (user.role === 'reporter' && !user.isApproved) {
      return res.status(403).json({ error: 'Reporter account pending Admin approval. Please contact an Administrator.' });
    }

    const token = jwt.sign(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        savedNews: user.savedNews || [],
        likedNews: user.likedNews || []
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error processing login.' });
  }
});

// Get Current User Profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      savedNews: user.savedNews || [],
      likedNews: user.likedNews || []
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving profile.' });
  }
});

// Change Password
router.post('/change-password', authenticate, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Both old and new passwords are required.' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password.' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    await Activity.create({
      user: user.name,
      action: 'Updated account password successfully.'
    });

    res.json({ message: 'Password changed successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating password.' });
  }
});

export default router;
