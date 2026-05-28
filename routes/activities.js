import express from 'express';
import { Activity } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Get audit activity logs (Staff: reporter, editor, admin only)
router.get('/', authenticate, authorize(['reporter', 'editor', 'admin']), async (req, res) => {
  try {
    // Sort by latest action first
    const list = await Activity.find({}).sort({ date: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Server error loading audit activity logs.' });
  }
});

export default router;
