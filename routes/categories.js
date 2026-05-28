import express from 'express';
import { Category, Activity } from '../db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// List Categories
router.get('/', async (req, res) => {
  try {
    const list = await Category.find({});
    // Expose plain string array for seamless compatibility with frontend expectation
    const categoryNames = list.map(c => c.name);
    res.json(categoryNames);
  } catch (error) {
    res.status(500).json({ error: 'Server error loading categories.' });
  }
});

// Add New Category (Admin only)
router.post('/', authenticate, authorize(['admin']), async (req, res) => {
  const { category } = req.body;
  if (!category || !category.trim()) {
    return res.status(400).json({ error: 'Category name cannot be empty.' });
  }

  try {
    const cleanCategory = category.trim();
    
    // Case-insensitive duplicate check
    const existing = await Category.findOne({ name: { $regex: new RegExp(`^${cleanCategory}$`, 'i') } });
    if (existing) {
      return res.status(400).json({ error: 'Category tag already exists.' });
    }

    await Category.create({ name: cleanCategory });

    await Activity.create({
      user: req.user.name,
      action: `Created new news category: "${cleanCategory}"`
    });

    const newList = await Category.find({});
    const categoryNames = newList.map(c => c.name);

    res.status(201).json({
      message: 'News category added successfully!',
      categories: categoryNames
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error saving category.' });
  }
});

// Delete Category by Name String (Admin only)
router.delete('/:name', authenticate, authorize(['admin']), async (req, res) => {
  const { name } = req.params;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required for deletion.' });
  }

  try {
    const cleanName = name.trim();
    const target = await Category.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, 'i') } });
    
    if (!target) {
      return res.status(404).json({ error: `Category "${cleanName}" not found.` });
    }

    await Category.deleteOne({ _id: target._id });

    await Activity.create({
      user: req.user.name,
      action: `Deleted news category: "${target.name}"`
    });

    const newList = await Category.find({});
    const categoryNames = newList.map(c => c.name);

    res.json({
      message: `News category "${target.name}" deleted successfully!`,
      categories: categoryNames
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting category.' });
  }
});

// Delete Category by MongoDB ID (Admin only)
router.delete('/id/:id', authenticate, authorize(['admin']), async (req, res) => {
  const { id } = req.params;

  try {
    const target = await Category.findById(id);
    if (!target) {
      return res.status(404).json({ error: 'Category not found.' });
    }

    await Category.deleteOne({ _id: target._id });

    await Activity.create({
      user: req.user.name,
      action: `Deleted news category: "${target.name}"`
    });

    const newList = await Category.find({});
    const categoryNames = newList.map(c => c.name);

    res.json({
      message: `News category "${target.name}" deleted successfully!`,
      categories: categoryNames
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error deleting category by ID.' });
  }
});

export default router;
