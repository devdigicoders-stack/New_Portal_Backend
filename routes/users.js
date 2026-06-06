import express from 'express';
import { User, News, Category, Activity } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// 1. Direct Create/Promote Admin API (for CLI script compat)
router.post('/create-admin', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required fields.' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });

    if (existing) {
      existing.role = 'admin';
      await existing.save();
      
      await Activity.create({
        user: 'API Endpoint',
        action: `Upgraded user "${existing.name}" role to admin.`
      });
      
      return res.json({
        message: 'User upgraded to Admin successfully!',
        user: { id: existing._id, name: existing.name, email: existing.email, role: existing.role }
      });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const newAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: 'admin',
      savedNews: [],
      likedNews: []
    });

    await Activity.create({
      user: 'API Endpoint',
      action: `Created new Admin account: "${name}" (${email})`
    });

    res.status(201).json({
      message: 'Admin account created successfully!',
      user: { id: newAdmin._id, name: newAdmin.name, email: newAdmin.email, role: newAdmin.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error creating admin account.' });
  }
});

// 1.5. Create SuperAdmin (First time setup - No auth required)
router.post('/create-superadmin', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required fields.' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    // Check if any admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(403).json({ error: 'SuperAdmin already exists. Use /create-admin endpoint instead.' });
    }

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'Email already registered.' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    const newSuperAdmin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role: 'admin',
      isApproved: true,
      savedNews: [],
      likedNews: []
    });

    await Activity.create({
      user: 'System',
      action: `SuperAdmin account created: "${name}" (${email})`
    });

    res.status(201).json({
      message: 'SuperAdmin account created successfully!',
      user: { 
        id: newSuperAdmin._id, 
        name: newSuperAdmin.name, 
        email: newSuperAdmin.email, 
        role: newSuperAdmin.role 
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error creating superadmin account.' });
  }
});

// 2. Dashboard Statistics & Overview (Admin/Editor only)
router.get('/dashboard-stats', authenticate, authorize(['admin', 'editor']), async (req, res) => {
  try {
    // Run concurrent queries for maximum dashboard load speed
    const [
      totalNews,
      approvedNews,
      pendingNews,
      users,
      totalCategories,
      recentActivities
    ] = await Promise.all([
      News.countDocuments(),
      News.countDocuments({ status: 'approved' }),
      News.countDocuments({ status: 'pending' }),
      User.find({}),
      Category.countDocuments(),
      Activity.find({}).sort({ date: -1 }).limit(10)
    ]);

    const totalUsers = users.length;
    const reporters = users.filter(u => u.role === 'reporter').length;
    const editors = users.filter(u => u.role === 'editor').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const standardReaders = users.filter(u => u.role === 'user').length;

    res.json({
      counts: {
        totalNews,
        approvedNews,
        pendingNews,
        totalUsers,
        standardReaders,
        reporters,
        editors,
        admins,
        categories: totalCategories
      },
      recentActivities
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error loading dashboard statistics.' });
  }
});

// 3. Create a User Account directly (Admin only - used to create Reporters, Editors, Users)
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password, and role are required fields.' });
  }

  if (!['user', 'reporter', 'editor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role value.' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const hashed = bcrypt.hashSync(password, 10);
    // Reporters default to false unless explicitly set to true
    const defaultApproved = role === 'reporter' ? (req.body.isApproved === true) : true;
    
    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      role,
      isApproved: defaultApproved,
      savedNews: [],
      likedNews: []
    });

    await Activity.create({
      user: req.user.name,
      action: `Created new ${role} account: "${name}" (${email}) - Approved: ${defaultApproved}`
    });

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully!`,
      user: { id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error creating user account.' });
  }
});

// 4. List registered accounts with optional role filtering (Admin only)
router.get('/', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = {};
    
    if (role && ['user', 'reporter', 'editor', 'admin'].includes(role)) {
      filter.role = role;
    }

    if (req.query.approved !== undefined) {
      filter.isApproved = req.query.approved === 'true';
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex }
      ];
    }

    const list = await User.find(filter).select('-password');
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Server error listing accounts.' });
  }
});

// 4.5. Get User Account Details (Admin only)
router.get('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const target = await User.findById(req.params.id).select('-password');
    if (!target) {
      return res.status(404).json({ error: 'Target user not found.' });
    }
    res.json(target);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving user details.' });
  }
});

// 5. Update Account Details (Admin only)
router.put('/:id', authenticate, authorize(['admin']), async (req, res) => {
  const { name, email, role, password } = req.body;

  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    // Check if target role matches if it's changing
    if (role && !['user', 'reporter', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid target role.' });
    }

    // Admins cannot change their own roles via this endpoint to prevent lockout
    if (target._id.toString() === req.user.id.toString()) {
      if (role && role !== target.role) {
        return res.status(400).json({ error: 'Forbidden: Admins cannot change their own roles via this dashboard.' });
      }
    }

    // Check email uniqueness if email is changing
    if (email && email.toLowerCase() !== target.email.toLowerCase()) {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(400).json({ error: 'An account with this email already exists.' });
      }
      target.email = email.toLowerCase();
    }

    if (name !== undefined) target.name = name;
    if (role !== undefined) target.role = role;
    
    if (password && password.trim()) {
      target.password = bcrypt.hashSync(password, 10);
    }

    await target.save();

    await Activity.create({
      user: req.user.name,
      action: `Updated account details for user "${target.name}" (${target.email}), Role: ${target.role}`
    });

    res.json({
      message: 'Account details updated successfully!',
      user: { id: target._id, name: target.name, email: target.email, role: target.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating user details.' });
  }
});

// 5.2. Toggle Reporter/User Approval Status (Admin only)
router.put('/:id/approve', authenticate, authorize(['admin']), async (req, res) => {
  const { isApproved } = req.body;
  if (isApproved === undefined) {
    return res.status(400).json({ error: 'Missing isApproved boolean value in request body.' });
  }

  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    target.isApproved = isApproved;
    await target.save();

    await Activity.create({
      user: req.user.name,
      action: `${isApproved ? 'Approved' : 'Suspended'} user account: "${target.name}" (${target.email})`
    });

    res.json({
      message: `User account status updated to ${isApproved ? 'Approved' : 'Suspended'} successfully!`,
      user: { id: target._id, name: target.name, email: target.email, role: target.role, isApproved: target.isApproved }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating user approval status.' });
  }
});

// 5.5. Update Account Role (Admin only - Legacy support)
router.put('/:id/role', authenticate, authorize(['admin']), async (req, res) => {
  const { role } = req.body;
  if (!role || !['user', 'reporter', 'editor', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid or missing target role.' });
  }

  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    if (target._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ error: 'Forbidden: Admins cannot change their own roles.' });
    }

    target.role = role;
    await target.save();

    await Activity.create({
      user: req.user.name,
      action: `Promoted/demoted user "${target.name}" role to: ${role}`
    });

    res.json({
      message: `Account role updated to ${role} successfully!`,
      user: { id: target._id, name: target.name, email: target.email, role: target.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating role.' });
  }
});

// 6. Delete Account (Admin only)
router.delete('/:id', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const target = await User.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    if (target._id.toString() === req.user.id.toString()) {
      return res.status(400).json({ error: 'Forbidden: Admins cannot delete their own accounts.' });
    }

    await User.deleteOne({ _id: target._id });

    await Activity.create({
      user: req.user.name,
      action: `Deleted user account: "${target.name}" (${target.email})`
    });

    res.json({ message: 'User account deleted successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting account.' });
  }
});

export default router;
